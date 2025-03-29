import express from "express";
import pool from "../db.js";

const router = express.Router();

// Create folder
router.post("/create", async (req, res, next) => {
  try {
    const { email, content } = req.body;

    const [result] = await pool.execute(
    `
      INSERT INTO Posts (content, accountID) VALUES
      (?, (SELECT accountID FROM Accounts WHERE email = ?))
    `, [content, email]
    );
    res.json({ message: "Post created successfully", affectedRows: result.affectedRows });
  }
  catch (error) {
    next(error);
  }
});

router.post("/get", async (req, res, next) => {
  try {
    const { email } = req.body;

    const [result] = await pool.execute(
    `
      SELECT *
      FROM Posts
      INNER JOIN Accounts ON Posts.accountID = Accounts.accountID
      ORDER BY postDate DESC
    `);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;