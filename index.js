import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";

// Router imports
import postRouter from "./routes/post.js";
import commentRouter from "./routes/comment.js";
import accountRouter from "./routes/account.js";

// Configs
dotenv.config();
const app = express();
app.use(express.json());
app.use(cors({ origin: "*" }));

// Server
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("Connected to server");

  socket.on("chat message", (data) => {
    console.log(data);
    io.emit("chat message", data);
  });

  socket.on("disconnect", () => {
    console.log("Disconnected from server");
  });
});

// Routes
app.use("/post", postRouter);
app.use("/comment", commentRouter);
app.use("/account", accountRouter);

app.use((err, res) => {
  console.error("Error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

app.listen(3005, () => console.log("API running on port 3005"));

server.listen(3006, () => console.log("Server running on port 3006"));