import express from "express";
import pool from "../db.js";

const router = express.Router();

router.post("/create", async (req, res, next) => {
  try {
    const { email, content, postID } = req.body;

    const sanitisedEmail = email.trim().toLowerCase();

    const [result] = await pool.execute(
    `
      INSERT INTO Comments (content, accountID, postID) VALUES
      (?, (SELECT accountID FROM Accounts WHERE email = ?), ?)
    `, [content, sanitisedEmail, postID]
    );
    res.json({ message: "Comment created successfully", affectedRows: result.affectedRows });
  }
  catch (error) {
    next(error);
  }
});

router.post("/get", async (req, res, next) => {
  try {
    const { postID, email } = req.body;

    const sanitisedEmail = email.trim().toLowerCase();

    const [result] = await pool.execute(`
      SELECT
        Comments.commentID,
        Comments.content AS commentContent,
        Comments.sentDate as sentDate,
        Accounts.accountID AS accountID,
        Accounts.email AS email,
        Accounts.phoneNumber AS phoneNumber,
        Accounts.username AS username,
        Accounts.fname AS fname,
        Accounts.lname AS lname,
        Accounts.dateJoined AS dateJoined,
        Accounts.imageUrl AS accountImageUrl,
        COUNT(DISTINCT CommentLikes.commentID) AS likes,
        COUNT(DISTINCT CommentDislikes.commentID) AS dislikes,
        COALESCE(MAX(
            CASE 
                WHEN CommentLikes.accountID = (SELECT accountID FROM Accounts WHERE email = ?) THEN 1
                WHEN CommentDislikes.accountID = (SELECT accountID FROM Accounts WHERE email = ?) THEN 2
                ELSE 0
            END
        ), 0) AS liked,
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM Friends 
            WHERE 
            (Friends.accountID1 = Comments.accountID AND Friends.accountID2 = (SELECT accountID FROM Accounts WHERE email = ?))
            OR 
            (Friends.accountID2 = Comments.accountID AND Friends.accountID1 = (SELECT accountID FROM Accounts WHERE email = ?))
          ) THEN 'friend'
          WHEN EXISTS (
            SELECT 1 FROM FriendRequest 
            WHERE senderID = (SELECT accountID FROM Accounts WHERE email = ?)
            AND receiverID = Comments.accountID
          ) THEN 'outgoing'
          WHEN EXISTS (
            SELECT 1 FROM FriendRequest 
            WHERE receiverID = (SELECT accountID FROM Accounts WHERE email = ?)
            AND senderID = Comments.accountID
          ) THEN 'incoming'
          ELSE 'other'
        END AS relationship
      FROM Comments
      INNER JOIN Accounts ON Accounts.accountID = Comments.accountID
      LEFT JOIN CommentLikes ON Comments.commentID = CommentLikes.commentID
      LEFT JOIN CommentDislikes ON Comments.commentID = CommentDislikes.commentID
      WHERE Comments.postID = ?
      GROUP BY Comments.commentID
      ORDER BY sentDate DESC
    `, [sanitisedEmail, sanitisedEmail, sanitisedEmail, sanitisedEmail, sanitisedEmail, sanitisedEmail, postID]
    );
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post("/like", async (req, res, next) => {
  try {
    const { email, commentID } = req.body;

    const sanitisedEmail = email.trim().toLowerCase();

    let [result] = await pool.execute(`
      DELETE FROM CommentLikes WHERE commentID = ? AND accountID = (SELECT accountID FROM Accounts WHERE email = ?)
    `, [commentID, sanitisedEmail]);

    [result] = await pool.execute(`
      DELETE FROM CommentDislikes WHERE commentID = ? AND accountID = (SELECT accountID FROM Accounts WHERE email = ?)
    `, [commentID, sanitisedEmail]);

    [result] = await pool.execute(`
      INSERT INTO CommentLikes (commentID, accountID) VALUES (?, (SELECT accountID FROM Accounts WHERE email = ?))
    `, [commentID, sanitisedEmail]);
    res.json({ message: "Comment liked successfully", affectedRows: result.affectedRows });

  } catch (error) {
    next(error);
  }
});

router.post("/dislike", async (req, res, next) => {
  try {
    const { email, commentID } = req.body;

    const sanitisedEmail = email.trim().toLowerCase();

    let [result] = await pool.execute(`
      DELETE FROM CommentLikes WHERE commentID = ? AND accountID = (SELECT accountID FROM Accounts WHERE email = ?)
    `, [commentID, sanitisedEmail]);

    [result] = await pool.execute(`
      DELETE FROM CommentDislikes WHERE commentID = ? AND accountID = (SELECT accountID FROM Accounts WHERE email = ?)
    `, [commentID, sanitisedEmail]);

    [result] = await pool.execute(`
      INSERT INTO CommentDislikes (commentID, accountID) VALUES (?, (SELECT accountID FROM Accounts WHERE email = ?))
    `, [commentID, sanitisedEmail]);
    res.json({ message: "Comment disliked successfully", affectedRows: result.affectedRows });

  } catch (error) {
    next(error);
  }
});

router.post("/resetInteraction", async (req, res, next) => {
  try {
    const { email, commentID } = req.body;

    const sanitisedEmail = email.trim().toLowerCase();

    let [result] = await pool.execute(`
      DELETE FROM CommentLikes WHERE commentID = ? AND accountID = (SELECT accountID FROM Accounts WHERE email = ?)
    `, [commentID, sanitisedEmail]);

    [result] = await pool.execute(`
      DELETE FROM CommentDislikes WHERE commentID = ? AND accountID = (SELECT accountID FROM Accounts WHERE email = ?)
    `, [commentID, sanitisedEmail]);

    res.json({ message: "Comment likes and dislikes reset", affectedRows: result.affectedRows });

  } catch (error) {
    next(error);
  }
});

export default router;