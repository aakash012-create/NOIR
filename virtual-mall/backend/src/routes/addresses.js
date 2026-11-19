import express from "express";
import { pool } from "../config/db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.use(requireAuth);

// Get saved addresses
router.get("/", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM user_addresses
       WHERE user_id = $1
       ORDER BY is_default DESC, created_at DESC`,
      [req.user.id]
    );

    res.json(rows);
  } catch (error) {
    next(error);
  }
});

// Add a new address
router.post("/", async (req, res, next) => {
  const {
    fullName,
    phone,
    address,
    city,
    state,
    postalCode,
    isDefault
  } = req.body;

  if (
    !fullName?.trim() ||
    !phone?.trim() ||
    !address?.trim() ||
    !city?.trim() ||
    !state?.trim() ||
    !postalCode?.trim()
  ) {
    return res.status(400).json({ error: "Please complete all address fields." });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    if (isDefault) {
      await client.query(
        "UPDATE user_addresses SET is_default = FALSE WHERE user_id = $1",
        [req.user.id]
      );
    }

    const { rows } = await client.query(
      `INSERT INTO user_addresses
       (user_id, full_name, phone, address, city, state, postal_code, is_default)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        req.user.id,
        fullName.trim(),
        phone.trim(),
        address.trim(),
        city.trim(),
        state.trim(),
        postalCode.trim(),
        Boolean(isDefault)
      ]
    );

    await client.query("COMMIT");
    res.status(201).json(rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
});

// Update an address
router.put("/:id", async (req, res, next) => {
  const {
    fullName,
    phone,
    address,
    city,
    state,
    postalCode,
    isDefault
  } = req.body;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    if (isDefault) {
      await client.query(
        "UPDATE user_addresses SET is_default = FALSE WHERE user_id = $1",
        [req.user.id]
      );
    }

    const { rows } = await client.query(
      `UPDATE user_addresses
       SET full_name = $1,
           phone = $2,
           address = $3,
           city = $4,
           state = $5,
           postal_code = $6,
           is_default = $7,
           updated_at = NOW()
       WHERE id = $8 AND user_id = $9
       RETURNING *`,
      [
        fullName,
        phone,
        address,
        city,
        state,
        postalCode,
        Boolean(isDefault),
        req.params.id,
        req.user.id
      ]
    );

    if (!rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Address not found." });
    }

    await client.query("COMMIT");
    res.json(rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
});

// Delete an address
router.delete("/:id", async (req, res, next) => {
  try {
    const result = await pool.query(
      "DELETE FROM user_addresses WHERE id = $1 AND user_id = $2",
      [req.params.id, req.user.id]
    );

    if (!result.rowCount) {
      return res.status(404).json({ error: "Address not found." });
    }

    res.json({ message: "Address deleted successfully." });
  } catch (error) {
    next(error);
  }
});

// Set an address as default
router.patch("/:id/default", async (req, res, next) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      "UPDATE user_addresses SET is_default = FALSE WHERE user_id = $1",
      [req.user.id]
    );

    const { rows } = await client.query(
      `UPDATE user_addresses
       SET is_default = TRUE, updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [req.params.id, req.user.id]
    );

    if (!rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Address not found." });
    }

    await client.query("COMMIT");
    res.json(rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
});

export default router;