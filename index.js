import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import pool from "./db.js";

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

  socket.on("search", async (data) => {
    try {
      const { email, query } = data;

      const sanitisedEmail = email.trim().toLowerCase();
  
      let result = await fetch(`http://localhost:3005/post/feed`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: sanitisedEmail }),
      });

      const posts = await result.json();
      const mappedPosts = posts.map((post) => post.postID).join(", ");
  
      [result] = await pool.execute(
        `
        SELECT
          Posts.postID AS postID,
          Posts.content AS content,
          Posts.postDate AS postDate,
          Posts.visibility AS visibility,
          Accounts.accountID AS accountID,
          Accounts.email AS email,
          Accounts.phoneNumber AS phoneNumber,
          Accounts.username AS username,
          Accounts.fname AS fname,
          Accounts.lname AS lname,
          Accounts.dateJoined AS dateJoined,
          COUNT(DISTINCT PostLikes.postID) AS likes,
          COUNT(DISTINCT PostDislikes.postID) AS dislikes,
          COUNT(DISTINCT Comments.commentID) AS commentCount,
          COALESCE(MAX(
            CASE 
                WHEN PostLikes.accountID = (SELECT accountID FROM Accounts WHERE email = ?) THEN 1
                WHEN PostDislikes.accountID = (SELECT accountID FROM Accounts WHERE email = ?) THEN 2
                ELSE 0
            END
          ), 0) AS liked
          FROM Posts
          INNER JOIN Accounts ON Posts.accountID = Accounts.accountID
          LEFT JOIN PostLikes ON Posts.postID = PostLikes.postID
          LEFT JOIN PostDislikes ON Posts.postID = PostDislikes.postID
          LEFT JOIN Comments ON Posts.postID = Comments.postID
          WHERE Posts.content LIKE ?
          AND Posts.postID IN (${mappedPosts})
        `, [sanitisedEmail, sanitisedEmail, `%${query}%`]
      );
  
      io.emit("search", result);
    } catch (error) {
      console.error("Search error:", error);
      socket.emit("search_error", { message: "An error occurred while searching." });
    }
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