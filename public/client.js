console.log("client.js loaded");
// Configure canvas size via variables
const CANVAS_WIDTH = 800; // change to any value you want
const CANVAS_HEIGHT = 500; // change to any value you want
const socket = io({
    transports: ["websocket", "polling"],
});

socket.on("connect", () => {
    console.log("Connected to server as", socket.id);
});

socket.on("connect_error", (err) => {
    console.error("Socket connect error:", err.message);
    console.error("Details:", err);
});

socket.on("disconnect", (reason) => {
    console.warn("Disconnected:", reason);
});

let playerId;
let playerY = 200;
let otherPlayerY = 200;
let holdingUp = false;
let holdingDown = false;
let role = null;
const MOVE_SPEED = 4; // pixels per frame

// Ball state (received from server)
const BALL_RADIUS = 6;
let ballX = CANVAS_WIDTH / 2;
let ballY = CANVAS_HEIGHT / 2;

socket.on("playerNumber", (id) => {
    playerId = id;
    console.log("I am:", playerId);
});

// Show assigned role from server (player1 or player2)
socket.on("role", (assignedRole) => {
    console.log("Assigned role:", assignedRole);
    role = assignedRole; // store in local variable, not this
});

document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp") {
        holdingUp = true;
        e.preventDefault();
    }
    if (e.key === "ArrowDown") {
        holdingDown = true;
        e.preventDefault();
    }
    // Number keys 1-9 set speed; 0 sets 10
    if (/^[0-9]$/.test(e.key)) {
        const speed = e.key === "0" ? 10 : Number(e.key);
        socket.emit("setSpeed", { speed });
    }
});

document.addEventListener("keyup", (e) => {
    if (e.key === "ArrowUp") {
        holdingUp = false;
        e.preventDefault();
    }
    if (e.key === "ArrowDown") {
        holdingDown = false;
        e.preventDefault();
    }
});

function update() {
    // apply continuous movement while key is held
    if (holdingUp) playerY -= MOVE_SPEED;
    if (holdingDown) playerY += MOVE_SPEED;

    // clamp within canvas bounds
    const maxY = CANVAS_HEIGHT - 60; // sprite height
    if (playerY < 0) playerY = 0;
    if (playerY > maxY) playerY = maxY;

    // notify server about current position
    socket.emit("move", { id: playerId, y: playerY });

    // Ball position now driven by server updates

    draw();
    requestAnimationFrame(update);
}

socket.on("stateUpdate", (data) => {
    if (data.id !== playerId) {
        otherPlayerY = data.y;
    }
    draw();
});



function draw() {
    const canvas = document.getElementById("game");
    // Ensure canvas size matches configured variables
    if (canvas.width !== CANVAS_WIDTH) canvas.width = CANVAS_WIDTH;
    if (canvas.height !== CANVAS_HEIGHT) canvas.height = CANVAS_HEIGHT;
    const ctx = canvas.getContext("2d");
    // Background
    ctx.fillStyle = "#808080"; // gray background
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    
    if (role === "player2") {
        
        // Your character
        ctx.fillStyle = "blue";
        ctx.fillRect(canvas.width-100-10, playerY, 10, 60);
        // Opponent character
        ctx.fillStyle = "red";
        ctx.fillRect(100, otherPlayerY, 10, 60);
    } else {
        // Your character
        ctx.fillStyle = "red";
        ctx.fillRect(100, playerY, 10, 60);
        // Opponent character
        ctx.fillStyle = "blue";
        ctx.fillRect(canvas.width-100-10, otherPlayerY, 10, 60);
    }

    // Draw ball
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(ballX, ballY, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fill();
}

// Receive ball updates from server
socket.on("ball", (b) => {
    ballX = b.x;
    ballY = b.y;
});

// start the client update loop after socket connects
socket.on("connect", () => {
    requestAnimationFrame(update);
});
