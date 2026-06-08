package com.ecommerce.product;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@CrossOrigin(origins = "*")
public class ProductController {

    private final ProductRepository repo;

    public ProductController(ProductRepository repo) {
        this.repo = repo;
    }

    // GET /products
    @GetMapping("/products")
    public List<Product> all() {
        return repo.findAll();
    }

    // GET /products/{id}
    @SuppressWarnings("null")
    @GetMapping("/products/{id}")
    public ResponseEntity<?> one(@PathVariable Long id) {
        return repo.findById(id)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(404).body(Map.of("error", "Product not found")));
    }

    // POST /products
    @PostMapping("/products")
    public ResponseEntity<Product> create(@RequestBody Product p) {
        if (p.getStock() == null) {
            p.setStock(0);
        }
        return ResponseEntity.status(201).body(repo.save(p));
    }

    // PUT /products/{id}/stock  (dipanggil sm Order Service)
    @SuppressWarnings("null")
    @PutMapping("/products/{id}/stock")
    public ResponseEntity<?> updateStock(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return repo.findById(id)
                .<ResponseEntity<?>>map(p -> {
                    p.setStock(((Number) body.get("stock")).intValue());
                    return ResponseEntity.ok(repo.save(p));
                })
                .orElseGet(() -> ResponseEntity.status(404).body(Map.of("error", "Product not found")));
    }

    // DELETE /products/{id}
    @SuppressWarnings("null")
    @DeleteMapping("/products/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        if (!repo.existsById(id)) {
            return ResponseEntity.status(404).body(Map.of("error", "Product not found"));
        }
        repo.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Product deleted", "id", id));
    }

    // GET /health
    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of(
                "service", "product-service",
                "language", "Java",
                "framework", "Spring Boot",
                "database", "mysql",
                "status", "running");
    }
}