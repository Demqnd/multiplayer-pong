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

io.on("connection", (socket) => {
    console.log("hello");
    console.log("A player connected:", socket.id);
  
    socket.emit("playerNumber", socket.id); // simple ID assign

    socket.on("move", (data) => {
        io.emit("stateUpdate", data); // broadcast moves
    });

    socket.on("disconnect", (reason) => {
        console.log("A player disconnected:", socket.id, "reason:", reason);
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
