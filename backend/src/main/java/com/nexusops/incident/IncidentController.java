package com.nexusops.incident;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import org.springframework.security.access.prepost.PreAuthorize;

@RestController
@RequestMapping("/api/incidents")
public class IncidentController {
    private final IncidentService service;

    public IncidentController(IncidentService service) {
        this.service = service;
    }

    @GetMapping
@PreAuthorize("hasAnyRole('ADMIN','MANAGER','ENGINEER','USER')")
    public List<Incident> getAll(@RequestParam(required = false) String search,
                                  @RequestParam(required = false) String status,
                                  @RequestParam(required = false) String priority,
                                  @RequestParam(required = false) String assignedTo) {
        return service.findAll(search, status, priority, assignedTo);
    }

    @GetMapping("/{id}")
@PreAuthorize("hasAnyRole('ADMIN','MANAGER','ENGINEER','USER')")
    public Incident getOne(@PathVariable Long id) {
        return service.findById(id);
    }

    @PostMapping
@PreAuthorize("hasAnyRole('ADMIN','MANAGER','USER')")
    @ResponseStatus(HttpStatus.CREATED)
    public Incident create(@Valid @RequestBody Incident incident) {
        return service.create(incident);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','ENGINEER','USER')")
    public Incident update(@PathVariable Long id, @Valid @RequestBody Incident incident) {
        return service.update(id, incident);
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','ENGINEER','USER')")
    public Incident updateStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return service.updateStatus(id, body.get("status"));
    }

    @PatchMapping("/{id}/assign")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','ENGINEER','USER')")
    public Incident updateAssignee(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return service.updateAssignee(id, body.get("assignedTo"));
    }

    @DeleteMapping("/{id}")
@PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }

    @GetMapping("/summary")
@PreAuthorize("hasAnyRole('ADMIN','MANAGER','ENGINEER','USER')")
    public Map<String, Long> summary() {
        return service.summary();
    }
}
