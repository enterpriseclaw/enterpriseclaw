package com.enterpriseclaw.channel.teams;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.Instant;
import java.util.Map;

@Component
@Slf4j
public class TeamsAuthProvider {

    private static final String TOKEN_URL = "https://login.microsoftonline.com/botframework.com/oauth2/v2.0/token";
    private static final String SCOPE = "https://api.botframework.com/.default";

    private final RestClient restClient;
    private String cachedToken;
    private Instant tokenExpiry;

    public TeamsAuthProvider(RestClient.Builder restClientBuilder) {
        this.restClient = restClientBuilder.build();
    }

    public synchronized String getToken(String appId, String appPassword) {
        if (cachedToken != null && tokenExpiry != null && Instant.now().isBefore(tokenExpiry)) {
            return cachedToken;
        }

        log.debug("Fetching new Teams OAuth token for appId={}", appId);

        String body = "grant_type=client_credentials"
                + "&client_id=" + appId
                + "&client_secret=" + appPassword
                + "&scope=" + SCOPE;

        @SuppressWarnings("unchecked")
        Map<String, Object> response = restClient.post()
                .uri(TOKEN_URL)
                .header("Content-Type", "application/x-www-form-urlencoded")
                .body(body)
                .retrieve()
                .body(Map.class);

        if (response == null || !response.containsKey("access_token")) {
            throw new IllegalStateException("Failed to obtain Teams OAuth token");
        }

        cachedToken = (String) response.get("access_token");
        int expiresIn = response.get("expires_in") instanceof Number n ? n.intValue() : 3600;
        tokenExpiry = Instant.now().plusSeconds(expiresIn - 300); // refresh 5 min before expiry

        log.debug("Teams OAuth token acquired, expires in {}s", expiresIn);
        return cachedToken;
    }
}
