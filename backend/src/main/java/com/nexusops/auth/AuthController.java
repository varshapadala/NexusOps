package com.nexusops.auth;

import com.nexusops.user.AppUser;
import com.nexusops.user.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthController(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest req) {
        if (userRepository.existsByEmail(req.email())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email already registered"));
        }
        AppUser user = new AppUser();
        user.setName(req.name());
        user.setEmail(req.email());
        user.setPassword(passwordEncoder.encode(req.password()));
        // First user gets ADMIN role
        user.setRole(userRepository.count() == 0 ? "ADMIN" : "USER");
        userRepository.save(user);
        String token = jwtUtil.generateToken(user.getEmail(), user.getRole());
        return ResponseEntity.status(HttpStatus.CREATED).body(new AuthResponse(
                token, user.getId(), user.getName(), user.getEmail(), user.getRole()
        ));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest req) {
        return userRepository.findByEmail(req.email())
                .filter(u -> passwordEncoder.matches(req.password(), u.getPassword()))
                .filter(AppUser::isActive)
                .map(u -> {
                    String token = jwtUtil.generateToken(u.getEmail(), u.getRole());
                    return ResponseEntity.ok((Object) new AuthResponse(
                            token, u.getId(), u.getName(), u.getEmail(), u.getRole()
                    ));
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Invalid email or password")));
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Not authenticated"));
        }
        String email = (String) auth.getPrincipal();
        return userRepository.findByEmail(email)
                .map(u -> ResponseEntity.ok((Object) Map.of(
                        "id", u.getId(),
                        "name", u.getName(),
                        "email", u.getEmail(),
                        "role", u.getRole(),
                        "active", u.isActive()
                )))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "User not found")));
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(@Valid @RequestBody UpdateProfileRequest req, Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Not authenticated"));
        }
        String email = (String) auth.getPrincipal();
        return userRepository.findByEmail(email).map(user -> {
            if (req.name() != null && !req.name().isBlank()) {
                user.setName(req.name().trim());
            }
            if (req.newPassword() != null && !req.newPassword().isBlank()) {
                if (req.currentPassword() == null || req.currentPassword().isBlank()) {
                    return ResponseEntity.badRequest().body(Map.of("error", "Current password is required to change password"));
                }
                if (!passwordEncoder.matches(req.currentPassword(), user.getPassword())) {
                    return ResponseEntity.badRequest().body(Map.of("error", "Current password is incorrect"));
                }
                if (req.newPassword().length() < 6) {
                    return ResponseEntity.badRequest().body(Map.of("error", "New password must be at least 6 characters"));
                }
                user.setPassword(passwordEncoder.encode(req.newPassword()));
            }
            userRepository.save(user);
            String token = jwtUtil.generateToken(user.getEmail(), user.getRole());
            return ResponseEntity.ok((Object) new AuthResponse(
                    token, user.getId(), user.getName(), user.getEmail(), user.getRole()
            ));
        }).orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "User not found")));
    }

    public record RegisterRequest(
            @NotBlank @Size(max = 80) String name,
            @Email @NotBlank String email,
            @NotBlank @Size(min = 6, max = 100) String password
    ) {}

    public record LoginRequest(
            @Email @NotBlank String email,
            @NotBlank String password
    ) {}

    public record UpdateProfileRequest(
            @Size(max = 80) String name,
            String currentPassword,
            String newPassword
    ) {}

    public record AuthResponse(String token, Long userId, String name, String email, String role) {}
}
