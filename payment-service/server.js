const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { Pool } = require("pg");

const app = express();
const PORT = 3003;

app.use(cors());
app.use(express.json());

const ORDER_SERVICE_URL =
  process.env.ORDER_SERVICE_URL || "http://order-service:3002";

// DB-POSTGRESQL: Koneksi database PostgreSQL (Payment Service)
const pool = new Pool({
  host: process.env.DB_HOST || "postgres-db",
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || "python_service",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
});

// DB-POSTGRESQL: initDatabase= buat tabel "payments" kalau belum ada (dengan retry)
async function initDatabase(retries = 15) {
  while (retries > 0) {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS payments (
          id        SERIAL PRIMARY KEY,
          order_id  INTEGER NOT NULL,
          amount    NUMERIC DEFAULT 0,
          method    VARCHAR(50) DEFAULT 'transfer',
          status    VARCHAR(50) DEFAULT 'paid',
          paid_at   TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log(
        "[payment-service] PostgreSQL terhubung & tabel payments siap.",
      );
      return;
    } catch (err) {
      retries -= 1;
      console.log(
        `[payment-service] PostgreSQL belum siap (${err.message}). Sisa percobaan: ${retries}`,
      );
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  throw new Error("[payment-service] Gagal terhubung ke PostgreSQL.");
}

// DB-POSTGRESQL: rowToPayment= ubah baris tabel -> JSON response
function rowToPayment(r) {
  return {
    id: r.id,
    orderId: r.order_id,
    amount: r.amount !== null ? Number(r.amount) : 0,
    method: r.method,
    status: r.status,
    paidAt: r.paid_at ? new Date(r.paid_at).toISOString() : null,
  };
}

// listPayments | GET http://localhost:3003/payments
app.get("/payments", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, order_id, amount, method, status, paid_at FROM payments ORDER BY id DESC",
    );
    res.json(result.rows.map(rowToPayment));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// getPaymentByOrder | GET http://localhost:3003/payments/order/1
// Didefinisikan SEBELUM /payments
app.get("/payments/order/:orderId", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, order_id, amount, method, status, paid_at FROM payments WHERE order_id = $1 ORDER BY id DESC LIMIT 1",
      [parseInt(req.params.orderId)],
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Payment not found" });
    res.json(rowToPayment(result.rows[0]));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// getPaymentById | GET http://localhost:3003/payments/1
app.get("/payments/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, order_id, amount, method, status, paid_at FROM payments WHERE id = $1",
      [parseInt(req.params.id)],
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Payment not found" });
    res.json(rowToPayment(result.rows[0]));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// createPayment | POST http://localhost:3003/payments
app.post("/payments", async (req, res) => {
  try {
    const { orderId, method = "transfer" } = req.body;
    let { amount } = req.body;

    if (orderId === undefined || orderId === null) {
      return res.status(400).json({ error: "orderId is required" });
    }

    // Kalau amount tidak dikirim, ambil dari Order Service (REST)
    if (amount === undefined || amount === null) {
      try {
        const resp = await axios.get(`${ORDER_SERVICE_URL}/orders/${orderId}`, {
          timeout: 5000,
        });
        amount = resp.data.totalPrice || 0;
      } catch (err) {
        if (err.response && err.response.status === 404) {
          return res.status(404).json({ error: "Order not found" });
        }
        return res.status(502).json({ error: "Failed to reach order service" });
      }
    }

    const result = await pool.query(
      "INSERT INTO payments (order_id, amount, method, status) VALUES ($1, $2, $3, $4) RETURNING id, order_id, amount, method, status, paid_at",
      [orderId, amount, method, "paid"],
    );
    res.status(201).json(rowToPayment(result.rows[0]));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// updatePaymentStatus | PUT http://localhost:3003/payments/1/status
// status valid: paid | pending | refunded
app.put("/payments/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ["paid", "pending", "refunded"];
    if (!allowed.includes(status)) {
      return res
        .status(400)
        .json({ error: `Invalid status. Allowed: ${allowed.join(", ")}` });
    }
    const result = await pool.query(
      "UPDATE payments SET status = $1 WHERE id = $2 RETURNING id, order_id, amount, method, status, paid_at",
      [status, parseInt(req.params.id)],
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Payment not found" });
    res.json(rowToPayment(result.rows[0]));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// health | GET http://localhost:3003/health
app.get("/health", (req, res) => {
  res.json({
    service: "payment-service",
    language: "JavaScript",
    framework: "Express",
    database: "postgresql",
    status: "running",
  });
});

initDatabase()
  .then(() =>
    app.listen(PORT, () =>
      console.log(`Payment Service running on port ${PORT}`),
    ),
  )
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
