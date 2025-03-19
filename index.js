import express from "express";
import dotenv from "dotenv";
import cors from "cors";

// Router imports
import postRouter from "./routes/post.js";

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors({ origin: "http://localhost:3000" }));

// Routes
app.use("/post", postRouter);

app.use((err, res) => {
    console.error("Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  });
  
  app.listen(3001, () => console.log("Backend API running on port 3001"));