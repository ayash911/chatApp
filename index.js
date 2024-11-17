const socketio = require("socket.io");
const express = require("express");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const crypto = require("crypto");
const https = require("https");
const fs = require("fs");

const app = express();
const server = https.createServer(
  {
    key: fs.readFileSync("server-key.pem"),
    cert: fs.readFileSync("server-cert.pem"),
  },
  app
);

const io = socketio(server, {
  cors: {
    origin: ["https://127.0.0.1:5500"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const users = {};
const JWT_SECRET_KEY = "your_secret_key";
const AES_SECRET_KEY = "your_aes_secret_key";
const AES_IV = crypto.randomBytes(16);

// Encryption Function
function encryptData(data) {
  const cipher = crypto.createCipheriv("aes-256-cbc", AES_SECRET_KEY, AES_IV);
  let encrypted = cipher.update(JSON.stringify(data), "utf-8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
}

function decryptData(encryptedData) {
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    AES_SECRET_KEY,
    AES_IV
  );
  let decrypted = decipher.update(encryptedData, "hex", "utf-8");
  decrypted += decipher.final("utf-8");
  return decrypted;
}

const rateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 5,
  message: "Too many requests, please try again later.",
});

app.use(rateLimiter);

io.on("connection", (socket) => {
  socket.on("new-user-joined", (name) => {
    const loginTime = new Date().toLocaleString();
    const ipAddress = socket.handshake.address;
    users[socket.id] = { name, ipAddress, loginTime };
    socket.broadcast.emit("user-joined", { name, loginTime });
    io.emit("update-user-list", users);
  });

  socket.on("send", (message) => {
    const encryptedMessage = encryptData(message);
    socket.broadcast.emit("receive", {
      message: encryptedMessage,
      name: users[socket.id].name,
    });
  });

  socket.on("group-name-changed", (newGroupName) => {
    io.emit("group-name-updated", newGroupName);
  });

  socket.on("group-photo-changed", (newPhoto) => {
    io.emit("group-photo-updated", newPhoto);
  });

  socket.on("logout", () => {
    handleUserDisconnect(socket);
  });

  socket.on("disconnect", () => {
    handleUserDisconnect(socket);
  });

  function handleUserDisconnect(socket) {
    const { name } = users[socket.id] || {};
    if (name) {
      const logoutTime = new Date().toLocaleString();
      delete users[socket.id];
      socket.broadcast.emit("user-left", { name, logoutTime });
      io.emit("update-user-list", users);
    }
  }
});

server.listen(8000, () => {
  console.log("Server is running on https://127.0.0.1:8000");
});
