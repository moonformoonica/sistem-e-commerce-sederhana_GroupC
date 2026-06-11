<?php

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ===== DB-SQLITE: Lokasi file database SQLite (Shipping Service) =====
$DB_PATH = getenv('SQLITE_PATH') ?: '/data/shipments.sqlite';

// DB-SQLITE: db() = buka koneksi PDO + buat tabel "shipments" jika belum ada
function db($path)
{
    $dir = dirname($path);
    if (!is_dir($dir)) {
        mkdir($dir, 0775, true);
    }
    $pdo = new PDO('sqlite:' . $path);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->exec("CREATE TABLE IF NOT EXISTS shipments (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id        INTEGER NOT NULL,
        address         TEXT,
        courier         TEXT,
        tracking_number TEXT,
        status          TEXT DEFAULT 'processing',
        created_at      TEXT
    )");
    return $pdo;
}

// DB-SQLITE: map_row() = ubah baris tabel -> JSON response
function map_row($r)
{
    return [
        "id"             => (int) $r['id'],
        "orderId"        => (int) $r['order_id'],
        "address"        => $r['address'],
        "courier"        => $r['courier'],
        "trackingNumber" => $r['tracking_number'],
        "status"         => $r['status'],
        "createdAt"      => $r['created_at'],
    ];
}

try {
    $pdo = db($DB_PATH);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(["error" => "DB error: " . $e->getMessage()]);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$path = rtrim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');
if ($path === '') {
    $path = '/';
}

// Health check
if ($method === 'GET' && $path === '/health') {
    echo json_encode([
        "service" => "shipping-service",
        "language" => "PHP",
        "framework" => "PHP Built-in Server",
        "database" => "sqlite",
        "status" => "running",
    ]);
    exit;
}

// GET /shipments
if ($method === 'GET' && $path === '/shipments') {
    $rows = $pdo->query("SELECT * FROM shipments ORDER BY id")->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(array_map('map_row', $rows));
    exit;
}

// GET /shipments/track/{tracking_number}  (dicocokkan SEBELUM /shipments/{id})
if ($method === 'GET' && preg_match('#^/shipments/track/([A-Za-z0-9]+)$#', $path, $m)) {
    $stmt = $pdo->prepare("SELECT * FROM shipments WHERE tracking_number = ?");
    $stmt->execute([$m[1]]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        http_response_code(404);
        echo json_encode(["error" => "Shipment not found"]);
        exit;
    }
    echo json_encode(map_row($row));
    exit;
}

// GET /shipments/{id}
if ($method === 'GET' && preg_match('#^/shipments/(\d+)$#', $path, $m)) {
    $stmt = $pdo->prepare("SELECT * FROM shipments WHERE id = ?");
    $stmt->execute([(int) $m[1]]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        http_response_code(404);
        echo json_encode(["error" => "Shipment not found"]);
        exit;
    }
    echo json_encode(map_row($row));
    exit;
}

// POST /shipments
if ($method === 'POST' && $path === '/shipments') {
    $body = json_decode(file_get_contents('php://input'), true) ?: [];

    if (!isset($body['orderId'])) {
        http_response_code(400);
        echo json_encode(["error" => "orderId is required"]);
        exit;
    }

    $stmt = $pdo->prepare(
        "INSERT INTO shipments (order_id, address, courier, status, created_at) VALUES (?, ?, ?, ?, ?)"
    );
    $stmt->execute([
        $body['orderId'],
        $body['address'] ?? 'Default Address',
        $body['courier'] ?? 'JNE',
        'processing',
        date('c'),
    ]);

    $id = (int) $pdo->lastInsertId();
    $tracking = "TRK" . str_pad((string) $id, 6, "0", STR_PAD_LEFT);
    $pdo->prepare("UPDATE shipments SET tracking_number = ? WHERE id = ?")->execute([$tracking, $id]);

    $stmt = $pdo->prepare("SELECT * FROM shipments WHERE id = ?");
    $stmt->execute([$id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    http_response_code(201);
    echo json_encode(map_row($row));
    exit;
}

// PUT /shipments/{id}/status  (processing/shipped/delivered)
if ($method === 'PUT' && preg_match('#^/shipments/(\d+)/status$#', $path, $m)) {
    $body = json_decode(file_get_contents('php://input'), true) ?: [];
    $status = $body['status'] ?? null;
    $allowed = ['processing', 'shipped', 'delivered'];
    if (!in_array($status, $allowed, true)) {
        http_response_code(400);
        echo json_encode(["error" => "Invalid status. Allowed: " . implode(', ', $allowed)]);
        exit;
    }

    $id = (int) $m[1];
    $check = $pdo->prepare("SELECT id FROM shipments WHERE id = ?");
    $check->execute([$id]);
    if (!$check->fetch()) {
        http_response_code(404);
        echo json_encode(["error" => "Shipment not found"]);
        exit;
    }

    $pdo->prepare("UPDATE shipments SET status = ? WHERE id = ?")->execute([$status, $id]);
    $stmt = $pdo->prepare("SELECT * FROM shipments WHERE id = ?");
    $stmt->execute([$id]);
    echo json_encode(map_row($stmt->fetch(PDO::FETCH_ASSOC)));
    exit;
}

http_response_code(404);
echo json_encode(["error" => "Not found", "path" => $path]);
