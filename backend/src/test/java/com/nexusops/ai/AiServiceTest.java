package com.nexusops.ai;

import com.nexusops.incident.Incident;
import com.nexusops.incident.IncidentRepository;
import com.nexusops.kb.KbArticle;
import com.nexusops.kb.KbRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class AiServiceTest {

    @Autowired
    private AiService aiService;

    @Autowired
    private KbRepository kbRepository;

    @Autowired
    private IncidentRepository incidentRepository;

    @Test
    void testGetStatus() {
        Map<String, Object> status = aiService.getStatus();
        assertNotNull(status);
        assertTrue((Boolean) status.get("configured"));
        assertNotNull(status.get("provider"));
        assertNotNull(status.get("model"));
    }

    @Test
    void testChatVpnQuery() {
        Map<String, Object> response = aiService.chat("How do I troubleshoot WireGuard VPN connectivity?");
        assertNotNull(response);
        assertEquals("assistant", response.get("role"));
        String content = (String) response.get("content");
        assertTrue(content.contains("WireGuard") || content.contains("VPN"));
        assertTrue(content.contains("wg show") || content.contains("handshake"));
    }

    @Test
    void testChatDatabaseQuery() {
        Map<String, Object> response = aiService.chat("Database replication lag and connection pool timeout");
        assertNotNull(response);
        String content = (String) response.get("content");
        assertTrue(content.contains("Database") || content.contains("Replication") || content.contains("pg_stat_activity"));
    }

    @Test
    void testDiagnoseIncident() {
        Incident inc = new Incident();
        inc.setTitle("WireGuard Gateway Packet Drop");
        inc.setDescription("Packets failing to reach European subnet gateway.");
        inc.setCategory("NETWORK");
        inc.setPriority("HIGH");

        Map<String, Object> result = aiService.diagnoseIncident(inc);
        assertNotNull(result);
        String diagnosis = (String) result.get("diagnosis");
        assertNotNull(diagnosis);
        assertTrue(diagnosis.contains("Hypotheses"));
        assertTrue(diagnosis.contains("Diagnostic"));
        assertTrue(diagnosis.contains("Remediation"));
    }

    @Test
    void testGenerateRunbook() {
        Map<String, Object> runbook = aiService.generateRunbook("PostgreSQL Failover", "HARDWARE");
        assertNotNull(runbook);
        assertTrue(runbook.containsKey("title"));
        assertTrue(runbook.containsKey("content"));
        String content = (String) runbook.get("content");
        assertTrue(content.contains("Standard Operating Procedure"));
        assertTrue(content.contains("Remediation"));
    }
}
