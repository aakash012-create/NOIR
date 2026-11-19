import { Router } from "express";
import { pool } from "../config/db.js";

const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, slug, description, price, image_url,
      category, sale_price, is_featured
      FROM products ORDER BY id`
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: "Invalid product ID." });
    }
    const { rows } = await pool.query(
      `SELECT id, name, slug, description, price, image_url,
      category, sale_price, is_featured
      FROM products WHERE id = $1`,
      [id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Product not found." });
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
});

export default router;
