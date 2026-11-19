import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../config/db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const makeToken = user =>
  jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

const publicUser = user => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role
});

// REGISTER
router.post("/register", async (req, res, next) => {
  try {
    const name = String(req.body?.name || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");

    if (name.length < 2 || name.length > 100) {
      return res.status(400).json({
        error: "Enter a name between 2 and 100 characters."
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return res.status(400).json({
        error: "Enter a valid email address."
      });
    }

    if (password.length < 8 || password.length > 72) {
      return res.status(400).json({
        error: "Password must be 8–72 characters."
      });
    }

    const hash = await bcrypt.hash(password, 12);

    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, role`,
      [name, email, hash]
    );

    res.status(201).json({
      token: makeToken(rows[0]),
      user: publicUser(rows[0])
    });

  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        error: "An account with that email already exists."
      });
    }

    next(error);
  }
});

// LOGIN
router.post("/login", async (req, res, next) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");

    const { rows } = await pool.query(
      `SELECT id, name, email, password_hash, role
       FROM users
       WHERE email = $1`,
      [email]
    );

    const user = rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({
        error: "Email or password is incorrect."
      });
    }

    res.json({
      token: makeToken(user),
      user: publicUser(user)
    });

  } catch (error) {
    next(error);
  }
});

// CURRENT USER
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, name, email, role FROM users WHERE id = $1",
      [req.user.id]
    );

    if (!rows[0]) {
      return res.status(401).json({
        error: "Account not found."
      });
    }

    res.json({
      user: publicUser(rows[0])
    });

  } catch (error) {
    next(error);
  }
});

export default router;