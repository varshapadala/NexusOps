package com.nexusops.incident;

import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Map;

@Service
public class IncidentService {
    private final IncidentRepository repository;

    public IncidentService(IncidentRepository repository) {
        this.repository = repository;
    }

    public List<Incident> findAll(String search, String status, String priority) {
        return findAll(search, status, priority, null);
    }

    public List<Incident> findAll(String search, String status, String priority, String assignedTo) {
        List<Incident> incidents = repository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
        if (status != null && !status.isBlank()) {
            incidents = incidents.stream().filter(i -> status.equalsIgnoreCase(i.getStatus())).toList();
        }
        if (priority != null && !priority.isBlank()) {
            incidents = incidents.stream().filter(i -> priority.equalsIgnoreCase(i.getPriority())).toList();
        }
        if (assignedTo != null && !assignedTo.isBlank()) {
            incidents = incidents.stream().filter(i -> assignedTo.equalsIgnoreCase(i.getAssignedTo())).toList();
        }
        if (search != null && !search.isBlank()) {
            String term = search.trim().toLowerCase();
            incidents = incidents.stream()
                    .filter(i -> safe(i.getTitle()).contains(term)
                            || safe(i.getDescription()).contains(term)
                            || safe(i.getCategory()).contains(term)
                            || safe(i.getStatus()).contains(term)
                            || safe(i.getAssignedTo()).contains(term))
                    .toList();
        }
        return incidents;
    }

    public Incident findById(Long id) {
        return repository.findById(id).orElseThrow(() -> new IncidentNotFoundException(id));
    }

    private String safe(String value) {
        return value == null ? "" : value.toLowerCase();
    }

    public Incident create(Incident incident) {
        incident.setId(null);
        return repository.save(incident);
    }

    public Incident update(Long id, Incident input) {
        Incident current = repository.findById(id)
                .orElseThrow(() -> new IncidentNotFoundException(id));
        current.setTitle(input.getTitle());
        current.setDescription(input.getDescription());
        current.setCategory(input.getCategory());
        current.setPriority(input.getPriority());
        current.setStatus(input.getStatus());
        current.setAssignedTo(input.getAssignedTo());
        return repository.save(current);
    }

    public Incident updateStatus(Long id, String status) {
        Incident current = repository.findById(id)
                .orElseThrow(() -> new IncidentNotFoundException(id));
        current.setStatus(status);
        return repository.save(current);
    }

    public Incident updateAssignee(Long id, String assignedTo) {
        Incident current = repository.findById(id)
                .orElseThrow(() -> new IncidentNotFoundException(id));
        current.setAssignedTo(assignedTo);
        return repository.save(current);
    }

    public void delete(Long id) {
        if (!repository.existsById(id)) throw new IncidentNotFoundException(id);
        repository.deleteById(id);
    }

    public long count() {
        return repository.count();
    }

    public Map<String, Long> summary() {
        List<Incident> all = repository.findAll();
        long total = all.size();
        long open = all.stream().filter(i -> "OPEN".equals(i.getStatus())).count();
        long inProgress = all.stream().filter(i -> "IN_PROGRESS".equals(i.getStatus())).count();
        long resolved = all.stream().filter(i -> "RESOLVED".equals(i.getStatus())).count();
        long closed = all.stream().filter(i -> "CLOSED".equals(i.getStatus())).count();
        long critical = all.stream().filter(i -> "CRITICAL".equals(i.getPriority())).count();
        long high = all.stream().filter(i -> "HIGH".equals(i.getPriority())).count();
        return Map.of(
            "total", total, "open", open, "inProgress", inProgress,
            "resolved", resolved, "closed", closed, "critical", critical, "high", high
        );
    }
}
