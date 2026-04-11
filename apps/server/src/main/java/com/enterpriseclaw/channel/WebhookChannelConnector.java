package com.enterpriseclaw.channel;

import com.enterpriseclaw.model.ChannelType;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class WebhookChannelConnector implements ChannelConnector {

    private volatile boolean connected;
    private volatile ChannelConfig currentConfig;

    @Override
    public ChannelType channelType() {
        return ChannelType.API;
    }

    @Override
    public void start(ChannelConfig config) {
        this.currentConfig = config;
        this.connected = true;
        log.info("Webhook channel connector started: {}", config.getName());
    }

    @Override
    public void stop() {
        this.connected = false;
        this.currentConfig = null;
        log.info("Webhook channel connector stopped");
    }

    @Override
    public boolean isConnected() {
        return connected;
    }

    @Override
    public void sendReply(String channelThreadId, String message) {
        // Webhook is request/response — replies are returned inline
        log.debug("Webhook reply (channelThreadId={}): {}", channelThreadId, message);
    }

    @Override
    public String displayName() {
        return "Webhook (API)";
    }

    public ChannelConfig getCurrentConfig() {
        return currentConfig;
    }

    public String getConfiguredApiKey() {
        if (currentConfig == null || currentConfig.getConfigJson() == null) {
            return null;
        }
        // Simple extraction — configJson is expected to contain {"apiKey": "..."}
        String json = currentConfig.getConfigJson();
        int idx = json.indexOf("\"apiKey\"");
        if (idx < 0) return null;
        int colon = json.indexOf(':', idx);
        int start = json.indexOf('"', colon + 1) + 1;
        int end = json.indexOf('"', start);
        return (start > 0 && end > start) ? json.substring(start, end) : null;
    }
}
