import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/db';

export const register = async (req: Request, res: Response) => {
    // 1. Destructure the new preferredLanguage field
    const { email, password, preferredLanguage, religion } = req.body;

    try {
        const userExists = await query('SELECT * FROM users WHERE email = $1', [email]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ error: "User already exists" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 2. Insert with language preference
        const newUser = await query(
            'INSERT INTO users (email, password, preferred_language, religion) VALUES ($1, $2, $3, $4) RETURNING id, email, preferred_language, religion',
            [email, hashedPassword, preferredLanguage || 'en', religion || null]
        );

        res.status(201).json({ message: "User registered successfully", user: newUser.rows[0] });
    } catch (err) {
        res.status(500).json({ error: "Server error during registration" });
    }
};

export const login = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    try {
        const result = await query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET as string, { expiresIn: '1d' });

        // 3. Return the language so the Frontend knows which UI to show
        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                language: user.preferred_language,
                religion: user.religion
            }
        });
    } catch (err) {
        res.status(500).json({ error: "Server error during login" });
    }
};