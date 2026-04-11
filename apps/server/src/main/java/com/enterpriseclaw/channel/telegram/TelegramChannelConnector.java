package com.enterpriseclaw.channel.telegram;

import com.enterpriseclaw.channel.ChannelConfig;
import com.enterpriseclaw.channel.ChannelConnector;
import com.enterpriseclaw.model.ChannelType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class TelegramChannelConnector implements ChannelConnector {

    private final TelegramApiClient telegramApiClient;
    private volatile boolean connected = false;
    private String botToken;

    @Override
    public ChannelType channelType() {
        return ChannelType.TELEGRAM;
    }

    @Override
    public void start(ChannelConfig config) {
        this.botToken = config.configJson().get("botToken");
        String webhookUrl = config.configJson().get("webhookUrl");
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
}
