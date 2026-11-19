import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { pool } from "./config/db.js";
import productsRouter from "./routes/products.js";
import uploadsRouter from "./routes/uploads.js";
import paymentsRouter from "./routes/payments.js";
import authRouter from "./routes/auth.js";
import ordersRouter from "./routes/orders.js";
import adminRouter from "./routes/admin.js";
import reviewsRouter from "./routes/reviews.js";
import addressesRouter from "./routes/addresses.js";
import notificationsRouter from "./routes/notifications.js";

const app = express();
const port = Number(process.env.PORT || 5000);
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error("Set JWT_SECRET to a random string of at least 32 characters in backend/.env");
  process.exit(1);
}
app.use(helmet());
const allowedOrigins = [
  "http://localhost:5173",
  "http://192.168.56.1:5173"
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json({ limit: "1mb" }));
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: process.env.NODE_ENV === "production" ? 300 : 3000,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: "Too many requests. Please try again later."
  }
});

app.use("/api/", apiLimiter);
app.get("/api/health", async (_req, res) => {
  try { await pool.query("SELECT 1"); res.json({ status: "ok", database: "connected" }); }
  catch { res.status(503).json({ status: "degraded", database: "unavailable" }); }
});
app.use("/api/products", productsRouter);
app.use("/api/uploads", uploadsRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/auth", authRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/admin", adminRouter);
app.use("/api/reviews", reviewsRouter);
app.use("/api/addresses", addressesRouter);
app.use("/api/notifications", notificationsRouter);
app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: "Something went wrong on the server." });
});
app.listen(port, () => console.log(`Virtual Mall API listening at http://localhost:${port}`));
