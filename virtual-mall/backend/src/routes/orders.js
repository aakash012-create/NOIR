
import { Router } from "express";
import { pool } from "../config/db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

// Place an order and automatically reduce stock
router.post("/", async (req, res, next) => {
  const items = req.body?.items;
  const shipping = req.body?.shipping || {};

  const required = [
    "fullName",
    "phone",
    "address",
    "city",
    "state",
    "postalCode",
  ];

  if (!Array.isArray(items) || items.length < 1 || items.length > 30) {
    return res.status(400).json({
      error: "Your bag must contain 1–30 items.",
    });
  }

  for (const key of required) {
    if (!String(shipping[key] || "").trim()) {
      return res.status(400).json({
        error: `Please provide ${key}.`,
      });
    }
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Validate and combine duplicate product IDs
    const quantities = new Map();

    for (const item of items) {
      const productId = Number(item.productId);
      const quantity = Number(item.quantity);

      if (!Number.isInteger(productId) || productId < 1) {
        throw Object.assign(new Error("Invalid product ID."), {
          status: 400,
        });
      }

      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
        throw Object.assign(new Error("Invalid product quantity."), {
          status: 400,
        });
      }

      const combined = (quantities.get(productId) || 0) + quantity;

      if (combined > 20) {
        throw Object.assign(
          new Error("Maximum quantity per product is 20."),
          { status: 400 }
        );
      }

      quantities.set(productId, combined);
    }

    const productIds = [...quantities.keys()];

    // Lock product rows while checking stock
    const { rows: products } = await client.query(
      `SELECT id, name, price, sale_price, stock_quantity
      FROM products
      WHERE id = ANY($1::bigint[])
      ORDER BY id
      FOR UPDATE`,
      [productIds]
    );

    if (products.length !== productIds.length) {
      throw Object.assign(
        new Error("One or more products are no longer available."),
        { status: 400 }
      );
    }

    const byId = new Map(
      products.map((product) => [Number(product.id), product])
    );

    let total = 0;
    const lines = [];

    // Check stock and calculate total using database prices
    for (const [productId, quantity] of quantities) {
      const product = byId.get(productId);

      if (Number(product.stock_quantity) < quantity) {
        throw Object.assign(
          new Error(
            `Insufficient stock for ${product.name}. Available: ${product.stock_quantity}.`
          ),
          { status: 400 }
        );
      }

      const regularPrice = Number(product.price);
const salePrice = Number(product.sale_price);

const effectivePrice =
  Number.isFinite(salePrice) &&
  salePrice > 0 &&
  salePrice < regularPrice
    ? salePrice
    : regularPrice;

total += effectivePrice * quantity;

      lines.push({ product, quantity, effectivePrice });
    }

    // Reduce stock
    for (const line of lines) {
      const result = await client.query(
        `UPDATE products
         SET stock_quantity = stock_quantity - $1
         WHERE id = $2 AND stock_quantity >= $1`,
        [line.quantity, line.product.id]
      );

      if (result.rowCount !== 1) {
        throw Object.assign(
          new Error(`Could not update stock for ${line.product.name}.`),
          { status: 409 }
        );
      }
    }

    // Create Cash on Delivery order
    const { rows: orderRows } = await client.query(
      `INSERT INTO orders
       (user_id,status,total,shipping_name,shipping_phone,
        shipping_address,shipping_city,shipping_state,shipping_postal_code)
       VALUES ($1,'placed',$2,$3,$4,$5,$6,$7,$8)
       RETURNING id,status,total,created_at`,
      [
        req.user.id,
        total,
        String(shipping.fullName).trim(),
        String(shipping.phone).trim(),
        String(shipping.address).trim(),
        String(shipping.city).trim(),
        String(shipping.state).trim(),
        String(shipping.postalCode).trim(),
      ]
    );

    const order = orderRows[0];
    // Record initial order status
    await client.query(
     `INSERT INTO order_status_history (order_id, status, note)
      VALUES ($1, 'placed', $2)`,
      [order.id, "Your order has been successfully placed."]
    );

    await client.query(
  `INSERT INTO notifications (user_id, order_id, title, message)
   VALUES ($1, $2, $3, $4)`,
  [
    req.user.id,
    order.id,
    "Order Placed",
    `Your order #${order.id} has been successfully placed.`
  ]
);

    // Save order items
    for (const line of lines) {
      await client.query(
        `INSERT INTO order_items
         (order_id,product_id,product_name,unit_price,quantity)
         VALUES ($1,$2,$3,$4,$5)`,
          [
        order.id,
       line.product.id,
       line.product.name,
        line.effectivePrice,
       line.quantity,
]
      );
    }

    await client.query("COMMIT");

    res.status(201).json({
      order: {
        ...order,
        total: Number(order.total),
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");

    if (error.status) {
      return res.status(error.status).json({
        error: error.message,
      });
    }

    next(error);
  } finally {
    client.release();
  }
});

// CUSTOMER CANCEL OWN ORDER
router.patch("/:id/cancel", async (req, res, next) => {
  const client = await pool.connect();

  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: "Invalid order ID." });
    }

    await client.query("BEGIN");

    // Lock this customer's order
    const { rows: orders } = await client.query(
      `SELECT id, status, total
       FROM orders
       WHERE id = $1 AND user_id = $2
       FOR UPDATE`,
      [id, req.user.id]
    );

    if (!orders[0]) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Order not found." });
    }

    const order = orders[0];

    if (order.status === "cancelled") {
      await client.query("ROLLBACK");
      return res.status(409).json({
        error: "This order is already cancelled."
      });
    }

    if (["shipped", "delivered"].includes(order.status)) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "Shipped or delivered orders cannot be cancelled."
      });
    }

    // Get purchased quantities
    const { rows: items } = await client.query(
      `SELECT product_id, SUM(quantity)::integer AS quantity
       FROM order_items
       WHERE order_id = $1
       GROUP BY product_id`,
      [id]
    );

    // Restore inventory
    for (const item of items) {
      await client.query(
        `UPDATE products
         SET stock_quantity = stock_quantity + $1
         WHERE id = $2`,
        [item.quantity, item.product_id]
      );
    }

    // Mark order as cancelled
    const { rows } = await client.query(
      `UPDATE orders
       SET status = 'cancelled'
       WHERE id = $1
       RETURNING id, status, total`,
      [id]
    );

    await client.query(
    `INSERT INTO order_status_history (order_id, status, note)
     VALUES ($1, 'cancelled', $2)`,
    [id, "The customer cancelled this order."]
  );

  await client.query(
  `INSERT INTO notifications (user_id, order_id, title, message)
   VALUES ($1, $2, $3, $4)`,
  [
    req.user.id,
    id,
    "Order Cancelled",
    `Your order #${id} has been cancelled successfully.`
  ]
);

    await client.query("COMMIT");

    res.json({ order: rows[0] });

  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
});

// CUSTOMER ORDER TRACKING
router.get("/:id/tracking", async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: "Invalid order ID." });
    }

    const { rows } = await pool.query(
      `SELECT
         o.id,
         o.status,
         o.total,
         o.created_at,
         o.tracking_number,
         o.estimated_delivery,
         COALESCE(
           (
             SELECT json_agg(
               json_build_object(
                 'status', h.status,
                 'note', h.note,
                 'created_at', h.created_at
               )
               ORDER BY h.created_at ASC
             )
             FROM order_status_history h
             WHERE h.order_id = o.id
           ),
           '[]'
         ) AS history
       FROM orders o
       WHERE o.id = $1 AND o.user_id = $2`,
      [id, req.user.id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Order not found." });
    }

    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
});

// Customer order history
// Customer order history
router.get("/", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         o.id,
         o.status,
         o.total,
         o.created_at,
         o.tracking_number,
         o.estimated_delivery,
         COALESCE(
           json_agg(
             json_build_object(
               'productId', i.product_id,
               'productName', i.product_name,
               'quantity', i.quantity,
               'unitPrice', i.unit_price
             )
           ) FILTER (WHERE i.id IS NOT NULL),
           '[]'
         ) AS items
       FROM orders o
       LEFT JOIN order_items i ON i.order_id = o.id
       WHERE o.user_id = $1
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      [req.user.id]
    );

    res.json(rows);
  } catch (error) {
    next(error);
  }
});

export default router;
