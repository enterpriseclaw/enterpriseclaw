package com.enterpriseclaw.channel.telegram;

import com.enterpriseclaw.channel.ChannelConfig;
import com.enterpriseclaw.channel.ChannelConnector;
import com.enterpriseclaw.model.ChannelType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class TelegramChannelConnector implements ChannelConnector {

    private final TelegramApiClient telegramApiClient;
    private final ObjectMapper objectMapper;
    private volatile boolean connected = false;
    private String botToken;

    @Override
    public ChannelType channelType() {
        return ChannelType.TELEGRAM;
    }

    @Override
    @SuppressWarnings("unchecked")
    public void start(ChannelConfig config) {
        Map<String, String> json = parseConfigJson(config.getConfigJson());
        this.botToken = json.get("botToken");
        String webhookUrl = json.get("webhookUrl");
        telegramApiClient.setWebhook(botToken, webhookUrl);
        connected = true;
        log.info("Telegram connector started");
    }

    @Override
    public void stop() {
        if (botToken != null) {
            telegramApiClient.deleteWebhook(botToken);
        }
        connected = false;
        log.info("Telegram connector stopped");
    }

    @Override
    public boolean isConnected() {
        return connected;
    }

    @Override
    public void sendReply(String channelThreadId, String message) {
        telegramApiClient.sendMessage(botToken, channelThreadId, message);
    }

    @Override
    public String displayName() {
        return "Telegram";
    }

    public String getBotToken() {
        return botToken;
    }

    @SuppressWarnings("unchecked")
    private Map<String, String> parseConfigJson(String configJson) {
        try {
            return objectMapper.readValue(configJson, Map.class);
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid channel config JSON", e);
        }
    }
}
