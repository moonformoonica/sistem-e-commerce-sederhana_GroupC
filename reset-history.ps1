$ErrorActionPreference = "Stop"

# Nama container database "microservice_ecommerce_mini"
$MYSQL    = "microservice_ecommerce_mini-mysql-db-1"
$MONGO    = "microservice_ecommerce_mini-mongo-db-1"
$POSTGRES = "microservice_ecommerce_mini-postgres-db-1"
$SHIPPING = "microservice_ecommerce_mini-shipping-service-1"
$PRODUCT  = "microservice_ecommerce_mini-product-service-1"

Write-Host "=== [1/4] ORDER  (MongoDB) : hapus orders + reset counter ===" -ForegroundColor Cyan
docker exec $MONGO mongosh order_service --quiet --eval 'db.orders.deleteMany({}); db.counters.deleteOne({_id:''orderId''}); print(''orders tersisa: '' + db.orders.countDocuments());'
Write-Host ""

Write-Host "=== [2/4] PAYMENT (PostgreSQL) : truncate + reset id ke 1 ===" -ForegroundColor Cyan
docker exec $POSTGRES psql -U postgres -d python_service -c "TRUNCATE TABLE payments RESTART IDENTITY;"
Write-Host ""

Write-Host "=== [3/4] SHIPPING (SQLite) : hapus shipments + reset sequence ===" -ForegroundColor Cyan
docker exec $SHIPPING php -r '$p=new PDO(''sqlite:/data/shipments.sqlite'');$p->exec(''DELETE FROM shipments'');$p->exec(''DELETE FROM sqlite_sequence'');echo ''shipments tersisa: ''.$p->query(''SELECT count(*) FROM shipments'')->fetchColumn().PHP_EOL;'
Write-Host ""

Write-Host "=== [4/4] PRODUCT (MySQL) : RESET TOTAL -> seed ulang produk 1-5 ===" -ForegroundColor Cyan
# 1) Kosongkan tabel produk (sekaligus reset AUTO_INCREMENT ke 1)
docker exec $MYSQL mysql -uroot -proot -e "TRUNCATE TABLE product_service.products;"
# 2) Restart product-service. Saat start, DataInitializer.java melihat tabel kosong
#    (count == 0) lalu seed ulang 5 produk: Laptop, Mouse, Keyboard, Webcam HD, Headphone (ID 1-5)
Write-Host "    Restart product-service & menunggu seed ulang..." -ForegroundColor DarkGray
docker restart $PRODUCT | Out-Null

# 3) Tunggu sampai produk ter-seed (poll lewat API Gateway, maks ~60 detik)
$ok = $false
for ($i = 0; $i -lt 20; $i++) {
    Start-Sleep -Seconds 3
    try {
        $products = Invoke-RestMethod -Uri "http://localhost:8000/api/products" -TimeoutSec 4
        if ($products.Count -ge 5) { $ok = $true; break }
    } catch { }
}
if ($ok) {
    Write-Host "    Produk berhasil di-seed ulang:" -ForegroundColor Green
    $products | ForEach-Object { Write-Host ("      ID {0} : {1}" -f $_.id, $_.name) }
} else {
    Write-Host "    (!) Produk belum muncul. Cek manual: docker logs $PRODUCT" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "Selesai! Semua history bersih & produk reset ke ID 1-5." -ForegroundColor Green