const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

// Basic request logger to verify traffic reaches the server
app.use((req, res, next) => {
    console.log(`[HTTP] ${req.method} ${req.url}`);
    next();
});

app.use(express.static("public")); // serve frontend

// Simple health endpoint
app.get("/health", (req, res) => {
    res.type("text").send("ok");
});

// --- Ball state managed on server for sync ---
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;
const BALL_RADIUS = 6;
let cheatKey = null;
let ball = {
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT / 2,
    vx: 0,
    vy: 0,
};

function randomizeBall() {
    const speed = 2 + Math.random() * 1.5; // 2.0 - 3.5
    const dirX = Math.random() < 0.5 ? -1 : 1;
    const angle = (Math.random() * 0.5 - 0.25); // small vertical component
    ball.vx = speed * dirX;
    ball.vy = speed * angle;
    console.log("New ball velocity:", ball.vx, ball.vy);
}

randomizeBall();

function tickBall() {
    ball.x += ball.vx;
    ball.y += ball.vy;

    // bounce top/bottom
    if (ball.y - BALL_RADIUS < 0) {
        ball.y = BALL_RADIUS;
        ball.vy *= -1;
    }
    if (ball.y + BALL_RADIUS > CANVAS_HEIGHT) {
        ball.y = CANVAS_HEIGHT - BALL_RADIUS;
        ball.vy *= -1;
    }

    // paddle collisions (AABB)
    const paddleW = 10;
    const paddleH = 60;
    const leftX = 100;
    const rightX = CANVAS_WIDTH - 100 - paddleW;
    // Determine current paddle Y positions from players map
    let leftY = CANVAS_HEIGHT / 2 - paddleH / 2;
    let rightY = CANVAS_HEIGHT / 2 - paddleH / 2;
    for (const [, info] of players) {
        if (info.role === 'player1' && typeof info.y === 'number') leftY = info.y;
        if (info.role === 'player2' && typeof info.y === 'number') rightY = info.y;
    }
    // Check collision with left paddle if moving left
    if (ball.vx < 0) {
        const nextLeftEdge = ball.x - BALL_RADIUS;
        if (nextLeftEdge <= leftX + paddleW && nextLeftEdge >= leftX - 20) {
            if (ball.y + BALL_RADIUS >= leftY && ball.y - BALL_RADIUS <= leftY + paddleH) {
                // place ball just outside paddle and reflect
                ball.x = leftX + paddleW + BALL_RADIUS;
                ball.vx *= -1;

                ball.vy = (ball.y - (leftY+(paddleH/2)))/15;


            }

            if (cheatKey === "o") {
                // user has activated cheat so ball cants go past paddleX
                ball.vx = Math.abs(ball.vx);
                
            }
        }


      

        
    }
    // Check collision with right paddle if moving right
    if (ball.vx > 0) {
        const nextRightEdge = ball.x + BALL_RADIUS;
        if (nextRightEdge >= rightX && nextRightEdge <= rightX + paddleW + 20) {
            if (ball.y + BALL_RADIUS >= rightY && ball.y - BALL_RADIUS <= rightY + paddleH) {
                ball.x = rightX - BALL_RADIUS;
                ball.vx *= -1;

                ball.vy = (ball.y - (rightY+(paddleH/2)))/15;
            }

            if (cheatKey === "p") {
                // user has activated cheat so ball cants go past paddleX
                ball.vx = -1 * (Math.abs(ball.vx));
                
            }
        }
    }

    // reset if off left/right
    if (ball.x + BALL_RADIUS < 0 || ball.x - BALL_RADIUS > CANVAS_WIDTH) {
        ball.x = CANVAS_WIDTH / 2;
        ball.y = CANVAS_HEIGHT / 2;
        randomizeBall();
    }

    io.emit("ball", ball);
}

setInterval(tickBall, 16); // ~60 FPS

// Track players by join order; first = player1, second = player2
const players = new Map(); // socket.id -> { role: 'player1'|'player2', y?: number }

io.on("connection", (socket) => {
    console.log("hello");
    console.log("A player connected:", socket.id);
  
    // Assign deterministic role based on current occupancy
    const rolesInUse = Array.from(players.values()).map(p => p.role);
    const assignedRole = rolesInUse.includes("player1") ? "player2" : "player1";
    players.set(socket.id, { role: assignedRole });
    socket.emit("role", assignedRole);

    socket.emit("playerNumber", socket.id); // simple ID assign

    // Send current ball state immediately on connect
    socket.emit("ball", ball);

    socket.on("move", (data) => {
        // track player's paddle position
        const p = players.get(socket.id);
        if (p) p.y = data.y;
        io.emit("stateUpdate", data); // broadcast moves
    });


    // Set ball speed via number keys (1-10) — preserve direction
    socket.on("setSpeed", (data) => {
        if (ball.vx < 0) {
            ball.vx = -(Math.abs(data.speed*2));
        } else {
            ball.vx = Math.abs(data.speed*2);
        }
        io.emit("ball", ball);
    });

    socket.on("cheat", (data) => {
        if (data.cheatKey === "o" && cheatKey == "o") {
            cheatKey = null;
            return;
        }
        
        if (data.cheatKey === "p" && cheatKey == "p") {
            cheatKey = null;
            return;
        }

        cheatKey = data.cheatKey;
    });

    socket.on("disconnect", (reason) => {
        console.log("A player disconnected:", socket.id, "reason:", reason);
        players.delete(socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});


process.on("SIGTERM", () => {
    console.log("Force exiting on SIGTERM...");
    process.exit(0);
});
