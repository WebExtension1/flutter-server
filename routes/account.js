import express from "express";
import pool from "../db.js";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = './uploads/profilePictures';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

router.post("/exists", async (req, res, next) => {
    try {
        const { email, username } = req.body;

        const sanitisedEmail = email.trim().toLowerCase();

        const [result] = await pool.execute(`
            SELECT * FROM Accounts WHERE email = ? OR username = ?
        `, [sanitisedEmail, username.toLowerCase()]
        );

        if (result.length > 0) {
            return res.status(400).json({ message: "Email or username already exists" });
        }
        return res.status(200).json({ message: "Email or username is available" });
    }
    catch (error) {
        next(error);
    }
});

router.post("/create", async (req, res, next) => {
    try {
        const { email, phoneNumber, username, fname, lname } = req.body;

        const sanitisedEmail = email.trim().toLowerCase();

        const [result] = await pool.execute(`
            INSERT INTO Accounts (email, phoneNumber, username, fname, lname) VALUES
            (?, ?, ?, ?, ?)
        `, [sanitisedEmail, phoneNumber, username.toLowerCase(), fname, lname]
        );

        if (result.affectedRows === 0) {
            return res.status(400).json({ message: "Failed to create account" });
        }
        res.status(200).json({ message: "Account created successfully", affectedRows: result.affectedRows });
    }
    catch (error) {
        next(error);
    }
});

router.post("/details", async (req, res, next) => {
    try {
        const { email } = req.body;

        const sanitisedEmail = email.trim().toLowerCase();
        
        const [result] = await pool.execute(`
            SELECT *,
            CASE 
                WHEN EXISTS (
                    SELECT 1 FROM Friends 
                    WHERE 
                    (Friends.accountID1 = accountID AND Friends.accountID2 = (SELECT accountID FROM Accounts WHERE email = ?))
                    OR 
                    (Friends.accountID2 = accountID AND Friends.accountID1 = (SELECT accountID FROM Accounts WHERE email = ?))
                ) THEN 'friend'
                WHEN EXISTS (
                    SELECT 1 FROM FriendRequest 
                    WHERE senderID = (SELECT accountID FROM Accounts WHERE email = ?)
                    AND receiverID = accountID
                ) THEN 'outgoing'
                WHEN EXISTS (
                    SELECT 1 FROM FriendRequest 
                    WHERE receiverID = (SELECT accountID FROM Accounts WHERE email = ?)
                    AND senderID = accountID
                ) THEN 'incoming'
                ELSE 'other'
                END AS relationship
            FROM Accounts
            WHERE email = ?
        `, [sanitisedEmail, sanitisedEmail, sanitisedEmail, sanitisedEmail, sanitisedEmail]
        );

        if (result.affectedRows === 0) {
            return res.status(400).json({ message: "No account found" });
        }
        res.status(200).json(result[0]);
    }
    catch (error) {
        next(error);
    }
});

router.post("/updateEmail", async (req, res, next) => {
    try {
        const { oldEmail, newEmail } = req.body;

        const sanitisedOldEmail = oldEmail.trim().toLowerCase();
        const sanitisedNewEmail = newEmail.trim().toLowerCase();

        const [result] = await pool.execute(`
            UPDATE Accounts SET email = ? WHERE email = ?
        `, [sanitisedNewEmail, sanitisedOldEmail]
        );

        if (result.affectedRows === 0) {
            return res.status(400).json({ message: "Account not updated" });
        }
        res.status(200).json(result[0]);
    }
    catch (error) {
        next(error);
    }
});

router.post("/updatePhoneNumber", async (req, res, next) => {
    try {
        const { phoneNumber, email } = req.body;

        const sanitisedEmail = email.trim().toLowerCase();

        const [result] = await pool.execute(`
            UPDATE Accounts SET phoneNumber = ? WHERE email = ?
        `, [phoneNumber, sanitisedEmail]
        );

        if (result.affectedRows === 0) {
            return res.status(400).json({ message: "Account not updated" });
        }
        res.status(200).json(result[0]);
    }
    catch (error) {
        next(error);
    }
});

router.post("/updateUsername", async (req, res, next) => {
    try {
        const { username, email } = req.body;

        const sanitisedEmail = email.trim().toLowerCase();

        const [result] = await pool.execute(`
            UPDATE Accounts SET username = ? WHERE email = ?
        `, [username, sanitisedEmail]
        );

        if (result.affectedRows === 0) {
            return res.status(400).json({ message: "Account not updated" });
        }
        res.status(200).json(result[0]);
    }
    catch (error) {
        next(error);
    }
});

router.post("/updateName", async (req, res, next) => {
    try {
        const { fname, lname, email } = req.body;

        const sanitisedEmail = email.trim().toLowerCase();

        const [result] = await pool.execute(`
            UPDATE Accounts SET fname = ?, lname = ? WHERE email = ?
        `, [fname, lname, sanitisedEmail]
        );

        if (result.affectedRows === 0) {
            return res.status(400).json({ message: "Account not updated" });
        }
        res.status(200).json(result[0]);
    }
    catch (error) {
        next(error);
    }
});

router.post("/updateProfilePicture", upload.single("image"), async (req, res, next) => {
    try {
        const { email } = req.body;
    
        const sanitisedEmail = email.trim().toLowerCase();
        const imageUrl = req.file ? `/uploads/profilePictures/${req.file.filename}` : null;
    
        const [result] = await pool.execute(`
            UPDATE Accounts SET imageUrl = ? WHERE email = ?
        `, [imageUrl, sanitisedEmail]);

        if (result.affectedRows === 0) {
            return res.status(400).json({ message: "Profile not updated" });
        }
        res.status(200).json(result[0]);
    }
    catch (error) {
        next(error);
    }
});

router.post("/delete", async (req, res, next) => {
    try {
        const { email } = req.body;

        const sanitisedEmail = email.trim().toLowerCase();

        let [result] = await pool.execute(`
            DELETE FROM PostLikes
            WHERE PostLikes.accountID = (SELECT accountID FROM Accounts WHERE email = ?)
            OR PostLikes.postID IN (
                SELECT postID FROM Posts WHERE accountID = (SELECT accountID FROM Accounts WHERE email = ?)
            );
        `, [sanitisedEmail]
        );

        [result] = await pool.execute(`
            DELETE FROM PostDislikes
            WHERE PostDislikes.accountID = (SELECT accountID FROM Accounts WHERE email = ?)
            OR PostDislikes.postID IN (
                SELECT postID FROM Posts WHERE accountID = (SELECT accountID FROM Accounts WHERE email = ?)
            );
        `, [sanitisedEmail]
        );

        [result] = await pool.execute(`
            DELETE FROM CommentLikes
            WHERE CommentLikes.accountID = (SELECT accountID FROM Accounts WHERE email = ?)
            OR CommentLikes.postID IN (
                SELECT postID FROM Posts WHERE accountID = (SELECT accountID FROM Accounts WHERE email = ?)
            );
        `, [sanitisedEmail]
        );

        [result] = await pool.execute(`
            DELETE FROM CommentDislikes
            WHERE CommentDislikes.accountID = (SELECT accountID FROM Accounts WHERE email = ?)
            OR CommentDislikes.postID IN (
                SELECT postID FROM Posts WHERE accountID = (SELECT accountID FROM Accounts WHERE email = ?)
            );
        `, [sanitisedEmail]
        );

        [result] = await pool.execute(`
            DELETE FROM Comments
            WHERE Comments.accountID = (SELECT accountID FROM Accounts WHERE email = ?)
            OR Comments.postID IN (
                SELECT postID FROM Posts WHERE accountID = (SELECT accountID FROM Accounts WHERE email = ?)
            );
        `, [sanitisedEmail, sanitisedEmail]
        );

        [result] = await pool.execute(`
            DELETE FROM Posts WHERE accountID = (SELECT accountID FROM Accounts WHERE email = ?)
        `, [sanitisedEmail]
        );

        [result] = await pool.execute(`
            DELETE FROM Friends
            WHERE accountID1 = (SELECT accountID FROM Accounts WHERE email = ?)
            OR accountID2 = (SELECT accountID FROM Accounts WHERE email = ?)
        `, [sanitisedEmail, sanitisedEmail]
        );

        [result] = await pool.execute(`
            DELETE FROM FriendRequest
            WHERE senderID = (SELECT accountID FROM Accounts WHERE email = ?)
            OR receiverID = (SELECT accountID FROM Accounts WHERE email = ?)
        `, [sanitisedEmail, sanitisedEmail]);

        [result] = await pool.execute(`
            DELETE FROM Accounts WHERE email = ?
        `, [sanitisedEmail]
        );

        if (result.affectedRows === 0) {
            return res.status(400).json({ message: "Account not deleted" });
        }
        res.status(200).json(result[0]);
    }
    catch (error) {
        next(error);
    }
});

router.post('/fromNumbers', async (req, res, next) => {
    try {
        const { phoneNumbers, email } = req.body;
    
        const sanitisedEmail = email.trim().toLowerCase();

        const [userResult] = await pool.execute(`
            SELECT accountID
            FROM Accounts
            WHERE email = ?
        `, [sanitisedEmail]);

        const userAccountID = userResult[0].accountID;
        const placeholders = phoneNumbers.map(() => '?').join(',');

        if (phoneNumbers.length === 0) {
            return res.status(200).json([]);
        }

        const [result] = await pool.execute(`
            SELECT *
            FROM Accounts
            WHERE phoneNumber IN (${placeholders})
            AND email != ?
            AND NOT EXISTS (
                SELECT 1
                FROM Friends
                WHERE (Friends.accountID1 = Accounts.accountID AND Friends.accountID2 = ?)
                OR (Friends.accountID2 = Accounts.accountID AND Friends.accountID1 = ?)
            )
        `, [...phoneNumbers, sanitisedEmail, userAccountID, userAccountID]
    );
        
        if (result.length === 0) {
            return res.status(404).json({ message: "No accounts found" });
        }
    
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
});

router.post('/friends', async (req, res, next) => {
    try {
        const { email } = req.body;
    
        const sanitisedEmail = email.trim().toLowerCase();

        const [result] = await pool.execute(`
            SELECT 
                CASE 
                    WHEN A1.email = ? THEN A2.accountID 
                    ELSE A1.accountID 
                END AS accountID,
                CASE 
                    WHEN A1.email = ? THEN A2.email 
                    ELSE A1.email 
                END AS email,
                CASE 
                    WHEN A1.email = ? THEN A2.phoneNumber 
                    ELSE A1.phoneNumber 
                END AS phoneNumber,
                CASE 
                    WHEN A1.email = ? THEN A2.username 
                    ELSE A1.username 
                END AS username,
                CASE 
                    WHEN A1.email = ? THEN A2.fname 
                    ELSE A1.fname 
                END AS fname,
                CASE 
                    WHEN A1.email = ? THEN A2.lname 
                    ELSE A1.lname 
                END AS lname,
                CASE 
                    WHEN A1.email = ? THEN A2.dateJoined 
                    ELSE A1.dateJoined 
                END AS dateJoined,
                CASE 
                    WHEN A1.email = ? THEN A2.imageUrl 
                    ELSE A1.imageUrl 
                END AS imageUrl,
                'friend' as relationship
            FROM Friends
            INNER JOIN Accounts AS A1 ON Friends.accountID1 = A1.accountID
            INNER JOIN Accounts AS A2 ON Friends.accountID2 = A2.accountID
            WHERE A1.email = ? OR A2.email = ?
        `, [sanitisedEmail, sanitisedEmail, sanitisedEmail, sanitisedEmail, sanitisedEmail, sanitisedEmail, sanitisedEmail, sanitisedEmail, sanitisedEmail, sanitisedEmail]
        );
        
        if (result.length === 0) {
            return res.status(404).json({ message: "No friends found" });
        }
    
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
});

router.post('/friendsPage', async (req, res, next) => {
    try {
        const { email, phoneNumbers } = req.body;
    
        const sanitisedEmail = email.trim().toLowerCase();

        const [friends] = await pool.execute(`
            SELECT 
                CASE 
                    WHEN A1.email = ? THEN A2.accountID 
                    ELSE A1.accountID 
                END AS accountID,
                CASE 
                    WHEN A1.email = ? THEN A2.email 
                    ELSE A1.email 
                END AS email,
                CASE 
                    WHEN A1.email = ? THEN A2.phoneNumber 
                    ELSE A1.phoneNumber 
                END AS phoneNumber,
                CASE 
                    WHEN A1.email = ? THEN A2.username 
                    ELSE A1.username 
                END AS username,
                CASE 
                    WHEN A1.email = ? THEN A2.fname 
                    ELSE A1.fname 
                END AS fname,
                CASE 
                    WHEN A1.email = ? THEN A2.lname 
                    ELSE A1.lname 
                END AS lname,
                CASE 
                    WHEN A1.email = ? THEN A2.dateJoined 
                    ELSE A1.dateJoined 
                END AS dateJoined,
                CASE 
                    WHEN A1.email = ? THEN A2.imageUrl 
                    ELSE A1.imageUrl 
                END AS imageUrl,
                'friend' as relationship
            FROM Friends
            INNER JOIN Accounts AS A1 ON Friends.accountID1 = A1.accountID
            INNER JOIN Accounts AS A2 ON Friends.accountID2 = A2.accountID
            WHERE A1.email = ? OR A2.email = ?
        `, [sanitisedEmail, sanitisedEmail, sanitisedEmail, sanitisedEmail, sanitisedEmail, sanitisedEmail, sanitisedEmail, sanitisedEmail, sanitisedEmail, sanitisedEmail]
        );

        const placeholders = phoneNumbers.map(() => '?').join(',');
        
        let [contacts] = [];
        if (phoneNumbers.length > 0)
        {
            [contacts] = await pool.execute(`
                SELECT *,
                    CASE 
                        WHEN EXISTS (
                            SELECT 1 FROM Friends 
                            WHERE 
                            (Friends.accountID1 = accountID AND Friends.accountID2 = (SELECT accountID FROM Accounts WHERE email = ?))
                            OR 
                            (Friends.accountID2 = accountID AND Friends.accountID1 = (SELECT accountID FROM Accounts WHERE email = ?))
                        ) THEN 'friend'
                        WHEN EXISTS (
                            SELECT 1 FROM FriendRequest 
                            WHERE senderID = (SELECT accountID FROM Accounts WHERE email = ?)
                            AND receiverID = accountID
                        ) THEN 'outgoing'
                        WHEN EXISTS (
                            SELECT 1 FROM FriendRequest 
                            WHERE receiverID = (SELECT accountID FROM Accounts WHERE email = ?)
                            AND senderID = accountID
                        ) THEN 'incoming'
                        ELSE 'other'
                    END AS relationship
                FROM Accounts
                WHERE phoneNumber IN (${placeholders})
                AND email != ?
                AND NOT EXISTS (
                    SELECT 1
                    FROM Friends
                    WHERE (Friends.accountID1 = Accounts.accountID AND Friends.accountID2 = (SELECT accountID FROM Accounts WHERE email = ?))
                    OR (Friends.accountID2 = Accounts.accountID AND Friends.accountID1 = (SELECT accountID FROM Accounts WHERE email = ?))
                )
            `, [sanitisedEmail, sanitisedEmail, sanitisedEmail, sanitisedEmail, ...phoneNumbers, sanitisedEmail, sanitisedEmail, sanitisedEmail]
            );
        }

        const [mutual] = await pool.execute(`
            SELECT *,
                CASE 
                    WHEN EXISTS (
                        SELECT 1 FROM Friends 
                        WHERE 
                        (Friends.accountID1 = accountID AND Friends.accountID2 = (SELECT accountID FROM Accounts WHERE email = ?))
                        OR 
                        (Friends.accountID2 = accountID AND Friends.accountID1 = (SELECT accountID FROM Accounts WHERE email = ?))
                    ) THEN 'friend'
                    WHEN EXISTS (
                        SELECT 1 FROM FriendRequest 
                        WHERE senderID = (SELECT accountID FROM Accounts WHERE email = ?)
                        AND receiverID = accountID
                    ) THEN 'outgoing'
                    WHEN EXISTS (
                        SELECT 1 FROM FriendRequest 
                        WHERE receiverID = (SELECT accountID FROM Accounts WHERE email = ?)
                        AND senderID = accountID
                    ) THEN 'incoming'
                    ELSE 'other'
                END AS relationship
            FROM Accounts
            WHERE accountID IN (
                SELECT A2.accountID
                FROM Friends
                INNER JOIN Accounts AS A1 ON Friends.accountID1 = A1.accountID
                INNER JOIN Accounts AS A2 ON Friends.accountID2 = A2.accountID
                WHERE A1.accountID IN (
                    SELECT 
                    CASE 
                        WHEN A1.email = ? THEN A2.accountID 
                        ELSE A1.accountID 
                    END AS accountID
                    FROM Friends
                    INNER JOIN Accounts AS A1 ON Friends.accountID1 = A1.accountID
                    INNER JOIN Accounts AS A2 ON Friends.accountID2 = A2.accountID
                    WHERE A1.email = ? OR A2.email = ?
                )
            )
            OR accountID IN (
                SELECT A1.accountID
                FROM Friends
                INNER JOIN Accounts AS A1 ON Friends.accountID1 = A1.accountID
                INNER JOIN Accounts AS A2 ON Friends.accountID2 = A2.accountID
                WHERE A2.accountID IN (
                    SELECT 
                    CASE 
                        WHEN A1.email = ? THEN A2.accountID 
                        ELSE A1.accountID 
                    END AS accountID
                    FROM Friends
                    INNER JOIN Accounts AS A1 ON Friends.accountID1 = A1.accountID
                    INNER JOIN Accounts AS A2 ON Friends.accountID2 = A2.accountID
                    WHERE A1.email = ? OR A2.email = ?
                )
            )
            AND email != ?
        `, [sanitisedEmail, sanitisedEmail, sanitisedEmail, sanitisedEmail, sanitisedEmail, sanitisedEmail, sanitisedEmail, sanitisedEmail, sanitisedEmail, sanitisedEmail, sanitisedEmail]
        );

        const [incoming] = await pool.execute(`
            SELECT Accounts.*,
                'incoming' as relationship
            FROM FriendRequest
            INNER JOIN Accounts ON FriendRequest.senderID = Accounts.accountID
            WHERE FriendRequest.receiverID = (SELECT accountID FROM Accounts WHERE email = ?)
        `, [sanitisedEmail]
        );

        const [outgoing] = await pool.execute(`
            SELECT Accounts.*,
                'outgoing' as relationship
            FROM FriendRequest
            INNER JOIN Accounts ON FriendRequest.receiverID = Accounts.accountID
            WHERE FriendRequest.senderID = (SELECT accountID FROM Accounts WHERE email = ?)
        `, [sanitisedEmail]
        );

        res.status(200).json({'friends': friends, 'contacts': contacts, 'mutual': mutual, 'incoming': incoming, 'outgoing': outgoing});
    } catch (error) {
        next(error);
    }
});

router.post('/acceptFriendRequest', async (req, res, next) => {
    try {
        const { email, otherEmail } = req.body;
    
        const sanitisedEmail = email.trim().toLowerCase();
        const sanitisedOtherEmail = otherEmail.trim().toLowerCase();

        let [result] = await pool.execute(`
            DELETE FROM FriendRequest
            WHERE senderID = (SELECT accountID FROM Accounts WHERE email = ?)
            AND receiverID = (SELECT accountID FROM Accounts WHERE email = ?)
        `, [sanitisedOtherEmail, sanitisedEmail]
        );

        [result] = await pool.execute(`
            INSERT INTO Friends (accountID1, accountID2) VALUES
            ((SELECT accountID FROM Accounts WHERE email = ?), (SELECT accountID FROM Accounts WHERE email = ?))
        `, [sanitisedOtherEmail, sanitisedEmail]
        );
    
        if (result.affectedRows === 0) {
            return res.status(400).json({ message: "Friend Request not rejected" });
        }
        res.status(200).json(result[0]);
    } catch (error) {
        next(error);
    }
});

router.post('/rejectFriendRequest', async (req, res, next) => {
    try {
        const { email, otherEmail } = req.body;
    
        const sanitisedEmail = email.trim().toLowerCase();
        const sanitisedOtherEmail = otherEmail.trim().toLowerCase();

        const [result] = await pool.execute(`
            DELETE FROM FriendRequest
            WHERE senderID = (SELECT accountID FROM Accounts WHERE email = ?)
            AND receiverID = (SELECT accountID FROM Accounts WHERE email = ?)
        `, [sanitisedOtherEmail, sanitisedEmail]
        );
    
        if (result.affectedRows === 0) {
            return res.status(400).json({ message: "Friend Request not rejected" });
        }
        res.status(200).json(result[0]);
    } catch (error) {
        next(error);
    }
});

router.post('/sendFriendRequest', async (req, res, next) => {
    try {
        const { email, otherEmail } = req.body;
    
        const sanitisedEmail = email.trim().toLowerCase();
        const sanitisedOtherEmail = otherEmail.trim().toLowerCase();

        const [result] = await pool.execute(`
            INSERT INTO FriendRequest (senderID, receiverID) VALUES
            ((SELECT accountID FROM Accounts WHERE email = ?), (SELECT accountID FROM Accounts WHERE email = ?))
        `, [sanitisedEmail, sanitisedOtherEmail]
        );
    
        if (result.affectedRows === 0) {
            return res.status(400).json({ message: "Friend Request not sent" });
        }
        res.status(200).json(result[0]);
    } catch (error) {
        next(error);
    }
});

router.post('/cancelFriendRequest', async (req, res, next) => {
    try {
        const { email, otherEmail } = req.body;
    
        const sanitisedEmail = email.trim().toLowerCase();
        const sanitisedOtherEmail = otherEmail.trim().toLowerCase();

        let [result] = await pool.execute(`
            DELETE FROM FriendRequest
            WHERE senderID = (SELECT accountID FROM Accounts WHERE email = ?)
            AND receiverID = (SELECT accountID FROM Accounts WHERE email = ?)
        `, [sanitisedEmail, sanitisedOtherEmail]
        );
    
        if (result.affectedRows === 0) {
            return res.status(400).json({ message: "Friend Request not rejected" });
        }
        res.status(200).json(result[0]);
    } catch (error) {
        next(error);
    }
});

router.post('/removeFriend', async (req, res, next) => {
    try {
        const { email, otherEmail } = req.body;
    
        const sanitisedEmail = email.trim().toLowerCase();
        const sanitisedOtherEmail = otherEmail.trim().toLowerCase();

        let [result] = await pool.execute(`
            DELETE FROM Friends
            WHERE (accountID1 = (SELECT accountID FROM Accounts WHERE email = ?)
            AND accountID2 = (SELECT accountID FROM Accounts WHERE email = ?))
            OR (accountID1 = (SELECT accountID FROM Accounts WHERE email = ?)
            AND accountID2 = (SELECT accountID FROM Accounts WHERE email = ?))
        `, [sanitisedOtherEmail, sanitisedEmail, sanitisedEmail, sanitisedOtherEmail]
        );
    
        if (result.affectedRows === 0) {
            return res.status(400).json({ message: "Friend Request not rejected" });
        }
        res.status(200).json(result[0]);
    } catch (error) {
        next(error);
    }
});

router.post('/registerFCMToken', async (req, res, next) => {
    try {
        const { email, token } = req.body;
    
        const sanitisedEmail = email.trim().toLowerCase();

        let [result] = await pool.execute(`
            UPDATE Accounts
            SET FCMToken = ?
            WHERE email = ?
        `, [token, sanitisedEmail]
        );
    
        if (result.affectedRows === 0) {
            return res.status(400).json({ message: "Token failed to register" });
        }
        res.status(200).json(result[0]);
    } catch (error) {
        next(error);
    }
});

export default router;