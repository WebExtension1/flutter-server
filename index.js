import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import pool from "./db.js";
import path from "path";
import admin from "./firebase.js";

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
  
  socket.on("open message", async (data) => {
    try {
      const { sender, recipient } = data;
  
      const sanitisedSender = sender.trim().toLowerCase();
      const sanitisedRecipient = recipient.trim().toLowerCase();
  
      const [result] = await pool.execute(`
        SELECT
          Messages.messageID as messageID,
          Messages.content AS content,
          Messages.sentDate AS sentDate,
          sender.email AS senderEmail,
          receiver.email AS receiverEmail
        FROM Messages
        INNER JOIN Accounts AS sender ON Messages.senderID = sender.accountID
        INNER JOIN Accounts AS receiver ON Messages.receiverID = receiver.accountID
        WHERE (sender.accountID = (SELECT accountID FROM Accounts WHERE email = ?) AND receiver.accountID = (SELECT accountID FROM Accounts WHERE email = ?))
        OR (sender.accountID = (SELECT accountID FROM Accounts WHERE email = ?) AND receiver.accountID = (SELECT accountID FROM Accounts WHERE email = ?))
        ORDER BY Messages.sentDate ASC
      `, [sanitisedSender, sanitisedRecipient, sanitisedRecipient, sanitisedSender]
    );
  
      io.emit("open message", result);
    } catch (error) {
      console.error("Message error:", error);
      socket.emit("message_error", { message: "An error occurred while fetching message history." });
    }
  });

  socket.on("chat message", async (data) => {
    try {
      const { message, sender, recipient } = data;

      const sanitisedSender = sender.trim().toLowerCase();
      const sanitisedRecipient = recipient.trim().toLowerCase();

      const [result] = await pool.execute(`
        INSERT INTO Messages (content, senderID, receiverID) VALUES
        (?, (SELECT accountID FROM Accounts WHERE email = ?), (SELECT accountID FROM Accounts WHERE email = ?))
      `, [message, sanitisedSender, sanitisedRecipient]
      );

      const messageID = result.insertId;
      const [messageData] = await pool.execute(`
        SELECT
          Messages.messageID,
          Messages.content,
          Messages.sentDate,
          sender.email AS senderEmail,
          sender.username AS senderUsername,
          receiver.email AS receiverEmail
        FROM Messages
        INNER JOIN Accounts AS sender ON Messages.senderID = sender.accountID
        INNER JOIN Accounts AS receiver ON Messages.receiverID = receiver.accountID
        WHERE messageID = ?
      `, [messageID]
      );

      io.emit("chat message", messageData);

      const [FCMToken] = await pool.execute(`
        SELECT FCMToken FROM Accounts WHERE email = ?
      `, [sanitisedRecipient]
      );
      const token = FCMToken[0].FCMToken;

      if (token) {
        const payload = {
          token: token,
          notification: {
            title: `New message from ${messageData[0].senderUsername}`,
            body: message,
          },
          data: {
            type: "chat",
            sender,
            receiver: recipient,
          },
        };
    
        try {
          await admin.messaging().send(payload);
        } catch (err) {
          console.error("Failed to send notification:", err);
        }
      }
    } catch (error) {
      console.error("Message error:", error);
      socket.emit("message_error", { message: "An error occurred while sending the message." });
    }
  });

  socket.on("search", async (data) => {
    try {
      const { email, query } = data;

      const sanitisedEmail = email.trim().toLowerCase();

      const [searchedAccounts] = await pool.execute(`
        SELECT *
        FROM Accounts
        WHERE LOWER(username) LIKE LOWER(?)
        OR LOWER(fname) LIKE LOWER(?)
        OR LOWER(lname) LIKE LOWER(?)
        GROUP BY Accounts.accountID
        `, [`%${query}%`, `%${query}%`, `%${query}%`]
      );
  
      const posts = await fetch(`http://localhost:${process.env.BACKEND_PORT}/post/feed`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: sanitisedEmail }),
      });

      const visiblePosts = await posts.json();
      const postIDs = visiblePosts.map((post) => post.postID);
      const placeholders = postIDs.map(() => '?').join(', ');
  
      const [searchedPosts] = await pool.execute(`
        SELECT
          Posts.postID AS postID,
          Posts.content AS content,
          Posts.postDate AS postDate,
          Posts.visibility AS visibility,
          Posts.imageUrl AS imageUrl,
          Posts.location AS location,
          Accounts.accountID AS accountID,
          Accounts.email AS email,
          Accounts.phoneNumber AS phoneNumber,
          Accounts.username AS username,
          Accounts.fname AS fname,
          Accounts.lname AS lname,
          Accounts.dateJoined AS dateJoined,
          Accounts.imageUrl AS accountImageUrl,
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
          WHERE LOWER(Posts.content) LIKE LOWER(?)
          AND Posts.postID IN (${placeholders})
          GROUP BY Posts.postID
        `, [sanitisedEmail, sanitisedEmail, `%${query}%`, ...postIDs]
      );
  
      io.emit("search", {'accounts': searchedAccounts, 'posts': searchedPosts});
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
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use((err, res) => {
  console.error("Error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

app.listen(process.env.BACKEND_PORT, () => console.log(`API running on port ${process.env.BACKEND_PORT}`));

server.listen(process.env.SERVER_PORT, () => console.log(`Server running on port ${process.env.SERVER_PORT}`));