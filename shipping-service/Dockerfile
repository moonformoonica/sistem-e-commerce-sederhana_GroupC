FROM php:8.2-cli-alpine
WORKDIR /app
COPY . .
EXPOSE 3004
# Jalanin PHP built-in web server pake index.php as a router
CMD ["php", "-S", "0.0.0.0:3004", "index.php"]
