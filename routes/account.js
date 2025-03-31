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

export default router;