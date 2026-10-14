package com.nexusops.kb;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface KbRepository extends JpaRepository<KbArticle, Long> {
    List<KbArticle> findByStatusOrderByCreatedAtDesc(String status);
}
