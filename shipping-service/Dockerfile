FROM php:8.2-cli-alpine
WORKDIR /app
COPY . .
EXPOSE 3004
# Menjalankan PHP built-in web server dengan index.php sebagai router
CMD ["php", "-S", "0.0.0.0:3004", "index.php"]
