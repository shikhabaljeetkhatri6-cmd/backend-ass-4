
require("dotenv").config();

const express = require("express");
const http = require("http");
const path = require("path");
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const { connectDB, closeDB } = require("./config/db");

const authRoutes = require("./routes/auth");
const notesRoutes = require("./routes/notes");
const adminRoutes = require("./routes/admin");
const appEvents = require("./events/appEvents");

// Check JWT secret
if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is required. Check your .env file.");
  process.exit(1);
}

// Initialize Express
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server);

// Middleware
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Serve frontend files
app.use(express.static(path.join(__dirname, "../public")));

// Home route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Secure Connect API is running"
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/notes", notesRoutes);
app.use("/api/admin", adminRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    message: "Route not found"
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Server error:", err);

  res.status(500).json({
    message: "Internal server error"
  });
});

// ======================================
// SOCKET.IO JWT AUTHENTICATION
// ======================================

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("Authentication token required"));
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);

    socket.user = payload;

    next();

  } catch (error) {
    next(new Error("Invalid or expired token"));
  }
});

// ======================================
// REAL-TIME CHAT
// ======================================

io.on("connection", (socket) => {

  console.log(
    `User connected: ${socket.user.email} (${socket.id})`
  );

  // Join chat room
  socket.on("joinRoom", (roomName = "general") => {

    const room =
      String(roomName).trim().slice(0, 40) || "general";

    socket.join(room);

    console.log(
      `${socket.user.email} joined room ${room}`
    );

    socket.emit(
      "systemMessage",
      `You joined room: ${room}`
    );

  });

  // Send and receive messages
  socket.on("chatMessage", (data = {}) => {

    const room =
      String(data.room || "general").trim().slice(0, 40) || "general";

    const message =
      String(data.message || "").trim().slice(0, 1000);

    if (!message) return;

    const chatMessage = {

      username: String(socket.user.email).split("@")[0],

      message: message,

      room: room,

      sentAt: new Date().toISOString()

    };

    // Show message in terminal
    console.log(
      `[${room}] ${chatMessage.username}: ${message}`
    );

    // Emit EventEmitter event
    appEvents.emit("chat:message", chatMessage);

    // Broadcast message to room members
    io.to(room).emit("chatMessage", chatMessage);

  });

  // Disconnect event
  socket.on("disconnect", (reason) => {

    console.log(
      `User disconnected: ${socket.user.email} (${reason})`
    );

  });

});

// ======================================
// START SERVER
// ======================================

const PORT = Number(process.env.PORT) || 5000;

connectDB()

  .then(() => {

    server.listen(PORT, () => {

      console.log(
        `Server listening on http://localhost:${PORT}`
      );

      console.log("Socket.IO real-time chat is ready");

    });

  })

  .catch((error) => {

    console.error(
      "Failed to connect to MongoDB:",
      error.message
    );

    process.exit(1);

  });

// ======================================
// GRACEFUL SHUTDOWN
// ======================================

async function shutdown() {

  console.log("Shutting down server...");

  server.close();

  await closeDB();

  process.exit(0);

}

process.on("SIGINT", shutdown);

process.on("SIGTERM", shutdown);
