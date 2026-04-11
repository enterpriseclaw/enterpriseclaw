package com.enterpriseclaw.channel.teams;

import com.enterpriseclaw.channel.ChannelConfig;
import com.enterpriseclaw.channel.ChannelConnector;
import com.enterpriseclaw.model.ChannelType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.ObjectMapper;

import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class TeamsChannelConnector implements ChannelConnector {

    private final TeamsAuthProvider authProvider;
    private final RestClient.Builder restClientBuilder;

    private String appId;
    private String appPassword;
    private String serviceUrl;
    private boolean connected;

    @Override
    public ChannelType channelType() {
        return ChannelType.TEAMS;
    }

    @SuppressWarnings("unchecked")
    @Override
    public void start(ChannelConfig config) {
        Map<String, String> parsed;
        try {
            parsed = new ObjectMapper().readValue(config.getConfigJson(), Map.class);
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid Teams configJson", e);
        }
        this.appId = parsed.get("appId");
        this.appPassword = parsed.get("appPassword");

        if (appId == null || appPassword == null) {
            throw new IllegalArgumentException("Teams config requires 'appId' and 'appPassword'");
        }

        // Validate credentials by fetching a token
        authProvider.getToken(appId, appPassword);
        this.connected = true;
        log.info("Teams channel connector started for appId={}", appId);
    }

    @Override
    public void stop() {
        this.connected = false;
        log.info("Teams channel connector stopped");
    }

    @Override
    public boolean isConnected() {
        return connected;
    }

    @Override
    public void sendReply(String conversationId, String message) {
        if (serviceUrl == null) {
            throw new IllegalStateException("serviceUrl not set — cannot send reply without an incoming activity");
        }
        sendReply(serviceUrl, conversationId, message);
    }

    public void sendReply(String serviceUrl, String conversationId, String message) {
        String token = authProvider.getToken(appId, appPassword);
        String url = serviceUrl + "v3/conversations/" + conversationId + "/activities";

        RestClient client = restClientBuilder.build();
        client.post()
                .uri(url)
                .header("Authorization", "Bearer " + token)
                .header("Content-Type", "application/json")
                .body(Map.of("type", "message", "text", message))
                .retrieve()
                .toBodilessEntity();

        log.debug("Sent reply to Teams conversation={}", conversationId);
    }

    public void setServiceUrl(String serviceUrl) {
        this.serviceUrl = serviceUrl;
    }

    @Override
    public String displayName() {
        return "Microsoft Teams";
    }
}
