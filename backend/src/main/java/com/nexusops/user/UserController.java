package com.nexusops.user;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserController(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping
    public List<UserDto> getAll() {
        return userRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"))
                .stream().map(UserDto::from).toList();
    }

    @GetMapping("/assignees")
    public List<AssigneeDto> getAssignees() {
        return userRepository.findAll(Sort.by(Sort.Direction.ASC, "name"))
                .stream()
                .filter(AppUser::isActive)
                .map(u -> new AssigneeDto(u.getId(), u.getName(), u.getEmail(), u.getRole()))
                .toList();
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getOne(@PathVariable Long id) {
        return userRepository.findById(id)
                .map(u -> ResponseEntity.ok((Object) UserDto.from(u)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ResponseEntity<?> create(@Valid @RequestBody CreateUserRequest req) {
        if (userRepository.existsByEmail(req.email())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email already registered"));
        }
        AppUser user = new AppUser();
        user.setName(req.name());
        user.setEmail(req.email());
        user.setPassword(passwordEncoder.encode(req.password() != null && !req.password().isBlank() ? req.password() : "NexusOps123!"));
        String requestedRole = normalizeRole(req.role());
        if (requestedRole == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Role must be ADMIN, DEVOPS_ENGINEER, or USER"));
        }
        user.setRole(requestedRole);
        user.setActive(req.active());
        return ResponseEntity.status(HttpStatus.CREATED).body(UserDto.from(userRepository.save(user)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @Valid @RequestBody UpdateUserRequest req, Authentication auth) {
        return userRepository.findById(id)
                .map(u -> {
                    // Check if attempting to deactivate own account
                    if (auth != null && auth.getPrincipal() != null && auth.getPrincipal().equals(u.getEmail()) && !req.active()) {
                        return ResponseEntity.badRequest().body((Object) Map.of("error", "You cannot deactivate your own account"));
                    }
                    String requestedRole = normalizeRole(req.role());
                    if (requestedRole == null) {
                        return ResponseEntity.badRequest().body((Object) Map.of("error", "Role must be ADMIN, DEVOPS_ENGINEER, or USER"));
                    }
                    u.setName(req.name());
                    u.setRole(requestedRole);
                    u.setActive(req.active());
                    return ResponseEntity.ok((Object) UserDto.from(userRepository.save(u)));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id, Authentication auth) {
        if (!userRepository.existsById(id)) return ResponseEntity.notFound().build();
        if (auth != null && auth.getPrincipal() != null) {
            String currentEmail = (String) auth.getPrincipal();
            if (userRepository.findByEmail(currentEmail).map(u -> u.getId().equals(id)).orElse(false)) {
                return ResponseEntity.badRequest().body(Map.of("error", "You cannot delete your own account"));
            }
        }
        userRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/role")
    public ResponseEntity<?> changeRole(@PathVariable Long id, @RequestBody Map<String, String> body, Authentication auth) {
        String requestedRole = normalizeRole(body.get("role"));
        if (requestedRole == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Role must be ADMIN, DEVOPS_ENGINEER, or USER"));
        }
        return userRepository.findById(id)
                .map(u -> {
                    if (auth != null && auth.getPrincipal() != null && auth.getPrincipal().equals(u.getEmail()) && requestedRole.equals("USER")) {
                        return ResponseEntity.badRequest().body((Object) Map.of("error", "You cannot demote your own admin account"));
                    }
                    u.setRole(requestedRole);
                    return ResponseEntity.ok((Object) UserDto.from(userRepository.save(u)));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    private static String normalizeRole(String role) {
        if (role == null) return null;
        String normalized = role.trim().toUpperCase();
        return List.of("ADMIN", "DEVOPS_ENGINEER", "USER").contains(normalized) ? normalized : null;
    }

    public record CreateUserRequest(
            @NotBlank @Size(max = 80) String name,
            @Email @NotBlank String email,
            @Size(min = 6, max = 100) String password,
            String role,
            boolean active
    ) {}

    public record UpdateUserRequest(
            @NotBlank @Size(max = 80) String name,
            @NotBlank String role,
            boolean active
    ) {}

    public record AssigneeDto(Long id, String name, String email, String role) {}

    public record UserDto(Long id, String name, String email, String role, boolean active, String createdAt) {
        public static UserDto from(AppUser u) {
            return new UserDto(u.getId(), u.getName(), u.getEmail(), u.getRole(), u.isActive(),
                    u.getCreatedAt() != null ? u.getCreatedAt().toString() : null);
        }
    }
}
