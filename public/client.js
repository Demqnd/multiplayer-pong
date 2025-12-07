console.log("client.js loaded");
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

socket.on("playerNumber", (id) => {
    playerId = id;
    console.log("I am:", playerId);
});

document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp") {
        playerY -= 10;
    }
    if (e.key === "ArrowDown") {
        playerY += 10;
    }
    socket.emit("move", { id: playerId, y: playerY });
});

socket.on("stateUpdate", (data) => {
    if (data.id !== playerId) {
        otherPlayerY = data.y;
    }
    draw();
});

function draw() {
    const canvas = document.getElementById("game");
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Your character
    ctx.fillStyle = "red";
    ctx.fillRect(100, playerY, 20, 20);

    // Opponent character
    ctx.fillStyle = "blue";
    ctx.fillRect(400, otherPlayerY, 20, 20);
}
