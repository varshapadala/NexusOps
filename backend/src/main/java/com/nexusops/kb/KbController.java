package com.nexusops.kb;

import com.nexusops.user.UserRepository;
import jakarta.validation.Valid;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/kb")
public class KbController {

    private final KbRepository repository;
    private final UserRepository userRepository;

    public KbController(KbRepository repository, UserRepository userRepository) {
        this.repository = repository;
        this.userRepository = userRepository;
    }

    @GetMapping
    public List<KbArticle> getAll(@RequestParam(required = false) String search,
                                   @RequestParam(required = false) String status) {
        List<KbArticle> articles;
        if (status != null && !status.isBlank()) {
            articles = repository.findByStatusOrderByCreatedAtDesc(status);
        } else {
            articles = repository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
        }
        if (search != null && !search.isBlank()) {
            String term = search.toLowerCase();
            articles = articles.stream()
                    .filter(a -> (a.getTitle() != null && a.getTitle().toLowerCase().contains(term))
                            || (a.getContent() != null && a.getContent().toLowerCase().contains(term))
                            || (a.getCategory() != null && a.getCategory().toLowerCase().contains(term)))
                    .toList();
        }
        return articles;
    }

    @GetMapping("/{id}")
    public ResponseEntity<KbArticle> getOne(@PathVariable Long id) {
        return repository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public KbArticle create(@Valid @RequestBody KbArticle article, Authentication auth) {
        article.setId(null);
        if (auth != null) {
            String email = (String) auth.getPrincipal();
            String displayName = userRepository.findByEmail(email)
                    .map(u -> u.getName())
                    .orElse(email);
            article.setAuthor(displayName);
        }
        return repository.save(article);
    }

    @PutMapping("/{id}")
    public ResponseEntity<KbArticle> update(@PathVariable Long id, @Valid @RequestBody KbArticle input) {
        return repository.findById(id)
                .map(a -> {
                    a.setTitle(input.getTitle());
                    a.setContent(input.getContent());
                    a.setCategory(input.getCategory());
                    a.setStatus(input.getStatus());
                    return ResponseEntity.ok(repository.save(a));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public ResponseEntity<?> delete(@PathVariable Long id) {
        if (!repository.existsById(id)) return ResponseEntity.notFound().build();
        repository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
