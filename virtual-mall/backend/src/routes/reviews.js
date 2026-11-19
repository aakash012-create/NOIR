
import { Router } from "express";
import { pool } from "../config/db.js";
import { requireAuth } from "../middleware/auth.js";
import jwt from "jsonwebtoken";

const router = Router();

function optionalAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (token) {
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      // Public reviews remain visible if the token is expired.
    }
  }

  next();
}

// GET REVIEWS FOR A PRODUCT
router.get("/product/:productId", optionalAuth, async (req, res, next) => {
  try {
    const productId = Number(req.params.productId);

    if (!Number.isInteger(productId) || productId < 1) {
      return res.status(400).json({ error: "Invalid product ID." });
    }

    const { rows } = await pool.query(
      `SELECT
         r.id,
         r.rating,
         r.review_text,
         r.created_at,
         u.name AS customer_name,
         (r.user_id = $2) AS is_mine
       FROM product_reviews r
       JOIN users u ON u.id = r.user_id
       WHERE r.product_id = $1
       ORDER BY r.created_at DESC`,
      [productId, req.user?.id || null]
    );

    res.json(rows);
  } catch (error) {
    next(error);
  }
});

// GET AVERAGE PRODUCT RATING
router.get("/product/:productId/summary", async (req, res, next) => {
  try {
    const productId = Number(req.params.productId);

    if (!Number.isInteger(productId) || productId < 1) {
      return res.status(400).json({ error: "Invalid product ID." });
    }

    const { rows } = await pool.query(
      `SELECT
         COALESCE(ROUND(AVG(rating)::numeric, 1), 0) AS average_rating,
         COUNT(*)::integer AS total_reviews
       FROM product_reviews
       WHERE product_id = $1`,
      [productId]
    );

    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
});

// SUBMIT A REVIEW
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { productId, orderId, rating, reviewText } = req.body;

    const product = Number(productId);
    const order = Number(orderId);
    const stars = Number(rating);
    const text = String(reviewText || "").trim();

    if (
      !Number.isInteger(product) || product < 1 ||
      !Number.isInteger(order) || order < 1 ||
      !Number.isInteger(stars) || stars < 1 || stars > 5 ||
      text.length < 3 || text.length > 2000
    ) {
      return res.status(400).json({ error: "Invalid review details." });
    }

    const { rows: purchases } = await pool.query(
      `SELECT o.id
       FROM orders o
       JOIN order_items i ON i.order_id = o.id
       WHERE o.id = $1
         AND o.user_id = $2
         AND o.status <> 'cancelled'
         AND i.product_id = $3`,
      [order, req.user.id, product]
    );

    if (!purchases.length) {
      return res.status(403).json({
        error: "You can only review products you have purchased."
      });
    }

    const { rows } = await pool.query(
      `INSERT INTO product_reviews
       (product_id, user_id, order_id, rating, review_text)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [product, req.user.id, order, stars, text]
    );

    res.status(201).json({ review: rows[0] });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        error: "You have already reviewed this product for this order."
      });
    }
    next(error);
  }
});

// EDIT YOUR OWN REVIEW
router.put("/:id", requireAuth, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const rating = Number(req.body.rating);
    const reviewText = String(req.body.reviewText || "").trim();

    if (
      !Number.isInteger(id) || id < 1 ||
      !Number.isInteger(rating) || rating < 1 || rating > 5 ||
      reviewText.length < 3 || reviewText.length > 2000
    ) {
      return res.status(400).json({ error: "Invalid review details." });
    }

    const { rows } = await pool.query(
      `UPDATE product_reviews
       SET rating = $1, review_text = $2, updated_at = NOW()
       WHERE id = $3 AND user_id = $4
       RETURNING *`,
      [rating, reviewText, id, req.user.id]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: "Review not found." });
    }

    res.json({ review: rows[0] });
  } catch (error) {
    next(error);
  }
});

// DELETE YOUR OWN REVIEW
router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: "Invalid review ID." });
    }

    const { rows } = await pool.query(
      `DELETE FROM product_reviews
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [id, req.user.id]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: "Review not found." });
    }

    res.json({ message: "Review deleted successfully." });
  } catch (error) {
    next(error);
  }
});

export default router;
