import express from "express";
import { pool } from "../config/db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.use(requireAuth);

// Get customer notifications
router.get("/", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT *
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    res.json(rows);
  } catch (error) {
    next(error);
  }
});

// Mark notification as read
router.patch("/:id/read", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `UPDATE notifications
       SET is_read = TRUE
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [req.params.id, req.user.id]
    );

    if (!rows.length) {
      return res.status(404).json({
        error: "Notification not found."
      });
    }

    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
});

export default router;