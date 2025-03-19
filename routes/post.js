import express from "express";
import pool from "../db.js";

const router = express.Router();

// Create folder
router.post("/create", async (req, res, next) => {
  try {
      const { email, data } = req.body;
  
      const [result] = await pool.execute(
        `
        INSERT INTO posts (user_id, data) VALUES
       ((SELECT user_id FROM users WHERE email = ?), ?)
        `, [email, data]
      );
      res.json({ message: "Post created successfully", affectedRows: result.affectedRows });
    }
  catch (error) {
      next(error);
  }
});

export default router;