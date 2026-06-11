const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());

const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://product-service:3001';

// DB-MONGODB: Koneksi database MongoDB (Order Service)
const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongo-db:27017';
const DB_NAME = process.env.MONGO_DB || 'order_service';

// DB-MONGODB: collection "orders" (data pesanan) & "counters" (auto-increment id)
let ordersCol;
let countersCol;

// DB-MONGODB: initDatabase = buka koneksi + siapkan collection (dengan retry)
async function initDatabase(retries = 15) {
  while (retries > 0) {
    try {
      const client = new MongoClient(MONGO_URI);
      await client.connect();
      const db = client.db(DB_NAME);
      ordersCol = db.collection('orders');
      countersCol = db.collection('counters');
      console.log('[order-service] MongoDB terhubung.');
      return;
    } catch (err) {
      retries -= 1;
      console.log(`[order-service] MongoDB belum siap (${err.message}). Sisa percobaan: ${retries}`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  throw new Error('[order-service] Gagal terhubung ke MongoDB.');
}

// DB-MONGODB: nextOrderId = auto-increment id
async function nextOrderId() {
  const r = await countersCol.findOneAndUpdate(
    { _id: 'orderId' },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' }
  );
  const doc = r && r.value ? r.value : r;
  return doc.seq;
}

// ===== Routes =====

// getAllOrders | GET http://localhost:3002/orders
app.get('/orders', async (req, res) => {
  try {
    const orders = await ordersCol.find({}, { projection: { _id: 0 } }).sort({ id: 1 }).toArray();
    res.json(orders);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// getOrderById | GET http://localhost:3002/orders/1
app.get('/orders/:id', async (req, res) => {
  try {
    const order = await ordersCol.findOne({ id: parseInt(req.params.id) }, { projection: { _id: 0 } });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// createOrder | POST http://localhost:3002/orders -d '{"productId": 1, "quantity": 2}'
app.post('/orders', async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    // Cek product ke product service (REST)
    const productResponse = await axios.get(`${PRODUCT_SERVICE_URL}/products/${productId}`);
    const product = productResponse.data;

    if (product.stock < quantity) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }

    // Update stock di product service
    await axios.put(`${PRODUCT_SERVICE_URL}/products/${productId}/stock`, {
      stock: product.stock - quantity,
    });

    const id = await nextOrderId();
    const newOrder = {
      id,
      productId,
      productName: product.name,
      quantity,
      totalPrice: product.price * quantity,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    };

    await ordersCol.insertOne({ ...newOrder });
    res.status(201).json(newOrder);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// updateOrderStatus | PUT http://localhost:3002/orders/1/status -d '{"status": "shipped"}'
// status valid: confirmed | shipped | delivered | cancelled
app.put('/orders/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['confirmed', 'shipped', 'delivered', 'cancelled'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Allowed: ${allowed.join(', ')}` });
    }
    const id = parseInt(req.params.id);
    const result = await ordersCol.findOneAndUpdate(
      { id },
      { $set: { status } },
      { returnDocument: 'after', projection: { _id: 0 } }
    );
    const order = result && result.value ? result.value : result;
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// deleteOrder | DELETE http://localhost:3002/orders/1
app.delete('/orders/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = await ordersCol.deleteOne({ id });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Order not found' });
    res.json({ message: 'Order deleted', id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET http://localhost:3002/health
app.get('/health', (req, res) => {
  res.json({
    service: 'order-service',
    language: 'JavaScript',
    framework: 'Express',
    database: 'mongodb',
    status: 'running',
  });
});

initDatabase()
  .then(() => app.listen(PORT, () => console.log(`Order Service running on port ${PORT}`)))
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
