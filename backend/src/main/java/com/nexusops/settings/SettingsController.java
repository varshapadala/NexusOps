package com.nexusops.settings;

import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/settings")
public class SettingsController {

    private final SettingsRepository repository;

    public SettingsController(SettingsRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public Settings getSettings() {
        return repository.findAll().stream().findFirst().orElseGet(() -> {
            Settings initial = new Settings();
            initial.setUpdatedBy("system");
            return repository.save(initial);
        });
    }

    @PutMapping
    public Settings updateSettings(@Valid @RequestBody Settings input, Authentication auth) {
        Settings current = repository.findAll().stream().findFirst().orElseGet(Settings::new);
        if (input.getWorkspaceName() != null && !input.getWorkspaceName().isBlank()) {
            current.setWorkspaceName(input.getWorkspaceName());
        }
        if (input.getDefaultPriority() != null && !input.getDefaultPriority().isBlank()) {
            current.setDefaultPriority(input.getDefaultPriority());
        }
        if (input.getAutoRefreshSeconds() >= 0) {
            current.setAutoRefreshSeconds(input.getAutoRefreshSeconds());
        }
        current.setNotificationsEnabled(input.isNotificationsEnabled());
        if (input.getIncidentPrefix() != null && !input.getIncidentPrefix().isBlank()) {
            current.setIncidentPrefix(input.getIncidentPrefix());
        }
        if (auth != null && auth.getPrincipal() != null) {
            current.setUpdatedBy(auth.getPrincipal().toString());
        }
        return repository.save(current);
    }
}
