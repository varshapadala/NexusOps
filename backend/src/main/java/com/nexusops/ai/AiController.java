package com.nexusops.ai;

import com.nexusops.incident.Incident;
import com.nexusops.incident.IncidentRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/ai")
public class AiController {

    private final AiService aiService;
    private final IncidentRepository incidentRepository;

    public AiController(AiService aiService, IncidentRepository incidentRepository) {
        this.aiService = aiService;
        this.incidentRepository = incidentRepository;
    }

    @GetMapping("/status")
    public Map<String, Object> getStatus() {
        return aiService.getStatus();
    }

    @PostMapping("/chat")
    public ResponseEntity<?> chat(@RequestBody Map<String, String> request) {
        String message = request.get("message");
        if (message == null || message.trim().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Message cannot be empty"));
        }
        try {
            Map<String, Object> response = aiService.chat(message);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to generate AI response: " + e.getMessage()));
        }
    }

    @PostMapping("/diagnose/{incidentId}")
    public ResponseEntity<?> diagnoseById(@PathVariable Long incidentId) {
        return incidentRepository.findById(incidentId)
                .map(incident -> ResponseEntity.ok((Object) aiService.diagnoseIncident(incident)))
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Incident not found: " + incidentId)));
    }

    @PostMapping("/diagnose")
    public ResponseEntity<?> diagnosePayload(@RequestBody Map<String, Object> body) {
        Incident inc = new Incident();
        if (body.containsKey("id") && body.get("id") != null) {
            try {
                inc.setId(Long.valueOf(body.get("id").toString()));
            } catch (Exception ignored) {}
        }
        inc.setTitle((String) body.getOrDefault("title", "Untitled Incident"));
        inc.setDescription((String) body.getOrDefault("description", "No description provided"));
        inc.setCategory((String) body.getOrDefault("category", "OTHER"));
        inc.setPriority((String) body.getOrDefault("priority", "MEDIUM"));
        inc.setStatus((String) body.getOrDefault("status", "OPEN"));
        inc.setAssignedTo((String) body.get("assignedTo"));

        return ResponseEntity.ok(aiService.diagnoseIncident(inc));
    }

    @PostMapping("/generate-runbook")
    public ResponseEntity<?> generateRunbook(@RequestBody Map<String, String> body) {
        String topic = body.getOrDefault("topic", "System Service Failure");
        String category = body.getOrDefault("category", "GENERAL");
        return ResponseEntity.ok(aiService.generateRunbook(topic, category));
    }
}
