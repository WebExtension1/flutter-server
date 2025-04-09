import express from "express";
import pool from "../db.js";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = './uploads/posts';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

router.post("/create", upload.single("image"), async (req, res, next) => {
  try {
    const { email, content, visibility, location } = req.body;

    const sanitisedEmail = email.trim().toLowerCase();
    const imageUrl = req.file ? `/uploads/posts/${req.file.filename}` : null;

    const insertLocation = location ? location : null;

    const [result] = await pool.execute(
    `
      INSERT INTO Posts (content, accountID, visibility, imageUrl, location) VALUES
      (?, (SELECT accountID FROM Accounts WHERE email = ?), ?, ?, ?)
    `, [content, sanitisedEmail, visibility, imageUrl, insertLocation]);

    res.json({ message: "Post created successfully", affectedRows: result.affectedRows });
  }
  catch (error) {
    next(error);
  }
});

router.post("/feed", async (req, res, next) => {
  try {
    const { email } = req.body;

    const sanitisedEmail = email.trim().toLowerCase();

    const [result] = await pool.execute(`
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
      GROUP BY Posts.postID
      ORDER BY postDate DESC
    `, [sanitisedEmail, sanitisedEmail, sanitisedEmail, sanitisedEmail, sanitisedEmail]);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post("/get", async (req, res, next) => {
  try {
    const { email, account } = req.body;

    const sanitisedEmail = email.trim().toLowerCase();

    const [posts] = await pool.execute(`
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
      WHERE ((Posts.visibility = 'public')
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
      ))
      AND Posts.accountID = (SELECT accountID FROM Accounts WHERE email = ?)
      GROUP BY Posts.postID
      ORDER BY postDate DESC
    `, [sanitisedEmail, sanitisedEmail, sanitisedEmail, sanitisedEmail, sanitisedEmail, account]
    );

    const [comments] = await pool.execute(`
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
        COUNT(DISTINCT CommentLikes.commentID) AS likes,
        COUNT(DISTINCT CommentDislikes.commentID) AS dislikes,
        COALESCE(MAX(
            CASE 
                WHEN CommentLikes.accountID = (SELECT accountID FROM Accounts WHERE email = ?) THEN 1
                WHEN CommentDislikes.accountID = (SELECT accountID FROM Accounts WHERE email = ?) THEN 2
                ELSE 0
            END
        ), 0) AS liked
      FROM Comments
      INNER JOIN Accounts ON Comments.accountID = Accounts.accountID
      LEFT JOIN CommentLikes ON Comments.commentID = CommentLikes.commentID
      LEFT JOIN CommentDislikes ON Comments.commentID = CommentDislikes.commentID
      INNER JOIN Posts ON Posts.postID = Comments.postID
      WHERE Comments.accountID = (SELECT accountID FROM Accounts WHERE email = ?)
      AND Comments.postID IN (
        SELECT
          Posts.postID AS postID
        FROM Posts
        INNER JOIN Accounts ON Posts.accountID = Accounts.accountID
        WHERE ((Posts.visibility = 'public')
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
        ))
        GROUP BY Comments.commentID
        ORDER BY sentDate DESC
      );
    `, [sanitisedEmail, sanitisedEmail, account, sanitisedEmail, sanitisedEmail, sanitisedEmail]
    );

    res.json({'posts': posts, 'comments': comments});
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

router.post("/like", async (req, res, next) => {
  try {
    const { email, postID } = req.body;

    const sanitisedEmail = email.trim().toLowerCase();

    let [result] = await pool.execute(`
      DELETE FROM PostLikes WHERE postID = ? AND accountID = (SELECT accountID FROM Accounts WHERE email = ?)
    `, [postID, sanitisedEmail]);

    [result] = await pool.execute(`
      DELETE FROM PostDislikes WHERE postID = ? AND accountID = (SELECT accountID FROM Accounts WHERE email = ?)
    `, [postID, sanitisedEmail]);

    [result] = await pool.execute(`
      INSERT INTO PostLikes (postID, accountID) VALUES (?, (SELECT accountID FROM Accounts WHERE email = ?))
    `, [postID, sanitisedEmail]);
    res.json({ message: "Post liked successfully", affectedRows: result.affectedRows });

  } catch (error) {
    next(error);
  }
});

router.post("/dislike", async (req, res, next) => {
  try {
    const { email, postID } = req.body;

    const sanitisedEmail = email.trim().toLowerCase();

    let [result] = await pool.execute(`
      DELETE FROM PostLikes WHERE postID = ? AND accountID = (SELECT accountID FROM Accounts WHERE email = ?)
    `, [postID, sanitisedEmail]);

    [result] = await pool.execute(`
      DELETE FROM PostDislikes WHERE postID = ? AND accountID = (SELECT accountID FROM Accounts WHERE email = ?)
    `, [postID, sanitisedEmail]);

    [result] = await pool.execute(`
      INSERT INTO PostDislikes (postID, accountID) VALUES (?, (SELECT accountID FROM Accounts WHERE email = ?))
    `, [postID, sanitisedEmail]);
    res.json({ message: "Post disliked successfully", affectedRows: result.affectedRows });

  } catch (error) {
    next(error);
  }
});

router.post("/resetInteraction", async (req, res, next) => {
  try {
    const { email, postID } = req.body;

    const sanitisedEmail = email.trim().toLowerCase();

    let [result] = await pool.execute(`
      DELETE FROM PostLikes WHERE postID = ? AND accountID = (SELECT accountID FROM Accounts WHERE email = ?)
    `, [postID, sanitisedEmail]);

    [result] = await pool.execute(`
      DELETE FROM PostDislikes WHERE postID = ? AND accountID = (SELECT accountID FROM Accounts WHERE email = ?)
    `, [postID, sanitisedEmail]);

    res.json({ message: "Post likes and dislikes reset", affectedRows: result.affectedRows });

  } catch (error) {
    next(error);
  }
});

export default router;