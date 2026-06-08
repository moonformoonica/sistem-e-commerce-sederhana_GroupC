//  GraphQL Gateway - Apollo Server
//  Agregasi 4 fitur microservice (sesuai project mini):
//    - product-service  (JavaScript / Express) :3001  -> Produk
//    - order-service    (JavaScript / Express) :3002  -> Riwayat Pesanan
//    - payment-service  (Python / Flask)        :3003  -> Pembayaran
//    - shipping-service (PHP)                    :3004  -> Pengiriman
// ========================================================================
import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";

const PORT = Number(process.env.PORT || 4000);

const PRODUCT_SERVICE_URL =
  process.env.PRODUCT_SERVICE_URL || "http://product-service:3001";
const ORDER_SERVICE_URL =
  process.env.ORDER_SERVICE_URL || "http://order-service:3002";
const PAYMENT_SERVICE_URL =
  process.env.PAYMENT_SERVICE_URL || "http://payment-service:3003";
const SHIPPING_SERVICE_URL =
  process.env.SHIPPING_SERVICE_URL || "http://shipping-service:3004";
const LARAVEL_SERVICE_URL =
  process.env.LARAVEL_SERVICE_URL || "http://laravel-service:8000";

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || data.message || "Request ke service gagal");
  }

  return data;
}

const typeDefs = `#graphql
  type Product {
    id: ID!
    name: String
    price: Int
    stock: Int
  }

  type Order {
    id: ID!
    productId: Int
    productName: String
    quantity: Int
    totalPrice: Int
    status: String
    createdAt: String
  }

  type Payment {
    id: ID!
    orderId: Int
    amount: Float
    method: String
    status: String
    paidAt: String
  }

  type Shipment {
    id: ID!
    orderId: Int
    address: String
    courier: String
    trackingNumber: String
    status: String
    createdAt: String
  }

  type Report {
    total_report: Int
    report_type: String
    generated_by: String
  }

  type ServiceHealth {
    service: String
    language: String
    framework: String
    database: String
    status: String
  }

  type SystemStatus {
    product_service: ServiceHealth
    order_service: ServiceHealth
    payment_service: ServiceHealth
    shipping_service: ServiceHealth
    laravel_service: ServiceHealth
  }

  type Query {
    products: [Product]
    product(id: ID!): Product

    orders: [Order]
    order(id: ID!): Order

    payments: [Payment]
    payment(id: ID!): Payment

    shipments: [Shipment]
    shipment(id: ID!): Shipment

    report: Report

    systemStatus: SystemStatus
  }

  type Mutation {
    createProduct(name: String!, price: Int!, stock: Int): Product
    deleteProduct(id: ID!): Boolean
    createOrder(productId: Int!, quantity: Int!): Order
    createPayment(orderId: Int!, amount: Float): Payment
    createShipment(orderId: Int!, address: String): Shipment
  }
`;

const resolvers = {
  Query: {
    // Produk
    products: () => fetchJson(`${PRODUCT_SERVICE_URL}/products`),
    product: (_, { id }) => fetchJson(`${PRODUCT_SERVICE_URL}/products/${id}`),

    // Riwayat Pesanan
    orders: () => fetchJson(`${ORDER_SERVICE_URL}/orders`),
    order: (_, { id }) => fetchJson(`${ORDER_SERVICE_URL}/orders/${id}`),

    // Pembayaran
    payments: () => fetchJson(`${PAYMENT_SERVICE_URL}/payments`),
    payment: (_, { id }) => fetchJson(`${PAYMENT_SERVICE_URL}/payments/${id}`),

    // Pengiriman
    shipments: () => fetchJson(`${SHIPPING_SERVICE_URL}/shipments`),
    shipment: (_, { id }) =>
      fetchJson(`${SHIPPING_SERVICE_URL}/shipments/${id}`),

    // Laporan (Laravel Service)
    report: async () => {
      const result = await fetchJson(`${LARAVEL_SERVICE_URL}/report`);
      return result.data;
    },

    // Status seluruh service
    systemStatus: async () => {
      const [product, order, payment, shipping, laravel] = await Promise.all([
        fetchJson(`${PRODUCT_SERVICE_URL}/health`),
        fetchJson(`${ORDER_SERVICE_URL}/health`),
        fetchJson(`${PAYMENT_SERVICE_URL}/health`),
        fetchJson(`${SHIPPING_SERVICE_URL}/health`),
        fetchJson(`${LARAVEL_SERVICE_URL}/health`),
      ]);
      return {
        product_service: product,
        order_service: order,
        payment_service: payment,
        shipping_service: shipping,
        laravel_service: laravel,
      };
    },
  },

  Mutation: {
    createProduct: (_, { name, price, stock }) =>
      fetchJson(`${PRODUCT_SERVICE_URL}/products`, {
        method: "POST",
        body: JSON.stringify({ name, price, stock: stock ?? 0 }),
      }),

    deleteProduct: async (_, { id }) => {
      await fetchJson(`${PRODUCT_SERVICE_URL}/products/${id}`, {
        method: "DELETE",
      });
      return true;
    },

    createOrder: (_, { productId, quantity }) =>
      fetchJson(`${ORDER_SERVICE_URL}/orders`, {
        method: "POST",
        body: JSON.stringify({ productId, quantity }),
      }),

    createPayment: (_, { orderId, amount }) =>
      fetchJson(`${PAYMENT_SERVICE_URL}/payments`, {
        method: "POST",
        body: JSON.stringify({ orderId, amount }),
      }),

    createShipment: (_, { orderId, address }) =>
      fetchJson(`${SHIPPING_SERVICE_URL}/shipments`, {
        method: "POST",
        body: JSON.stringify({ orderId, address }),
      }),
  },
};

const server = new ApolloServer({ typeDefs, resolvers });

const { url } = await startStandaloneServer(server, {
  listen: { host: "0.0.0.0", port: PORT },
});

console.log(`GraphQL Gateway berjalan pada ${url}`);
