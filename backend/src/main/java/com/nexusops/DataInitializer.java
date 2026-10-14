package com.nexusops;

import com.nexusops.incident.Incident;
import com.nexusops.incident.IncidentRepository;
import com.nexusops.kb.KbArticle;
import com.nexusops.kb.KbRepository;
import com.nexusops.settings.Settings;
import com.nexusops.settings.SettingsRepository;
import com.nexusops.user.AppUser;
import com.nexusops.user.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final IncidentRepository incidentRepository;
    private final KbRepository kbRepository;
    private final SettingsRepository settingsRepository;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(UserRepository userRepository,
                           IncidentRepository incidentRepository,
                           KbRepository kbRepository,
                           SettingsRepository settingsRepository,
                           PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.incidentRepository = incidentRepository;
        this.kbRepository = kbRepository;
        this.settingsRepository = settingsRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        initUsers();
        initSettings();
        initIncidents();
        initKnowledgeBase();
    }

    private void initUsers() {
        Optional<AppUser> adminOpt = userRepository.findByEmail("admin@nexusops.com");
        if (adminOpt.isPresent()) {
            AppUser admin = adminOpt.get();
            if (!"ADMIN".equals(admin.getRole()) || !admin.isActive()) {
                admin.setRole("ADMIN");
                admin.setActive(true);
                userRepository.save(admin);
            }
        } else {
            AppUser admin = new AppUser();
            admin.setName("Admin User");
            admin.setEmail("admin@nexusops.com");
            admin.setPassword(passwordEncoder.encode("admin123"));
            admin.setRole("ADMIN");
            admin.setActive(true);
            userRepository.save(admin);
        }

        // Dedicated DevOps Engineer demo account. Change this password after first login.
        Optional<AppUser> devopsOpt = userRepository.findByEmail("devops@nexusops.com");
        if (devopsOpt.isPresent()) {
            AppUser devops = devopsOpt.get();
            if (!"DEVOPS_ENGINEER".equals(devops.getRole()) || !devops.isActive()) {
                devops.setRole("DEVOPS_ENGINEER");
                devops.setActive(true);
                userRepository.save(devops);
            }
        } else {
            AppUser devops = new AppUser();
            devops.setName("DevOps Engineer");
            devops.setEmail("devops@nexusops.com");
            devops.setPassword(passwordEncoder.encode("DevOps@12345"));
            devops.setRole("DEVOPS_ENGINEER");
            devops.setActive(true);
            userRepository.save(devops);
        }

        // Ensure at least one standard engineer user exists for assignment testing
        if (!userRepository.existsByEmail("engineer@nexusops.com")) {
            AppUser eng = new AppUser();
            eng.setName("DevOps Engineer");
            eng.setEmail("engineer@nexusops.com");
            eng.setPassword(passwordEncoder.encode("engineer123"));
            eng.setRole("USER");
            eng.setActive(true);
            userRepository.save(eng);
        }
    }

    private void initSettings() {
        if (settingsRepository.count() == 0) {
            Settings settings = new Settings();
            settings.setWorkspaceName("NexusOps Workspace");
            settings.setDefaultPriority("MEDIUM");
            settings.setAutoRefreshSeconds(30);
            settings.setNotificationsEnabled(true);
            settings.setIncidentPrefix("INC");
            settings.setUpdatedBy("system");
            settingsRepository.save(settings);
        }
    }

    private void initIncidents() {
        if (incidentRepository.count() == 0) {
            Incident i1 = new Incident();
            i1.setTitle("VPN Connection Failure");
            i1.setDescription("Multiple remote engineers in EU region are unable to establish WireGuard VPN tunnels to internal staging clusters.");
            i1.setCategory("NETWORK");
            i1.setPriority("HIGH");
            i1.setStatus("OPEN");
            i1.setAssignedTo("DevOps Engineer");
            incidentRepository.save(i1);

            Incident i2 = new Incident();
            i2.setTitle("Production Database Latency Spike");
            i2.setDescription("P99 query latency on PostgreSQL replica exceeded 850ms threshold during peak batch sync jobs.");
            i2.setCategory("HARDWARE");
            i2.setPriority("CRITICAL");
            i2.setStatus("IN_PROGRESS");
            i2.setAssignedTo("Admin User");
            incidentRepository.save(i2);

            Incident i3 = new Incident();
            i3.setTitle("SSO SAML Token Expiration Glitch");
            i3.setDescription("Single sign-on tokens prematurely invalidated after 15 minutes of inactivity instead of standard 8 hour window.");
            i3.setCategory("ACCESS");
            i3.setPriority("MEDIUM");
            i3.setStatus("RESOLVED");
            i3.setAssignedTo("DevOps Engineer");
            incidentRepository.save(i3);
        }
    }

    private void initKnowledgeBase() {
        if (kbRepository.count() == 0) {
            KbArticle a1 = new KbArticle();
            a1.setTitle("VPN Connection Troubleshooting Runbook");
            a1.setCategory("NETWORK");
            a1.setStatus("PUBLISHED");
            a1.setAuthor("Admin User");
            a1.setContent("Steps to resolve WireGuard and OpenVPN connectivity failures:\n\n1. Verify client configuration profile.\n2. Check gateway routing table: `ip route show`.\n3. Validate firewall security groups for UDP 51820.\n4. Restart local daemon: `sudo systemctl restart wg-quick@wg0`.\n5. If MTU issues persist, adjust MTU to 1360 in config.");
            kbRepository.save(a1);

            KbArticle a2 = new KbArticle();
            a2.setTitle("Database Connection Pool & Replication Tuning");
            a2.setCategory("HARDWARE");
            a2.setStatus("PUBLISHED");
            a2.setAuthor("Admin User");
            a2.setContent("Guide to optimizing HikariCP connection pools and monitoring replication lag:\n\n1. Ensure maximum-pool-size does not exceed database CPU core limit multiplied by 4.\n2. Monitor query lock contention via pg_stat_activity.\n3. Set idle-timeout to 300000ms and connection-timeout to 20000ms.\n4. Always configure read-replicas for analytical dashboard reporting.");
            kbRepository.save(a2);

            KbArticle a3 = new KbArticle();
            a3.setTitle("Access Management & Identity Provisioning Guidelines");
            a3.setCategory("SECURITY");
            a3.setStatus("PUBLISHED");
            a3.setAuthor("Admin User");
            a3.setContent("Standard Operating Procedure for onboarding team members and assigning roles:\n\n1. New team members must register with company corporate email.\n2. Default role assigned is USER.\n3. Administrators can promote members to ADMIN via the User Management console.\n4. MFA must be enforced for all administrator accounts.");
            kbRepository.save(a3);
        }
    }
}
