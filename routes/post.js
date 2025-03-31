import express from "express";
import pool from "../db.js";

const router = express.Router();

// Create folder
router.post("/create", async (req, res, next) => {
  try {
    const { email, content, visibility } = req.body;

    const [result] = await pool.execute(
    `
      INSERT INTO Posts (content, accountID, visibility) VALUES
      (?, (SELECT accountID FROM Accounts WHERE email = ?), ?)
    `, [content, email, visibility]);

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
      WHERE (Posts.visibility = 'public')
      OR (Posts.accountID = (SELECT accountID FROM Accounts WHERE email = ?))
      OR (
        Posts.visibility = 'friends' 
        AND EXISTS (
          SELECT 1 FROM Friends 
          WHERE 
            (Friends.accountID1 = (SELECT accountID FROM Accounts WHERE email = ?) AND Friends.accountID2 = Posts.accountID)
            OR 
            (Friends.accountID2 = (SELECT accountID FROM Accounts WHERE email = ?) AND Friends.accountID1 = Posts.accountID)
        )
      )
      ORDER BY postDate DESC
    `, [email, email, email]);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post("/delete", async (req, res, next) => {
  try {
    const { postID } = req.body;

    // This should be reworked into moving comments to a default deleated post, but this is the solution for now.
    let [result] = await pool.execute(
      `DELETE FROM Comments WHERE postID = ?
    `, [postID]);

    [result] = await pool.execute(
      `DELETE FROM Posts WHERE postID = ?
    `, [postID]);

    res.json({ message: "Post deleted successfully", affectedRows: result.affectedRows });
  } catch (error) {
    next(error);
  }
});

export default router;