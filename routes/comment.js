import express from "express";
import pool from "../db.js";

const router = express.Router();

// Create folder
router.post("/create", async (req, res, next) => {
  try {
    const { email, content, postID } = req.body;

    const [result] = await pool.execute(
    `
      INSERT INTO Comments (content, accountID, postID) VALUES
      (?, (SELECT accountID FROM Accounts WHERE email = ?), ?)
    `, [content, email, postID]
    );
    res.json({ message: "Comment created successfully", affectedRows: result.affectedRows });
  }
  catch (error) {
    next(error);
  }
});

router.post("/get", async (req, res, next) => {
  try {
    const { postID } = req.body;

    const [result] = await pool.execute(
    `
      SELECT *, Comments.content AS commentContent
      FROM Comments
      INNER JOIN Accounts ON Accounts.accountID = Comments.accountID
      INNER JOIN Posts ON Posts.postID = Comments.postID
      WHERE Comments.postID = ?
      ORDER BY sentDate DESC
    `, [postID]);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post("/like", async (req, res, next) => {
  try {
    const { email, commentID } = req.body;

    let [result] = await pool.execute(`
      DELETE FROM CommentLikes WHERE commentID = ? AND accountID = (SELECT accountID FROM Accounts WHERE email = ?)
    `, [commentID, email]);

    [result] = await pool.execute(`
      DELETE FROM CommentDislikes WHERE commentID = ? AND accountID = (SELECT accountID FROM Accounts WHERE email = ?)
    `, [commentID, email]);

    [result] = await pool.execute(`
      INSERT INTO CommentLikes (commentID, accountID) VALUES (?, (SELECT accountID FROM Accounts WHERE email = ?))
    `, [commentID, email]);
    res.json({ message: "Comment liked successfully", affectedRows: result.affectedRows });

  } catch (error) {
    next(error);
  }
});

router.post("/dislike", async (req, res, next) => {
  try {
    const { email, commentID } = req.body;

    let [result] = await pool.execute(`
      DELETE FROM CommentLikes WHERE commentID = ? AND accountID = (SELECT accountID FROM Accounts WHERE email = ?)
    `, [commentID, email]);

    [result] = await pool.execute(`
      DELETE FROM CommentDislikes WHERE commentID = ? AND accountID = (SELECT accountID FROM Accounts WHERE email = ?)
    `, [commentID, email]);

    [result] = await pool.execute(`
      INSERT INTO CommentDislikes (commentID, accountID) VALUES (?, (SELECT accountID FROM Accounts WHERE email = ?))
    `, [commentID, email]);
    res.json({ message: "Comment disliked successfully", affectedRows: result.affectedRows });

  } catch (error) {
    next(error);
  }
});

export default router;