$ErrorActionPreference = "Stop"

# Nama container database "microservice_ecommerce_mini"
$MYSQL    = "microservice_ecommerce_mini-mysql-db-1"
$MONGO    = "microservice_ecommerce_mini-mongo-db-1"
$POSTGRES = "microservice_ecommerce_mini-postgres-db-1"
$SHIPPING = "microservice_ecommerce_mini-shipping-service-1"

Write-Host "=== [1/4] ORDER  (MongoDB) : hapus orders + reset counter ===" -ForegroundColor Cyan
docker exec $MONGO mongosh order_service --quiet --eval 'db.orders.deleteMany({}); db.counters.deleteOne({_id:''orderId''}); print(''orders tersisa: '' + db.orders.countDocuments());'
Write-Host ""

Write-Host "=== [2/4] PAYMENT (PostgreSQL) : truncate + reset id ke 1 ===" -ForegroundColor Cyan
docker exec $POSTGRES psql -U postgres -d python_service -c "TRUNCATE TABLE payments RESTART IDENTITY;"
Write-Host ""

Write-Host "=== [3/4] SHIPPING (SQLite) : hapus shipments + reset sequence ===" -ForegroundColor Cyan
docker exec $SHIPPING php -r '$p=new PDO(''sqlite:/data/shipments.sqlite'');$p->exec(''DELETE FROM shipments'');$p->exec(''DELETE FROM sqlite_sequence'');echo ''shipments tersisa: ''.$p->query(''SELECT count(*) FROM shipments'')->fetchColumn().''\n'';'
Write-Host ""

Write-Host "=== [4/4] PRODUCT (MySQL) : rapikan AUTO_INCREMENT ===" -ForegroundColor Cyan
docker exec $MYSQL mysql -uroot -proot -e "SET @next = (SELECT IFNULL(MAX(id),0)+1 FROM product_service.products); SET @sql = CONCAT('ALTER TABLE product_service.products AUTO_INCREMENT = ', @next); PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s; SELECT @next AS next_product_id;"
Write-Host ""

Write-Host "Selesai! Semua history bersih. ID berikutnya mulai dari 1." -ForegroundColor Green