//  GraphQL Gateway - Apollo Server
//  Agregasi 4 service microservice:
//    - product-service  (Java / Spring Boot) :3001  -> Produk
//    - order-service    (JavaScript / Express) :3002  -> Pesanan
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
  }

  type Query {
    products: [Product]
    product(id: ID!): Product

    orders: [Order]
    order(id: ID!): Order

    payments: [Payment]
    payment(id: ID!): Payment
    paymentByOrder(orderId: Int!): Payment

    shipments: [Shipment]
    shipment(id: ID!): Shipment
    shipmentByTracking(trackingNumber: String!): Shipment

    systemStatus: SystemStatus
  }

  type Mutation {
    createProduct(name: String!, price: Int!, stock: Int): Product
    updateProduct(id: ID!, name: String, price: Int, stock: Int): Product
    deleteProduct(id: ID!): Boolean

    createOrder(productId: Int!, quantity: Int!): Order
    updateOrderStatus(id: ID!, status: String!): Order

    createPayment(orderId: Int!, amount: Float): Payment
    updatePaymentStatus(id: ID!, status: String!): Payment

    createShipment(orderId: Int!, address: String): Shipment
    updateShipmentStatus(id: ID!, status: String!): Shipment
  }
`;

const resolvers = {
  Query: {
    // Produk
    products: () => fetchJson(`${PRODUCT_SERVICE_URL}/products`),
    product: (_, { id }) => fetchJson(`${PRODUCT_SERVICE_URL}/products/${id}`),

    // Pesanan
    orders: () => fetchJson(`${ORDER_SERVICE_URL}/orders`),
    order: (_, { id }) => fetchJson(`${ORDER_SERVICE_URL}/orders/${id}`),

    // Pembayaran
    payments: () => fetchJson(`${PAYMENT_SERVICE_URL}/payments`),
    payment: (_, { id }) => fetchJson(`${PAYMENT_SERVICE_URL}/payments/${id}`),
    paymentByOrder: (_, { orderId }) =>
      fetchJson(`${PAYMENT_SERVICE_URL}/payments/order/${orderId}`),

    // Pengiriman
    shipments: () => fetchJson(`${SHIPPING_SERVICE_URL}/shipments`),
    shipment: (_, { id }) =>
      fetchJson(`${SHIPPING_SERVICE_URL}/shipments/${id}`),
    shipmentByTracking: (_, { trackingNumber }) =>
      fetchJson(`${SHIPPING_SERVICE_URL}/shipments/track/${trackingNumber}`),

    // Status seluruh service (4 service)
    systemStatus: async () => {
      const [product, order, payment, shipping] = await Promise.all([
        fetchJson(`${PRODUCT_SERVICE_URL}/health`),
        fetchJson(`${ORDER_SERVICE_URL}/health`),
        fetchJson(`${PAYMENT_SERVICE_URL}/health`),
        fetchJson(`${SHIPPING_SERVICE_URL}/health`),
      ]);
      return {
        product_service: product,
        order_service: order,
        payment_service: payment,
        shipping_service: shipping,
      };
    },
  },

  Mutation: {
    // Produk
    createProduct: (_, { name, price, stock }) =>
      fetchJson(`${PRODUCT_SERVICE_URL}/products`, {
        method: "POST",
        body: JSON.stringify({ name, price, stock: stock ?? 0 }),
      }),

    updateProduct: (_, { id, name, price, stock }) =>
      fetchJson(`${PRODUCT_SERVICE_URL}/products/${id}`, {
        method: "PUT",
        body: JSON.stringify({ name, price, stock }),
      }),

    deleteProduct: async (_, { id }) => {
      await fetchJson(`${PRODUCT_SERVICE_URL}/products/${id}`, {
        method: "DELETE",
      });
      return true;
    },

    // Pesanan
    createOrder: (_, { productId, quantity }) =>
      fetchJson(`${ORDER_SERVICE_URL}/orders`, {
        method: "POST",
        body: JSON.stringify({ productId, quantity }),
      }),

    updateOrderStatus: (_, { id, status }) =>
      fetchJson(`${ORDER_SERVICE_URL}/orders/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      }),

    // Pembayaran
    createPayment: (_, { orderId, amount }) =>
      fetchJson(`${PAYMENT_SERVICE_URL}/payments`, {
        method: "POST",
        body: JSON.stringify({ orderId, amount }),
      }),

    updatePaymentStatus: (_, { id, status }) =>
      fetchJson(`${PAYMENT_SERVICE_URL}/payments/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      }),

    // Pengiriman
    createShipment: (_, { orderId, address }) =>
      fetchJson(`${SHIPPING_SERVICE_URL}/shipments`, {
        method: "POST",
        body: JSON.stringify({ orderId, address }),
      }),

    updateShipmentStatus: (_, { id, status }) =>
      fetchJson(`${SHIPPING_SERVICE_URL}/shipments/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      }),
  },
};

const server = new ApolloServer({ typeDefs, resolvers });

const { url } = await startStandaloneServer(server, {
  listen: { host: "0.0.0.0", port: PORT },
});

console.log(`GraphQL Gateway berjalan pada ${url}`);
