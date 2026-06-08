const express = require('express');
const cors = require('cors');
const { createProxyMiddleware, fixRequestBody } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Middleware for loggin'
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Main Page
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>E-Commerce Microservices</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                max-width: 800px;
                margin: 50px auto;
                padding: 20px;
                background: #f5f5f5;
            }
            .container {
                background: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            h1 { color: #333; }
            .endpoint {
                background: #e9ecef;
                padding: 10px;
                margin: 10px 0;
                border-radius: 5px;
                font-family: monospace;
            }
            .method {
                display: inline-block;
                padding: 3px 8px;
                border-radius: 3px;
                font-weight: bold;
                margin-right: 10px;
            }
            .get { background: #28a745; color: white; }
            .post { background: #007bff; color: white; }
            input, button {
                padding: 8px;
                margin: 5px;
            }
            button {
                background: #007bff;
                color: white;
                border: none;
                cursor: pointer;
                border-radius: 3px;
            }
            button:hover { background: #0056b3; }
            pre {
                background: #f4f4f4;
                padding: 10px;
                border-radius: 5px;
                overflow-x: auto;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🛒 E-Commerce Microservices Demo</h1>
            <p>Sistem microservices polyglot (4 bahasa backend) via API Gateway (JavaScript / Express):</p>
            <ul style="line-height:1.8">
                <li><b>Product Service</b> — Java / Spring Boot + <b>MySQL</b></li>
                <li><b>Order Service</b> — JavaScript / Express + <b>MongoDB</b></li>
                <li><b>Payment Service</b> — Python / Flask + <b>PostgreSQL</b></li>
                <li><b>Shipping Service</b> — PHP + <b>SQLite</b></li>
                <li><b>Laravel Service</b> — PHP / Laravel + <b>SQLite</b> (endpoint <code>/report</code>)</li>
            </ul>
            
            <h2>📋 Available Endpoints:</h2>
            <div class="endpoint">
                <span class="method get">GET</span> /api/products - Get all products <i>(Java / Spring Boot + MySQL)</i>
            </div>
            <div class="endpoint">
                <span class="method get">GET</span> /api/products/{id} - Get product by ID <i>(Java / Spring Boot + MySQL)</i>
            </div>
            <div class="endpoint">
                <span class="method post">POST</span> /api/products - Create product <i>(Java / Spring Boot + MySQL)</i>
            </div>
            <div class="endpoint">
                <span class="method post">DELETE</span> /api/products/{id} - Delete product <i>(Java / Spring Boot + MySQL)</i>
            </div>
            <div class="endpoint">
                <span class="method post">POST</span> /api/orders - Create new order <i>(JavaScript / Express + MongoDB)</i>
            </div>
            <div class="endpoint">
                <span class="method get">GET</span> /api/orders - Get all orders <i>(JavaScript / Express + MongoDB)</i>
            </div>
            <div class="endpoint">
                <span class="method post">POST</span> /api/payments - Create payment <i>(Python / Flask + PostgreSQL)</i>
            </div>
            <div class="endpoint">
                <span class="method get">GET</span> /api/payments - Get all payments <i>(Python / Flask + PostgreSQL)</i>
            </div>
            <div class="endpoint">
                <span class="method post">POST</span> /api/shipments - Create shipment <i>(PHP + SQLite)</i>
            </div>
            <div class="endpoint">
                <span class="method get">GET</span> /api/shipments - Get all shipments <i>(PHP + SQLite)</i>
            </div>
            <div class="endpoint">
                <span class="method get">GET</span> /api/report - Laporan <i>(PHP / Laravel + SQLite)</i>
            </div>
            <div class="endpoint">
                <span class="method get">GET</span> /health - Check services health
            </div>

            <h2>📦 Products</h2>
            <button onclick="loadProducts()">Load Products</button>
            <pre id="products">Click button to load products...</pre>

            <h2>🛍️ Create Order</h2>
            Product ID: <input type="number" id="productId" placeholder="1, 2, or 3"><br>
            Quantity: <input type="number" id="quantity" placeholder="quantity"><br>
            <button onclick="createOrder()">Create Order</button>
            <pre id="orderResult"></pre>

            <h2>📝 Orders</h2>
            <button onclick="loadOrders()">Load Orders</button>
            <pre id="orders">Click button to load orders...</pre>
        </div>

        <script>
            async function loadProducts() {
                try {
                    const response = await fetch('/api/products');
                    const data = await response.json();
                    document.getElementById('products').textContent = JSON.stringify(data, null, 2);
                } catch (error) {
                    document.getElementById('products').textContent = 'Error: ' + error.message;
                }
            }

            async function createOrder() {
                const productId = document.getElementById('productId').value;
                const quantity = document.getElementById('quantity').value;
                
                try {
                    const response = await fetch('/api/orders', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ productId: parseInt(productId), quantity: parseInt(quantity) })
                    });
                    const data = await response.json();
                    document.getElementById('orderResult').textContent = JSON.stringify(data, null, 2);
                    if (response.ok) {
                        loadProducts(); // Refresh products to see stock changes
                        loadOrders();   // Refresh orders
                    }
                } catch (error) {
                    document.getElementById('orderResult').textContent = 'Error: ' + error.message;
                }
            }

            async function loadOrders() {
                try {
                    const response = await fetch('/api/orders');
                    const data = await response.json();
                    document.getElementById('orders').textContent = JSON.stringify(data, null, 2);
                } catch (error) {
                    document.getElementById('orders').textContent = 'Error: ' + error.message;
                }
            }

            // Auto load products on page load
            loadProducts();
            loadOrders();
        </script>
    </body>
    </html>
  `);
});

// Proxy ke product service
app.use('/api/products', createProxyMiddleware({
  target: 'http://product-service:3001',
  changeOrigin: true,
  onProxyReq: fixRequestBody,
  pathRewrite: {
    '^/api/products': '/products'
  }
}));

// Proxy ke order service
app.use('/api/orders', createProxyMiddleware({
  target: 'http://order-service:3002',
  changeOrigin: true,
  onProxyReq: fixRequestBody,
  pathRewrite: {
    '^/api/orders': '/orders'
  }
}));

// Proxy ke payment service (Python / Flask)
app.use('/api/payments', createProxyMiddleware({
  target: 'http://payment-service:3003',
  changeOrigin: true,
  onProxyReq: fixRequestBody,
  pathRewrite: {
    '^/api/payments': '/payments'
  }
}));

// Proxy ke shipping service (PHP)
app.use('/api/shipments', createProxyMiddleware({
  target: 'http://shipping-service:3004',
  changeOrigin: true,
  onProxyReq: fixRequestBody,
  pathRewrite: {
    '^/api/shipments': '/shipments'
  }
}));

// Proxy ke Laravel service (PHP) - endpoint /report (sesuai modul)
const LARAVEL_SERVICE_URL = process.env.LARAVEL_SERVICE_URL || 'http://laravel-service:8000';

app.use('/api/report', createProxyMiddleware({
  target: LARAVEL_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/api/report': '/report'
  }
}));

app.use('/report', createProxyMiddleware({
  target: LARAVEL_SERVICE_URL,
  changeOrigin: true
}));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', services: ['product', 'order', 'payment', 'shipping', 'laravel'] });
});

app.listen(PORT, () => {
  console.log(`API Gateway running on http://localhost:${PORT}`);
  console.log(`Product API: http://localhost:${PORT}/api/products`);
  console.log(`Order API: http://localhost:${PORT}/api/orders`);
});
