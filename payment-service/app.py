import os
import time

import requests
import psycopg2
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

PORT = int(os.getenv("PORT", 3003))
ORDER_SERVICE_URL = os.getenv("ORDER_SERVICE_URL", "http://order-service:3002")

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "postgres-db"),
    "port": int(os.getenv("DB_PORT", 5432)),
    "dbname": os.getenv("DB_NAME", "python_service"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD", "postgres"),
}


def get_conn():
    return psycopg2.connect(**DB_CONFIG)


def init_db(retries=15):
    while retries > 0:
        try:
            conn = get_conn()
            cur = conn.cursor()
            cur.execute("""
                CREATE TABLE IF NOT EXISTS payments (
                    id        SERIAL PRIMARY KEY,
                    order_id  INTEGER NOT NULL,
                    amount    NUMERIC DEFAULT 0,
                    method    VARCHAR(50) DEFAULT 'transfer',
                    status    VARCHAR(50) DEFAULT 'paid',
                    paid_at   TIMESTAMP DEFAULT NOW()
                )
            """)
            conn.commit()
            cur.close()
            conn.close()
            print("[payment-service] PostgreSQL terhubung & tabel payments siap.")
            return
        except Exception as e:  # noqa: BLE001
            retries -= 1
            print(f"[payment-service] PostgreSQL belum siap ({e}). Sisa percobaan: {retries}")
            time.sleep(3)
    raise RuntimeError("[payment-service] Gagal terhubung ke PostgreSQL.")


def row_to_payment(r):
    return {
        "id": r[0],
        "orderId": r[1],
        "amount": float(r[2]) if r[2] is not None else 0,
        "method": r[3],
        "status": r[4],
        "paidAt": r[5].isoformat() + "Z" if r[5] else None,
    }


@app.route("/payments", methods=["GET"])
def list_payments():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT id, order_id, amount, method, status, paid_at FROM payments ORDER BY id DESC")
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify([row_to_payment(r) for r in rows])


@app.route("/payments/<int:payment_id>", methods=["GET"])
def get_payment(payment_id):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT id, order_id, amount, method, status, paid_at FROM payments WHERE id = %s", (payment_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()
    if not row:
        return jsonify({"error": "Payment not found"}), 404
    return jsonify(row_to_payment(row))


@app.route("/payments", methods=["POST"])
def create_payment():
    data = request.get_json(silent=True) or {}

    order_id = data.get("orderId")
    amount = data.get("amount")
    method = data.get("method", "transfer")

    if order_id is None:
        return jsonify({"error": "orderId is required"}), 400

    # KALOOO amount ga dikirim, ambil dari Order Service
    if amount is None:
        try:
            resp = requests.get(f"{ORDER_SERVICE_URL}/orders/{order_id}", timeout=5)
            if resp.status_code != 200:
                return jsonify({"error": "Order not found"}), 404
            amount = resp.json().get("totalPrice", 0)
        except requests.RequestException:
            return jsonify({"error": "Failed to reach order service"}), 502

    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO payments (order_id, amount, method, status) VALUES (%s, %s, %s, %s) RETURNING id, order_id, amount, method, status, paid_at",
        (order_id, amount, method, "paid"),
    )
    row = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()
    return jsonify(row_to_payment(row)), 201


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "service": "payment-service",
        "language": "Python",
        "framework": "Flask",
        "database": "postgresql",
        "status": "running",
    })


if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=PORT)
