package com.enterpriseclaw.chat.provider;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.concurrent.TimeUnit;

@Component
@Slf4j
public class CopilotTokenProvider {

    private static final long REFRESH_INTERVAL_SECONDS = 30 * 60;
    private volatile String token;
    private volatile Instant lastRefresh = Instant.EPOCH;

    @PostConstruct
    public void init() {
        refreshToken();
    }

    public String getToken() {
        if (token != null && Instant.now().isBefore(lastRefresh.plusSeconds(REFRESH_INTERVAL_SECONDS))) {
            return token;
        }
        refreshToken();
        return token;
    }

    public boolean isAvailable() {
        return token != null;
    }

    private void refreshToken() {
        try {
            ProcessBuilder pb = new ProcessBuilder("gh", "auth", "token");
            pb.redirectErrorStream(true);
            Process process = pb.start();
            boolean finished = process.waitFor(10, TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                log.warn("gh auth token timed out");
                return;
            }
            if (process.exitValue() == 0) {
                String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8).trim();
                if (!output.isBlank()) {
                    this.token = output;
                    this.lastRefresh = Instant.now();
                    log.info("Copilot token refreshed successfully");
                }
            } else {
                log.debug("gh auth token exited with code {}", process.exitValue());
            }
        } catch (IOException | InterruptedException e) {
            log.debug("Failed to obtain Copilot token: {}", e.getMessage());
        }
    }
}
