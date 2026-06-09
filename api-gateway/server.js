const express = require("express");
const cors = require("cors");
const {
  createProxyMiddleware,
  fixRequestBody,
} = require("http-proxy-middleware");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Middleware for loggin'
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Main Page (status JSON; halaman HTML dipindah ke frontend/gateway-status.html)
app.get("/", (req, res) => {
  res.json({ service: "api-gateway", status: "running" });
});

// Proxy ke product service
app.use(
  "/api/products",
  createProxyMiddleware({
    target: "http://product-service:3001",
    changeOrigin: true,
    onProxyReq: fixRequestBody,
    pathRewrite: {
      "^/api/products": "/products",
    },
  }),
);

// Proxy ke order service
app.use(
  "/api/orders",
  createProxyMiddleware({
    target: "http://order-service:3002",
    changeOrigin: true,
    onProxyReq: fixRequestBody,
    pathRewrite: {
      "^/api/orders": "/orders",
    },
  }),
);

// Proxy ke payment service (Python / Flask)
app.use(
  "/api/payments",
  createProxyMiddleware({
    target: "http://payment-service:3003",
    changeOrigin: true,
    onProxyReq: fixRequestBody,
    pathRewrite: {
      "^/api/payments": "/payments",
    },
  }),
);

// Proxy ke shipping service (PHP)
app.use(
  "/api/shipments",
  createProxyMiddleware({
    target: "http://shipping-service:3004",
    changeOrigin: true,
    onProxyReq: fixRequestBody,
    pathRewrite: {
      "^/api/shipments": "/shipments",
    },
  }),
);

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    services: ["product", "order", "payment", "shipping"],
  });
});

app.listen(PORT, () => {
  console.log(`API Gateway running on http://localhost:${PORT}`);
  console.log(`Product API: http://localhost:${PORT}/api/products`);
  console.log(`Order API: http://localhost:${PORT}/api/orders`);
});
