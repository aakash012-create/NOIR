import { Router } from "express";
import Stripe from "stripe";
import { pool } from "../config/db.js";

const router = Router();

router.post("/create-payment-intent", async (req, res, next) => {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(503).json({ error: "Stripe is not configured. Add STRIPE_SECRET_KEY to backend/.env." });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const items = req.body?.items;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Provide at least one cart item." });
    }

    // Prices are always loaded from PostgreSQL; browser-submitted prices are ignored.
    let totalPaise = 0;
    for (const item of items) {
      const productId = Number(item.productId);
      const quantity = Number(item.quantity);
      if (!Number.isInteger(productId) || productId < 1 ||
          !Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
        return res.status(400).json({ error: "Invalid cart item." });
      }
      const { rows } = await pool.query("SELECT price FROM products WHERE id = $1", [productId]);
      if (!rows[0]) return res.status(400).json({ error: `Product ${productId} does not exist.` });
      totalPaise += Math.round(Number(rows[0].price) * 100) * quantity;
    }

    if (totalPaise < 50) return res.status(400).json({ error: "Order total is below Stripe's minimum." });

    const intent = await stripe.paymentIntents.create({
      amount: totalPaise,
      currency: "inr",
      automatic_payment_methods: { enabled: true }
    });

    res.json({ clientSecret: intent.client_secret });
  } catch (error) {
    next(error);
  }
});

export default router;
