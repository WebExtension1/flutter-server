import express from "express";
import pool from "../db.js";

const router = express.Router();

router.post("/exists", async (req, res, next) => {
    try {
        const { email, username } = req.body;

        const [result] = await pool.execute(`
            SELECT * FROM Accounts WHERE email = ? OR username = ?
        `, [email, username.toLowerCase()]
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

// Create folder
router.post("/create", async (req, res, next) => {
    try {
        const { email, phoneNumber, username, fname, lname } = req.body;

        const [result] = await pool.execute(`
            INSERT INTO Accounts (email, phoneNumber, username, fname, lname) VALUES
            (?, ?, ?, ?, ?)
        `, [email.toLowerCase(), phoneNumber, username.toLowerCase(), fname, lname]
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

        const [result] = await pool.execute(`
            SELECT * FROM Accounts WHERE email = ?
        `, [email.toLowerCase()]
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

        const [result] = await pool.execute(`
            UPDATE Accounts SET email = ? WHERE email = ?
        `, [newEmail.toLowerCase(), oldEmail.toLowerCase()]
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

router.post("/delete", async (req, res, next) => {
    try {
        const { email } = req.body;

        let [result] = await pool.execute(`
            DELETE FROM Comments
            WHERE Comments.accountID = (SELECT accountID FROM Accounts WHERE email = ?)
            OR Comments.postID IN (
                SELECT postID FROM Posts WHERE accountID = (SELECT accountID FROM Accounts WHERE email = ?)
            );
        `, [email.toLowerCase(), email.toLowerCase()]
        );

        [result] = await pool.execute(`
            DELETE FROM Posts WHERE accountID = (SELECT accountID FROM Accounts WHERE email = ?)
        `, [email.toLowerCase()]
        );

        [result] = await pool.execute(`
            DELETE FROM Friends
            WHERE accountID1 = (SELECT accountID FROM Accounts WHERE email = ?)
            OR accountID2 = (SELECT accountID FROM Accounts WHERE email = ?)
        `, [email.toLowerCase(), email.toLowerCase()]
        );

        [result] = await pool.execute(`
            DELETE FROM FriendRequest
            WHERE senderID = (SELECT accountID FROM Accounts WHERE email = ?)
            OR receiverID = (SELECT accountID FROM Accounts WHERE email = ?)
        `, [email.toLowerCase(), email.toLowerCase()]);

        [result] = await pool.execute(`
            DELETE FROM Accounts WHERE email = ?
        `, [email.toLowerCase()]
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

export default router;