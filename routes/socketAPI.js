const Server = require("../models/server");
const Chat = require("../models/chat");
const Room = require("../models/room");

module.exports = function (io) {
  io.on("connection", async function (socket) {
    // fetch rooms
    socket.emit("rooms", await Room.find().populate("members"));

    // logins
    socket.on("login", async (name, res) => {
      const user = await Server.login(name, socket.id);
      return res(user);
    });
    // join room
    socket.on("joinRoom", async (roomID, res) => {
      try {
        // check user
        const user = await Server.checkUser(socket.id);

        // join room (DB)
        const room = await user.joinRoom(roomID);

        // subscribe user to the room
        socket.join(room._id);

        // send notification message;
        socket.to(room._id).broadcast.emit("message", {
          user: {
            name: "System",
          },
          type: "string",
          chat: `Welcome ${user.user.name} to room ${room.room}`,
        });

        const chatHistory = await Chat.find({ room: room._id })
          .populate("user")
          .sort("-createdAt")
          .limit(20);
        chatHistory.unshift({
          user: {
            name: "System",
          },
          type: "string",
          chat: `You have joined room: ${room.room}.`,
        });
        console.log(room._id);
        socket.emit("chatHistory", chatHistory.reverse());
        const rooms = await Room.find().populate("members");
        console.log(rooms);
        io.emit("rooms", rooms);

        // return room info to client
        return res({ status: "ok", data: { room: room } });
      } catch (err) {
        console.log(err);
        return res({ status: "error", message: err.message });
      }
    });

    // chat
    socket.on("sendMessage", async function (message) {
      const user = await Server.checkUser(socket.id);
      const chat = await user.chat(message);
      console.log(user.user.room);
      io.to(user.user.room._id).emit("message", chat);
    });

    // leave room
    socket.on("leaveRoom", async function (roomID) {
      socket.leave(roomID);
    });

    // socket.on("disconnect", function () {
    //   io.emit("message", { user: "system", message: "someone left" });
    // });

    socket.on("disconnect", async function () {
      const user = await Server.checkUser(socket.id);
      socket.to(user.user.room._id).broadcast.emit("message", {
        user: {
          name: "system",
        },
        chat: `${user.user.name} left`,
      });
      user.user.room = null;
      await user.user.save();
      socket.leave(user.user.room);
      const rooms = await Room.find().populate("members");
      io.emit("rooms", rooms);
    });

    socket.on("vote", function (option) {
      // console.log(option);
      io.emit("getVote", option);
    });
  });
};
