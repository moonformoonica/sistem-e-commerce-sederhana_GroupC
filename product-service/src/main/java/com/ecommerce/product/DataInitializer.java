package com.ecommerce.product;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements CommandLineRunner {

    private final ProductRepository repo;

    public DataInitializer(ProductRepository repo) {
        this.repo = repo;
    }

    @Override
    public void run(String... args) {
        if (repo.count() == 0) {
            repo.save(create("Laptop", 10000000, 10));
            repo.save(create("Mouse", 150000, 50));
            repo.save(create("Keyboard", 350000, 30));
        }
    }

    private Product create(String name, int price, int stock) {
        Product p = new Product();
        p.setName(name);
        p.setPrice(price);
        p.setStock(stock);
        return p;
    }
}
