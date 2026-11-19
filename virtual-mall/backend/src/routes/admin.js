import { Router } from "express";
import { pool } from "../config/db.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

// All admin endpoints require administrator authentication.
router.use(requireAuth, requireAdmin);

// DASHBOARD STATISTICS
router.get("/stats", async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM products) AS total_products,
        (SELECT COUNT(*) FROM users) AS total_customers,
        (SELECT COUNT(*) FROM orders) AS total_orders,
        (SELECT COALESCE(SUM(total), 0)FROM orders WHERE status != 'cancelled') AS total_revenue
    `);

    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
});

// VIEW ALL ORDERS
router.get("/orders", async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT o.id, o.user_id, u.name AS customer_name,
        u.email, o.status, o.total, o.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'productName', i.product_name,
              'quantity', i.quantity,
              'unitPrice', i.unit_price
            )
          ) FILTER (WHERE i.id IS NOT NULL),
          '[]'
        ) AS items
      FROM orders o
      JOIN users u ON u.id = o.user_id
      LEFT JOIN order_items i ON i.order_id = o.id
      GROUP BY o.id, u.name, u.email
      ORDER BY o.created_at DESC
    `);

    res.json(rows);
  } catch (error) {
    next(error);
  }
});

// UPDATE ORDER STATUS
// UPDATE ORDER STATUS WITH AUTOMATIC STOCK RESTORATION
// UPDATE ORDER STATUS, TRACKING AND DELIVERY HISTORY
router.patch("/orders/:id/status", async (req, res, next) => {
  const client = await pool.connect();

  try {
    const id = Number(req.params.id);
    const { status, trackingNumber, estimatedDelivery, note } = req.body;

    const allowedStatuses = [
      "placed",
      "confirmed",
      "shipped",
      "out_for_delivery",
      "delivered",
      "cancelled"
    ];

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: "Invalid order ID." });
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid order status." });
    }

    await client.query("BEGIN");

    const { rows: orders } = await client.query(
      `SELECT id, user_id, status, total
       FROM orders
       WHERE id = $1
       FOR UPDATE`,
      [id]
    );

    if (!orders[0]) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Order not found." });
    }

    const currentOrder = orders[0];

    if (currentOrder.status === "cancelled") {
      await client.query("ROLLBACK");
      return res.status(409).json({
        error: "A cancelled order cannot be reopened."
      });
    }

    if (currentOrder.status === "delivered" && status !== "delivered") {
      await client.query("ROLLBACK");
      return res.status(409).json({
        error: "A delivered order cannot be reopened."
      });
    }

    if (status === "cancelled") {
      const { rows: items } = await client.query(
        `SELECT product_id, SUM(quantity)::integer AS quantity
         FROM order_items
         WHERE order_id = $1
         GROUP BY product_id`,
        [id]
      );

      for (const item of items) {
        await client.query(
          `UPDATE products
           SET stock_quantity = stock_quantity + $1
           WHERE id = $2`,
          [item.quantity, item.product_id]
        );
      }
    }

    const { rows } = await client.query(
      `UPDATE orders
       SET status = $1,
           tracking_number = COALESCE($2, tracking_number),
           estimated_delivery = COALESCE($3::date, estimated_delivery)
       WHERE id = $4
       RETURNING *`,
      [
        status,
        trackingNumber?.trim() || null,
        estimatedDelivery || null,
        id
      ]
    );
    if (currentOrder.status !== status) {
  const statusLabel = status.replaceAll("_", " ");

  await client.query(
    `INSERT INTO notifications (user_id, order_id, title, message)
     VALUES ($1, $2, $3, $4)`,
    [
      currentOrder.user_id,
      id,
      "Order Update",
      `Your order #${id} is now ${statusLabel}.`
    ]
  );
}

    if (currentOrder.status !== status) {
      await client.query(
        `INSERT INTO order_status_history
         (order_id, status, note)
         VALUES ($1, $2, $3)`,
        [
          id,
          status,
          note?.trim() || `Order status updated to ${status}.`
        ]
      );
    }

    await client.query("COMMIT");

    res.json({ order: rows[0] });

  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
});

// VIEW ALL PRODUCTS
router.get("/products", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
  `SELECT id, name, slug, description, price,
   image_url, category, stock_quantity,
   low_stock_threshold, sale_price, is_featured
   FROM products ORDER BY id`
);

    res.json(rows);
  } catch (error) {
    next(error);
  }
});

// ADD PRODUCT
router.post("/products", async (req, res, next) => {
  try {
    const {
  name, slug, description, price, image_url, category, sale_price,
  is_featured
} = req.body;

const regularPrice = Number(price);

const discountedPrice =
  sale_price === "" || sale_price == null
    ? null
    : Number(sale_price);

if (!Number.isFinite(regularPrice) || regularPrice <= 0) {
  return res.status(400).json({
    error: "Enter a valid product price."
  });
}

if (
  discountedPrice !== null &&
  (!Number.isFinite(discountedPrice) ||
    discountedPrice <= 0 ||
    discountedPrice >= regularPrice)
) {
  return res.status(400).json({
    error: "Sale price must be greater than zero and lower than the regular price."
  });
}

    if (!name?.trim() || !slug?.trim() || !category?.trim()) {
  return res.status(400).json({
    error: "Name, slug and category are required."
  });
}

    const { rows } = await pool.query(
  `INSERT INTO products
   (name, slug, description, price, image_url, category, is_featured, sale_price)
   VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
   RETURNING *`,
  [
    name.trim(),
    slug.trim(),
    description || "",
    Number(price),
    image_url || null,
    category.trim(),
    is_featured === true,
    discountedPrice
  ]
);

    res.status(201).json({ product: rows[0] });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ error: "Product slug already exists." });
    }
    next(error);
  }
});

// EDIT PRODUCT
router.put("/products/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const {
      name, slug, description, price, image_url, category, sale_price,
     is_featured
    } = req.body;
    const regularPrice = Number(price);

const discountedPrice =
  sale_price === "" || sale_price == null
    ? null
    : Number(sale_price);

if (!Number.isFinite(regularPrice) || regularPrice <= 0) {
  return res.status(400).json({
    error: "Enter a valid product price."
  });
}

if (
  discountedPrice !== null &&
  (!Number.isFinite(discountedPrice) ||
    discountedPrice <= 0 ||
    discountedPrice >= regularPrice)
) {
  return res.status(400).json({
    error: "Sale price must be greater than zero and lower than the regular price."
  });
}
    if (
  !Number.isInteger(id) ||
  id < 1 ||
  !name?.trim() ||
  !slug?.trim() ||
  !category?.trim()
) {
  return res.status(400).json({
    error: "Invalid product details."
  });
}

    const { rows } = await pool.query(
  `UPDATE products SET
   name=$1,
   slug=$2,
   description=$3,
   price=$4,
   image_url=$5,
   category=$6,
   is_featured=$7,
   sale_price=$8
   WHERE id=$9
   RETURNING *`,
  [
    name.trim(),
    slug.trim(),
    description || "",
    regularPrice,
    image_url || null,
    category.trim(),
    is_featured === true,
    discountedPrice,
    req.params.id
  ]
);
    if (!rows[0]) {
      return res.status(404).json({ error: "Product not found." });
    }

    res.json({ product: rows[0] });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ error: "Product slug already exists." });
    }
    next(error);
  }
});

// DELETE PRODUCT
router.delete("/products/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: "Invalid product ID." });
    }

    const { rows } = await pool.query(
      "DELETE FROM products WHERE id=$1 RETURNING id",
      [id]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: "Product not found." });
    }

    res.json({ message: "Product deleted successfully." });
  } catch (error) {
    if (error.code === "23503") {
      return res.status(409).json({
        error: "This product is referenced by an order and cannot be deleted."
      });
    }
    next(error);
  }
});

// VIEW ALL CUSTOMERS
router.get("/customers", async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        u.id,
        u.name,
        u.email,
        u.created_at,
        COUNT(o.id)::integer AS total_orders,
        COALESCE(SUM(o.total), 0) AS total_spent
      FROM users u
      LEFT JOIN orders o ON o.user_id = u.id
      WHERE u.role = 'customer'
      GROUP BY u.id, u.name, u.email, u.created_at
      ORDER BY u.created_at DESC
    `);

    res.json(rows);
  } catch (error) {
    next(error);
  }
});

// UPDATE PRODUCT INVENTORY
router.patch("/products/:id/stock", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const quantity = Number(req.body.stock_quantity);

    if (
      !Number.isInteger(id) ||
      id < 1 ||
      !Number.isInteger(quantity) ||
      quantity < 0
    ) {
      return res.status(400).json({
        error: "Enter a valid stock quantity."
      });
    }

    const { rows } = await pool.query(
      `UPDATE products
       SET stock_quantity = $1
       WHERE id = $2
       RETURNING id, name, stock_quantity, low_stock_threshold`,
      [quantity, id]
    );

    if (!rows[0]) {
      return res.status(404).json({
        error: "Product not found."
      });
    }

    res.json({ product: rows[0] });
  } catch (error) {
    next(error);
  }
});

export default router;