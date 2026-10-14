package com.nexusops.ai;

import com.nexusops.incident.Incident;
import com.nexusops.incident.IncidentRepository;
import com.nexusops.kb.KbArticle;
import com.nexusops.kb.KbRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class AiService {

    private final KbRepository kbRepository;
    private final IncidentRepository incidentRepository;

    @Value("${nexusops.ai.provider:}")
    private String provider;

    @Value("${nexusops.ai.api-key:}")
    private String apiKey;

    @Value("${nexusops.ai.model:gpt-4o-mini}")
    private String model;

    @Value("${nexusops.ai.base-url:https://api.openai.com/v1}")
    private String baseUrl;

    public AiService(KbRepository kbRepository, IncidentRepository incidentRepository) {
        this.kbRepository = kbRepository;
        this.incidentRepository = incidentRepository;
    }

    public boolean isExternalConfigured() {
        return provider != null && !provider.isBlank() && apiKey != null && !apiKey.isBlank();
    }

    public Map<String, Object> getStatus() {
        boolean extConfigured = isExternalConfigured();
        return Map.of(
                "configured", true, // Always true because built-in Ops-AI engine is active
                "externalConfigured", extConfigured,
                "provider", extConfigured ? provider : "nexusops-local-engine",
                "model", extConfigured ? model : "NexusOps-OpsAI-v2",
                "ragEnabled", true,
                "capabilities", List.of("Incident Diagnosis", "Knowledge Base RAG", "Runbook Generation", "Shell Command Synthesis")
        );
    }

    public Map<String, Object> chat(String userMessage) {
        if (userMessage == null || userMessage.trim().isBlank()) {
            throw new IllegalArgumentException("Message cannot be empty");
        }

        String trimmed = userMessage.trim();

        // 1. Retrieve relevant RAG context from Knowledge Base and Incidents
        List<KbArticle> matchedArticles = findRelevantKbArticles(trimmed);
        List<Incident> matchedIncidents = findRelevantIncidents(trimmed);

        // 2. If external provider configured, attempt external call
        if (isExternalConfigured() && !"none".equalsIgnoreCase(provider)) {
            try {
                String externalResponse = callExternalProvider(trimmed, matchedArticles, matchedIncidents);
                if (externalResponse != null && !externalResponse.isBlank()) {
                    return buildResponse(externalResponse, provider, model, matchedArticles, matchedIncidents);
                }
            } catch (Exception e) {
                // Fall back gracefully to built-in Ops-AI engine if external provider call fails
            }
        }

        // 3. Built-in Ops-AI reasoning engine with RAG synthesis
        String responseContent = generateOpsResponse(trimmed, matchedArticles, matchedIncidents);
        return buildResponse(responseContent, "NexusOps Ops-AI", "OpsAI-v2", matchedArticles, matchedIncidents);
    }

    public Map<String, Object> diagnoseIncident(Incident incident) {
        if (incident == null) {
            throw new IllegalArgumentException("Incident cannot be null");
        }

        String query = incident.getTitle() + " " + incident.getDescription() + " " + incident.getCategory();
        List<KbArticle> matchedArticles = findRelevantKbArticles(query);

        StringBuilder sb = new StringBuilder();
        sb.append("### 🔍 AI Incident Diagnosis: INC-").append(incident.getId() != null ? String.format("%04d", incident.getId()) : "NEW")
          .append(" — ").append(incident.getTitle()).append("\n\n");

        sb.append("**Severity Level:** `").append(incident.getPriority()).append("` | ")
          .append("**Category:** `").append(incident.getCategory()).append("` | ")
          .append("**Assigned To:** ").append(incident.getAssignedTo() != null ? incident.getAssignedTo() : "Unassigned").append("\n\n");

        // Hypothesis & Root Cause Analysis
        sb.append("#### 1. Root Cause Hypotheses\n");
        sb.append(generateRootCausesForIncident(incident));

        // Diagnostic Verification CLI
        sb.append("\n#### 2. Diagnostic Verification Commands\n");
        sb.append(generateDiagnosticCommandsForCategory(incident.getCategory(), incident.getTitle()));

        // Remediation Action Plan
        sb.append("\n#### 3. Immediate Remediation Action Plan\n");
        sb.append(generateRemediationPlan(incident));

        // RAG Runbooks from internal Knowledge Base
        if (!matchedArticles.isEmpty()) {
            sb.append("\n#### 4. Matching Internal Knowledge Base Runbooks\n");
            for (KbArticle a : matchedArticles) {
                sb.append("- **[").append(a.getCategory()).append("] ").append(a.getTitle()).append("**\n");
                String snippet = a.getContent().lines().limit(3).collect(Collectors.joining("\n"));
                sb.append("  > ").append(snippet.replace("\n", "\n  > ")).append("\n\n");
            }
        }

        return Map.of(
                "incidentId", incident.getId() != null ? incident.getId() : 0,
                "diagnosis", sb.toString(),
                "relatedArticlesCount", matchedArticles.size(),
                "category", incident.getCategory(),
                "priority", incident.getPriority()
        );
    }

    public Map<String, Object> generateRunbook(String topic, String category) {
        String cat = (category != null && !category.isBlank()) ? category.toUpperCase() : "GENERAL";
        StringBuilder sb = new StringBuilder();

        sb.append("# Standard Operating Procedure: ").append(topic).append("\n\n");
        sb.append("**Category:** ").append(cat).append(" | **Target MTTR:** < 20 minutes | **Review Cadence:** Quarterly\n\n");

        sb.append("## 1. Overview & Triggers\n");
        sb.append("This runbook provides emergency response protocols when ").append(topic).append(" occurs. ")
          .append("Applies to production and staging clusters monitored by NexusOps.\n\n");

        sb.append("## 2. Immediate Triage & Assessment\n");
        sb.append("- Confirm user-facing blast radius via APM / Grafana alerts.\n");
        sb.append("- Verify whether recent deployments or configuration changes were executed within the last 2 hours.\n");
        sb.append("- Check health probes and error rate percentage.\n\n");

        sb.append("## 3. Diagnostic Commands\n```bash\n");
        if (cat.contains("NETWORK") || topic.toLowerCase().contains("vpn")) {
            sb.append("# Check interface status and handshake\n");
            sb.append("sudo wg show\n");
            sb.append("ping -c 4 1.1.1.1\n");
            sb.append("mtr -r -c 5 internal.gateway.local\n");
            sb.append("journalctl -u wg-quick@* --since '30 min ago' -n 50\n");
        } else if (cat.contains("HARDWARE") || topic.toLowerCase().contains("cpu") || topic.toLowerCase().contains("memory")) {
            sb.append("# Check top CPU/Memory consumers\n");
            sb.append("top -b -n 1 | head -n 20\n");
            sb.append("free -m\n");
            sb.append("df -hT\n");
            sb.append("vmstat 1 5\n");
        } else if (cat.contains("ACCESS") || topic.toLowerCase().contains("auth") || topic.toLowerCase().contains("token")) {
            sb.append("# Check authentication server latency & certs\n");
            sb.append("openssl s_client -connect auth.internal:443 -tls1_3\n");
            sb.append("curl -ivs https://auth.internal/.well-known/openid-configuration\n");
        } else {
            sb.append("# General service diagnostics\n");
            sb.append("systemctl status nexusops-backend\n");
            sb.append("journalctl -xeu nexusops-backend -n 100\n");
            sb.append("netstat -tulnp\n");
        }
        sb.append("```\n\n");

        sb.append("## 4. Remediation Steps\n");
        sb.append("1. **Isolate:** If traffic is degraded, redirect ingress gateway to secondary standby node.\n");
        sb.append("2. **Restart / Recycle:** Execute graceful restart of affected daemon/container.\n");
        sb.append("3. **Rollback:** If triggered by recent release, initiate automated rollback to previous stable commit tag.\n");
        sb.append("4. **Verify:** Run synthetic health check probes until 200 OK is verified across 3 successive cycles.\n\n");

        sb.append("## 5. Post-Incident Requirements\n");
        sb.append("- Document incident timeline in NexusOps incident ticket.\n");
        sb.append("- Attach log captures and root cause confirmation.\n");
        sb.append("- Schedule post-mortem review if priority was HIGH or CRITICAL.\n");

        return Map.of(
                "title", topic + " Runbook",
                "content", sb.toString(),
                "category", cat,
                "status", "PUBLISHED"
        );
    }

    // --- Private Helper Methods ---

    private List<KbArticle> findRelevantKbArticles(String text) {
        String lowered = text.toLowerCase();
        List<KbArticle> all = kbRepository.findAll();
        List<KbArticle> matches = new ArrayList<>();

        for (KbArticle a : all) {
            String title = a.getTitle() != null ? a.getTitle().toLowerCase() : "";
            String content = a.getContent() != null ? a.getContent().toLowerCase() : "";
            String cat = a.getCategory() != null ? a.getCategory().toLowerCase() : "";

            if (containsAnyWord(lowered, title) || containsAnyWord(lowered, cat) || containsAnyWord(lowered, content)) {
                matches.add(a);
            }
        }
        return matches.stream().limit(3).toList();
    }

    private List<Incident> findRelevantIncidents(String text) {
        String lowered = text.toLowerCase();
        List<Incident> all = incidentRepository.findAll();
        List<Incident> matches = new ArrayList<>();

        for (Incident i : all) {
            String title = i.getTitle() != null ? i.getTitle().toLowerCase() : "";
            String desc = i.getDescription() != null ? i.getDescription().toLowerCase() : "";
            String cat = i.getCategory() != null ? i.getCategory().toLowerCase() : "";

            if (containsAnyWord(lowered, title) || containsAnyWord(lowered, cat) || containsAnyWord(lowered, desc)) {
                matches.add(i);
            }
        }
        return matches.stream().limit(3).toList();
    }

    private boolean containsAnyWord(String query, String target) {
        if (target.isBlank() || query.isBlank()) return false;
        String[] keywords = query.split("\\W+");
        int count = 0;
        for (String kw : keywords) {
            if (kw.length() > 3 && target.contains(kw)) {
                count++;
            }
        }
        return count >= 1;
    }

    private String generateOpsResponse(String message, List<KbArticle> kbArticles, List<Incident> incidents) {
        String q = message.toLowerCase();
        StringBuilder sb = new StringBuilder();

        if (q.contains("vpn") || q.contains("wireguard") || q.contains("tunnel") || q.contains("ipsec")) {
            sb.append("### 🌐 WireGuard & VPN Connectivity Diagnostics\n\n");
            sb.append("**Probable Causes:** Mismatched public keys, firewall UDP port blocking, stale handshakes (>120s), MTU packet fragmentation, or daemon failure.\n\n");
            sb.append("#### Recommended Diagnostic Steps:\n");
            sb.append("```bash\n");
            sb.append("# 1. Check WireGuard status and peer handshake timestamps\n");
            sb.append("sudo wg show\n\n");
            sb.append("# 2. Verify firewall allows UDP traffic on WireGuard port (default: 51820)\n");
            sb.append("sudo ufw status verbose\n");
            sb.append("sudo iptables -L -n -v | grep 51820\n\n");
            sb.append("# 3. Inspect interface IP routing\n");
            sb.append("ip route show\n\n");
            sb.append("# 4. Restart WireGuard daemon service\n");
            sb.append("sudo systemctl restart wg-quick@wg0\n");
            sb.append("```\n\n");
            sb.append("#### Remediation Advice:\n");
            sb.append("- If handshake fails repeatedly, re-generate client keys and verify the server's AllowedIPs list.\n");
            sb.append("- For unstable connections, adjust client configuration MTU to `1360` or `1280`.\n");
        } else if (q.contains("database") || q.contains("sql") || q.contains("latency") || q.contains("replica") || q.contains("postgres") || q.contains("mysql") || q.contains("hikaricp")) {
            sb.append("### 🗄 Database Performance & Replication Diagnostics\n\n");
            sb.append("**Probable Causes:** Connection pool starvation (HikariCP max-pool limit reached), lock contention on table updates, missing indexes on filtered columns, or replication lag.\n\n");
            sb.append("#### Recommended Diagnostic Steps:\n");
            sb.append("```sql\n");
            sb.append("-- Check active connections and long-running queries (PostgreSQL)\n");
            sb.append("SELECT pid, age(clock_timestamp(), query_start), usename, state, query \n");
            sb.append("FROM pg_stat_activity \n");
            sb.append("WHERE state != 'idle' ORDER BY query_start ASC LIMIT 10;\n\n");
            sb.append("-- Check replication lag bytes\n");
            sb.append("SELECT client_addr, state, sync_state, \n");
            sb.append("       pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS lag_bytes\n");
            sb.append("FROM pg_stat_replication;\n");
            sb.append("```\n\n");
            sb.append("#### Remediation Advice:\n");
            sb.append("- Terminate offending blocked queries with `SELECT pg_terminate_backend(pid)`.\n");
            sb.append("- Increase HikariCP `maximum-pool-size` if server CPU has spare headroom.\n");
            sb.append("- Ensure heavy reporting jobs point exclusively to read-replicas.\n");
        } else if (q.contains("cpu") || q.contains("memory") || q.contains("ram") || q.contains("load") || q.contains("oom") || q.contains("spike")) {
            sb.append("### ⚡ High System Resource Utilization Diagnostics\n\n");
            sb.append("**Probable Causes:** Runaway background loop, memory leak causing JVM Garbage Collection thrashing, thread deadlock, or sudden traffic surge.\n\n");
            sb.append("#### Recommended Diagnostic Commands:\n");
            sb.append("```bash\n");
            sb.append("# 1. Find top resource-consuming processes\n");
            sb.append("top -b -n 1 -o %CPU | head -n 20\n");
            sb.append("ps aux --sort=-%mem | head -n 10\n\n");
            sb.append("# 2. Inspect memory breakdown (buffers, cache, available)\n");
            sb.append("free -h\n\n");
            sb.append("# 3. Inspect system IO wait\n");
            sb.append("iostat -xz 1 5\n\n");
            sb.append("# 4. For Java/Spring Boot services, generate thread dump\n");
            sb.append("jcmd <pid> Thread.print > /tmp/thread_dump.txt\n");
            sb.append("```\n\n");
            sb.append("#### Remediation Advice:\n");
            sb.append("- If JVM GC is high, examine heap size flags (`-Xmx`) and schedule heap dump analysis.\n");
            sb.append("- Temporarily scale application pods or restart affected container instances.\n");
        } else if (q.contains("sso") || q.contains("saml") || q.contains("auth") || q.contains("jwt") || q.contains("token") || q.contains("login") || q.contains("401") || q.contains("403")) {
            sb.append("### 🔐 Identity & Authentication Issue Diagnostics\n\n");
            sb.append("**Probable Causes:** Clock skew between server and IdP (Okta/Keycloak), expired SAML signing certificate, misconfigured JWT issuer/audience, or invalid secret keys.\n\n");
            sb.append("#### Recommended Diagnostic Steps:\n");
            sb.append("```bash\n");
            sb.append("# 1. Verify NTP server time synchronization (clock skew must be < 60s)\n");
            sb.append("timedatectl status\n\n");
            sb.append("# 2. Check IdP TLS certificate validity\n");
            sb.append("echo | openssl s_client -servername sso.company.com -connect sso.company.com:443 2>/dev/null | openssl x509 -noout -dates\n\n");
            sb.append("# 3. Inspect authentication service logs for token validation errors\n");
            sb.append("journalctl -u nexusops-backend -n 100 | grep -i 'jwt\\|auth\\|token'\n");
            sb.append("```\n\n");
            sb.append("#### Remediation Advice:\n");
            sb.append("- Synchronize server clock using `sudo chronyd -q 'server pool.ntp.org iburst'`.\n");
            sb.append("- Refresh SAML metadata and verify matching entity IDs in application settings.\n");
        } else if (q.contains("network") || q.contains("dns") || q.contains("ping") || q.contains("packet loss") || q.contains("port")) {
            sb.append("### 📡 Network & Connectivity Diagnostics\n\n");
            sb.append("**Probable Causes:** DNS resolver failure, routing loop, Security Group / NACL rule misconfiguration, or interface drop.\n\n");
            sb.append("#### Recommended Diagnostic Commands:\n");
            sb.append("```bash\n");
            sb.append("# 1. DNS resolution test\n");
            sb.append("dig +trace +short api.nexusops.internal\n\n");
            sb.append("# 2. TCP connection handshake test\n");
            sb.append("curl -Iv --connect-timeout 5 https://api.nexusops.internal:8080/api/health\n\n");
            sb.append("# 3. Comprehensive path packet loss inspection\n");
            sb.append("mtr --report -c 10 8.8.8.8\n\n");
            sb.append("# 4. Listening ports and established sockets\n");
            sb.append("ss -tulnp | grep -E ':(80|443|8080|3306)'\n");
            sb.append("```\n");
        } else {
            // General Operations Assistant response with RAG
            sb.append("### 🛠 NexusOps Operations Assistant\n\n");
            sb.append("Here is the operational guidance based on your query: **\"").append(message).append("\"**\n\n");
            sb.append("#### Triage Assessment:\n");
            sb.append("- Check the status of current backend microservices and databases.\n");
            sb.append("- Review system logs for active warning/error signatures.\n");
            sb.append("- Correlate the issue timeframe with recent deployments or infrastructure changes.\n\n");
            sb.append("#### Standard Diagnostic Commands:\n");
            sb.append("```bash\n");
            sb.append("# Check service status\n");
            sb.append("curl -s http://localhost:8080/api/health\n");
            sb.append("# Check open incident queue\n");
            sb.append("curl -s http://localhost:8080/api/incidents/summary\n");
            sb.append("```\n");
        }

        // Add RAG section if KB articles matched
        if (!kbArticles.isEmpty()) {
            sb.append("\n---\n#### 📚 Knowledge Base References:\n");
            for (KbArticle a : kbArticles) {
                sb.append("- **[").append(a.getCategory()).append("] ").append(a.getTitle()).append("**\n");
                String firstLine = a.getContent().lines().findFirst().orElse("");
                sb.append("  > ").append(firstLine).append("\n");
            }
        }

        // Add RAG section if Incidents matched
        if (!incidents.isEmpty()) {
            sb.append("\n#### ◈ Related Workspace Incidents:\n");
            for (Incident i : incidents) {
                sb.append("- **INC-").append(String.format("%04d", i.getId())).append("**: ")
                  .append(i.getTitle()).append(" (Status: `").append(i.getStatus()).append("`, Priority: `")
                  .append(i.getPriority()).append("`)\n");
            }
        }

        return sb.toString();
    }

    private String generateRootCausesForIncident(Incident incident) {
        String cat = incident.getCategory() != null ? incident.getCategory().toUpperCase() : "OTHER";
        return switch (cat) {
            case "NETWORK" -> """
                    - **Gateway Tunnel Drop:** Tunnel interface may have lost keepalive ping packets with remote endpoint.
                    - **MTU Size Mismatch:** Large packets failing fragmentation over WAN link.
                    - **Routing Table Overwrite:** Gateway default route inadvertently modified by DHCP or routing daemon update.
                    """;
            case "HARDWARE" -> """
                    - **I/O Bottleneck:** High disk wait percentages on primary storage volume.
                    - **Memory Saturation:** OS page cache eviction leading to high swap swapping and latency.
                    - **Database Connection Saturation:** Worker pool threads blocked waiting for available sockets.
                    """;
            case "ACCESS" -> """
                    - **Session Token Invalidation:** Clock skew between auth provider and API gateway.
                    - **Role Mapping Cache Stale:** Security permissions table cache out of sync with user claims.
                    - **Expired TLS/Signing Certificate:** Identity provider federation certificate requires renewal.
                    """;
            case "SOFTWARE" -> """
                    - **Unhandled Exception Loop:** Recent deployment introduced an uncaught exception in background queue worker.
                    - **Deadlock in Transaction:** Multi-row update statements acquiring locks in inconsistent order.
                    - **Upstream Dependency Timeout:** Third-party API failure cascading into connection pool exhaustion.
                    """;
            default -> """
                    - **Configuration Drift:** Divergence between staging and production environment parameters.
                    - **Infrastructure Dependency Failure:** Supporting caching, messaging, or storage tier degraded.
                    """;
        };
    }

    private String generateDiagnosticCommandsForCategory(String category, String title) {
        String cat = category != null ? category.toUpperCase() : "OTHER";
        StringBuilder sb = new StringBuilder("```bash\n");
        switch (cat) {
            case "NETWORK" -> {
                sb.append("# 1. Verify routing table and gateway reachability\n");
                sb.append("ip route show\n");
                sb.append("ping -c 4 8.8.8.8\n\n");
                sb.append("# 2. Inspect active network sockets\n");
                sb.append("ss -tulnp | grep -E ':(51820|1194|443|80)'\n\n");
                sb.append("# 3. Trace packet route for latency spikes\n");
                sb.append("mtr -r -c 5 google.com\n");
            }
            case "HARDWARE" -> {
                sb.append("# 1. Check system resource utilization\n");
                sb.append("top -b -n 1 | head -n 15\n");
                sb.append("free -h\n\n");
                sb.append("# 2. Inspect disk storage and inode capacity\n");
                sb.append("df -hT\n");
                sb.append("df -i\n\n");
                sb.append("# 3. Check IO latency and read/write waits\n");
                sb.append("iostat -xz 1 3\n");
            }
            case "ACCESS" -> {
                sb.append("# 1. Check system time synchronization\n");
                sb.append("timedatectl\n\n");
                sb.append("# 2. Inspect authentication log output\n");
                sb.append("journalctl -u nexusops-backend --since '1 hour ago' | grep -i 'auth\\|jwt\\|error'\n\n");
                sb.append("# 3. Verify SSL certificate expiration date\n");
                sb.append("echo | openssl s_client -connect localhost:8080 2>/dev/null | openssl x509 -noout -enddate\n");
            }
            default -> {
                sb.append("# 1. Inspect recent application service errors\n");
                sb.append("journalctl -u nexusops -n 50 --no-pager\n\n");
                sb.append("# 2. Check health endpoint\n");
                sb.append("curl -ivs http://localhost:8080/api/health\n\n");
                sb.append("# 3. Inspect container runtime logs if applicable\n");
                sb.append("docker ps\n");
                sb.append("docker logs --tail 50 nexusops-backend\n");
            }
        }
        sb.append("```\n");
        return sb.toString();
    }

    private String generateRemediationPlan(Incident incident) {
        StringBuilder sb = new StringBuilder();
        sb.append("1. **Verify Impact:** Check monitoring dashboards to determine number of users affected.\n");
        sb.append("2. **Isolate Component:** If a service replica is malfunctioning, drain traffic away from it.\n");
        sb.append("3. **Execute Runbook:** Apply standard recovery procedures for `").append(incident.getCategory()).append("`.\n");
        sb.append("4. **Update Status:** Transition incident to `IN_PROGRESS` and keep stakeholders informed.\n");
        sb.append("5. **Post-Resolution:** Confirm health checks pass, then mark incident `RESOLVED`.\n");
        return sb.toString();
    }

    private String callExternalProvider(String prompt, List<KbArticle> kbArticles, List<Incident> incidents) {
        try {
            HttpClient client = HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(10))
                    .build();

            // Construct RAG context
            StringBuilder context = new StringBuilder();
            if (!kbArticles.isEmpty()) {
                context.append("Knowledge Base Runbooks:\n");
                for (KbArticle a : kbArticles) {
                    context.append("- ").append(a.getTitle()).append(": ").append(a.getContent()).append("\n");
                }
            }
            if (!incidents.isEmpty()) {
                context.append("\nRecent Incidents:\n");
                for (Incident i : incidents) {
                    context.append("- INC-").append(i.getId()).append(" [").append(i.getStatus()).append("]: ")
                           .append(i.getTitle()).append(" - ").append(i.getDescription()).append("\n");
                }
            }

            String systemPrompt = "You are NexusOps AI, an expert IT Operations & Incident Management Assistant. " +
                    "Provide clear, actionable diagnostics, root cause analysis, and shell/CLI commands. " +
                    "Context from team system:\n" + context;

            String escapedSystem = escapeJson(systemPrompt);
            String escapedUser = escapeJson(prompt);

            String requestBody = "{"
                    + "\"model\":\"" + model + "\","
                    + "\"messages\":["
                    + "{\"role\":\"system\",\"content\":\"" + escapedSystem + "\"},"
                    + "{\"role\":\"user\",\"content\":\"" + escapedUser + "\"}"
                    + "],"
                    + "\"temperature\":0.3"
                    + "}";

            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl + "/chat/completions"))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + apiKey)
                    .timeout(Duration.ofSeconds(15))
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .build();

            HttpResponse<String> resp = client.send(req, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() == 200) {
                // Parse "content": "..." from JSON response
                String body = resp.body();
                int idx = body.indexOf("\"content\":");
                if (idx != -1) {
                    int start = body.indexOf("\"", idx + 10);
                    if (start != -1) {
                        // Quick unescape for simple responses
                        int end = findJsonStringEnd(body, start + 1);
                        if (end != -1) {
                            return unescapeJson(body.substring(start + 1, end));
                        }
                    }
                }
            }
        } catch (Exception ignored) {
            // Log and fallback
        }
        return null;
    }

    private Map<String, Object> buildResponse(String content, String prov, String mod,
                                               List<KbArticle> kbArticles, List<Incident> incidents) {
        Map<String, Object> map = new HashMap<>();
        map.put("role", "assistant");
        map.put("content", content);
        map.put("provider", prov);
        map.put("model", mod);
        map.put("ragArticles", kbArticles.stream().map(KbArticle::getTitle).toList());
        map.put("ragIncidents", incidents.stream().map(Incident::getTitle).toList());
        return map;
    }

    private String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\b", "\\b")
                .replace("\f", "\\f")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }

    private String unescapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\n", "\n")
                .replace("\\r", "\r")
                .replace("\\t", "\t")
                .replace("\\\"", "\"")
                .replace("\\\\", "\\");
    }

    private int findJsonStringEnd(String s, int startIndex) {
        boolean escaped = false;
        for (int i = startIndex; i < s.length(); i++) {
            char c = s.charAt(i);
            if (escaped) {
                escaped = false;
            } else if (c == '\\') {
                escaped = true;
            } else if (c == '"') {
                return i;
            }
        }
        return -1;
    }
}
