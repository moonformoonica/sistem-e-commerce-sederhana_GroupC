# E-Commerce Mini — Microservices (4 Bahasa Pemrograman)

Sistem e-commerce sederhana berbasis arsitektur *microservices* yang menggunakan
**4 bahasa pemrograman berbeda**, sebuah **API Gateway**, dan **frontend** statis,
seluruhnya diorkestrasi dengan **Docker Compose**.

## Daftar Service

| Service           | Bahasa / Framework        | Port (internal) | Akses via Gateway      |
|-------------------|---------------------------|-----------------|------------------------|
| frontend          | HTML / CSS / JS (Nginx)   | 80              | `http://localhost`     |
| api-gateway       | **JavaScript** (Express)  | 3000            | `http://localhost:3000`|
| product-service   | **JavaScript** (Express)  | 3001            | `/api/products`        |
| order-service     | **JavaScript** (Express)  | 3002            | `/api/orders`          |
| payment-service   | **Python** (Flask)        | 3003            | `/api/payments`        |
| shipping-service  | **PHP** (built-in server) | 3004            | `/api/shipments`       |
| graphql-gateway   | **JavaScript** (Apollo)   | 4000            | `http://localhost:4000`|

> 4 bahasa pemrograman: **JavaScript**, **Python**, **PHP**, dan **HTML/CSS** (frontend).

## GraphQL Gateway

Selain REST API Gateway, tersedia **GraphQL Gateway** (Apollo Server) di
`http://localhost:4000` yang menyatukan keempat REST service menjadi satu endpoint.

Contoh query (jalankan di Apollo Sandbox pada `http://localhost:4000`):

```graphql
query {
  products { id name price stock }
  orders {
    id productName totalPrice status
    payments { id amount status }
    shipments { id trackingNumber status }
  }
  payments { id orderId amount status }
  shipments { id orderId courier trackingNumber status }
}
```

Contoh mutation:

```graphql
mutation {
  createOrder(productId: 1, quantity: 2) { id productName totalPrice }
}

mutation {
  createPayment(orderId: 1, amount: 20000000) { id status }
}

mutation {
  createShipment(orderId: 1, address: "Jl. Contoh No. 1") { id trackingNumber status }
}
```

## Arsitektur

```
Browser ─▶ Frontend (Nginx :80) ─▶ API Gateway (JS :3000)
                                        │
        ┌───────────────┬──────────────┼───────────────┬────────────────┐
        ▼               ▼              ▼               ▼                ▼
 product-service   order-service   payment-service  shipping-service
   (JS :3001)        (JS :3002)      (Python :3003)    (PHP :3004)
                         │                │
                         └── REST ────────┘  (payment memverifikasi order)
```

Alur saat **checkout**: frontend membuat *order* (JS) → order memotong stok produk
(JS) → otomatis membuat *payment* (Python) dan *shipment* (PHP).

## Menjalankan

```bash
docker compose up -d --build
```

Buka **http://localhost** (frontend) atau **http://localhost:3000** (gateway).

## Pengujian Endpoint (via API Gateway)

```bash
# Produk (JavaScript)
curl http://localhost:3000/api/products

# Buat order (JavaScript)
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d "{\"productId\":1,\"quantity\":2}"

# Pembayaran (Python / Flask)
curl http://localhost:3000/api/payments
curl -X POST http://localhost:3000/api/payments \
  -H "Content-Type: application/json" \
  -d "{\"orderId\":1}"

# Pengiriman (PHP)
curl http://localhost:3000/api/shipments
curl -X POST http://localhost:3000/api/shipments \
  -H "Content-Type: application/json" \
  -d "{\"orderId\":1,\"address\":\"Jl. Contoh No. 1\"}"

# Status seluruh service
curl http://localhost:3000/health
```

## Menghentikan

```bash
docker compose down
```
