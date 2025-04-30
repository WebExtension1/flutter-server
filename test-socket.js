import io from "socket.io-client";

const socket = io("http://93.96.113.187:3008");

socket.on("connect", () => {
  console.log("Connected to socket server");

  socket.emit("chat message", {
    message: "Test message",
    sender: "robertjenner5@outlook.com",
    recipient: "robertjenner5@me.com"
  });

  console.log("Message sent.");
  socket.disconnect();
});
