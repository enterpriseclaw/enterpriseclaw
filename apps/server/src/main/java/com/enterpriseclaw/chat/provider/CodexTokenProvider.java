package com.enterpriseclaw.chat.provider;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;

@Component
@Slf4j
public class CodexTokenProvider {

    private static final Path AUTH_FILE = Path.of(System.getProperty("user.home"), ".codex", "auth.json");
    private volatile String token;
    private volatile long lastModified;

    @PostConstruct
    public void init() {
        refreshToken();
    }

    public String getToken() {
        try {
            if (Files.exists(AUTH_FILE)) {
                long currentModified = Files.getLastModifiedTime(AUTH_FILE).toMillis();
                if (currentModified != lastModified) {
                    refreshToken();
                }
            }
        } catch (Exception e) {
            log.debug("Failed to check auth file modification time: {}", e.getMessage());
        }
        return token;
    }

    public boolean isAvailable() {
        return token != null;
    }

    private void refreshToken() {
        try {
            if (!Files.exists(AUTH_FILE)) {
                log.debug("Codex auth file not found: {}", AUTH_FILE);
                return;
            }
            ObjectMapper mapper = new ObjectMapper();
            JsonNode root = mapper.readTree(AUTH_FILE.toFile());
            JsonNode tokensNode = root.get("tokens");
            if (tokensNode != null) {
                JsonNode accessToken = tokensNode.get("access_token");
                if (accessToken != null && !accessToken.asText().isBlank()) {
                    this.token = accessToken.asText();
                    this.lastModified = Files.getLastModifiedTime(AUTH_FILE).toMillis();
                    log.info("Codex token refreshed successfully");
                }
            }
        } catch (Exception e) {
            log.debug("Failed to read Codex auth file: {}", e.getMessage());
        }
    }
}
