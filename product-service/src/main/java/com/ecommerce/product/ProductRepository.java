package com.ecommerce.product;

import org.springframework.data.jpa.repository.JpaRepository;

// DB-MYSQL: Repository = (findAll, save, deleteById, dll)
public interface ProductRepository extends JpaRepository<Product, Long> {
}
