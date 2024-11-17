const io = require("socket.io")(8000, {
  cors: {
    origin: ["http://localhost:5500", "http://127.0.0.1:5500"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const users = {};

io.on("connection", (socket) => {
  socket.on("new-user-joined", (name) => {
    const loginTime = new Date().toLocaleString();
    const ipAddress = socket.handshake.address;
    users[socket.id] = { name, ipAddress, loginTime };
    socket.broadcast.emit("user-joined", { name, loginTime });
    io.emit("update-user-list", users);
  });

  socket.on("send", (message) => {
    socket.broadcast.emit("receive", { message, name: users[socket.id].name });
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
