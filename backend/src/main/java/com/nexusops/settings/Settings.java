package com.nexusops.settings;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "system_settings")
public class Settings {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String workspaceName = "NexusOps Workspace";

    @Column(nullable = false, length = 20)
    private String defaultPriority = "MEDIUM";

    @Column(nullable = false)
    private int autoRefreshSeconds = 30;

    @Column(nullable = false)
    private boolean notificationsEnabled = true;

    @Column(nullable = false, length = 10)
    private String incidentPrefix = "INC";

    @Column(length = 100)
    private String updatedBy;

    private LocalDateTime updatedAt;

    public Settings() {}

    @PrePersist
    @PreUpdate
    public void onSave() {
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getWorkspaceName() { return workspaceName; }
    public void setWorkspaceName(String workspaceName) { this.workspaceName = workspaceName; }
    public String getDefaultPriority() { return defaultPriority; }
    public void setDefaultPriority(String defaultPriority) { this.defaultPriority = defaultPriority; }
    public int getAutoRefreshSeconds() { return autoRefreshSeconds; }
    public void setAutoRefreshSeconds(int autoRefreshSeconds) { this.autoRefreshSeconds = autoRefreshSeconds; }
    public boolean isNotificationsEnabled() { return notificationsEnabled; }
    public void setNotificationsEnabled(boolean notificationsEnabled) { this.notificationsEnabled = notificationsEnabled; }
    public String getIncidentPrefix() { return incidentPrefix; }
    public void setIncidentPrefix(String incidentPrefix) { this.incidentPrefix = incidentPrefix; }
    public String getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(String updatedBy) { this.updatedBy = updatedBy; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
