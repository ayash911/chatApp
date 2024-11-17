const { Server } = require("socket.io");

module.exports = (req, res) => {
  if (req.method === "POST") {
    const io = new Server(res.socket, { path: "/socket.io" });

    io.on("connection", (socket) => {
      console.log("A user connected");
      socket.on("disconnect", () => {
        console.log("A user disconnected");
      });
    });

    res.status(200).send("Socket server running");
  }
};
