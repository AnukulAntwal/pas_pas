import Chat from "./models/Chat.js";

const initSocket = (io) => {
  io.on("connection", (socket) => {
    console.log("New socket connected:", socket.id);

    // 🏷 Join room based on ride_id/package_id
    socket.on("joinRoom", ({ ride_id, package_id }) => {
      const room = ride_id || package_id;
      if (room) {
        socket.join(room);
        console.log(`Socket ${socket.id} joined room: ${room}`);
      }
    });

    // 📨 Send message via socket
    socket.on("sendMessage", async (data) => {
      try {
        const newChat = new Chat(data);
        const savedMessage = await newChat.save();

        // Emit message to all in same room
        const room = data.ride_id || data.package_id;
        io.to(room).emit("receiveMessage", savedMessage);
      } catch (error) {
        console.error("Socket sendMessage error:", error);
      }
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
    });
  });
};

export default initSocket;
