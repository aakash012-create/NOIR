import jwt from "jsonwebtoken";
import { pool } from "../config/db.js";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ")
    ? header.slice(7)
    : "";

  if (!token) {
    return res.status(401).json({
      error: "Please sign in to continue."
    });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({
      error: "Your session expired. Please sign in again."
    });
  }
}

// Admin-only authorization
export async function requireAdmin(req, res, next) {
  try {
    const { rows } = await pool.query(
      "SELECT role FROM users WHERE id = $1",
      [req.user.id]
    );

    if (!rows[0] || rows[0].role !== "admin") {
      return res.status(403).json({
        error: "Administrator access required."
      });
    }

    next();
  } catch (error) {
    next(error);
  }
}