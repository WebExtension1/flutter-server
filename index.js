import express from "express";
import dotenv from "dotenv";
import cors from "cors";

// Router imports
import postRouter from "./routes/post.js";
import commentRouter from "./routes/comment.js";

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors({ origin: "*" }));

// Routes
app.use("/post", postRouter);
app.use("/comment", commentRouter);

app.use((err, res) => {
  console.error("Error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

app.listen(3005, () => console.log("Backend API running on port 3005"));