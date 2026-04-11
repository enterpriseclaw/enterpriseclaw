package com.enterpriseclaw.channel.telegram;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Component
@Slf4j
public class TelegramApiClient {

    private static final String BASE_URL = "https://api.telegram.org/bot";
    private static final int MAX_MESSAGE_LENGTH = 4096;

    private final RestClient restClient;

    public TelegramApiClient(RestClient.Builder restClientBuilder) {
        this.restClient = restClientBuilder.build();
    }

    public void setWebhook(String botToken, String webhookUrl) {
        log.info("Setting Telegram webhook to: {}", webhookUrl);
        restClient.post()
                .uri(BASE_URL + botToken + "/setWebhook")
                .body(Map.of("url", webhookUrl))
                .retrieve()
                .toBodilessEntity();
    }

    public void deleteWebhook(String botToken) {
        log.info("Deleting Telegram webhook");
        restClient.post()
                .uri(BASE_URL + botToken + "/deleteWebhook")
                .retrieve()
                .toBodilessEntity();
    }

    public void sendMessage(String botToken, String chatId, String text) {
        List<String> chunks = splitMessage(text);
        for (String chunk : chunks) {
            restClient.post()
                    .uri(BASE_URL + botToken + "/sendMessage")
                    .body(Map.of("chat_id", chatId, "text", chunk))
                    .retrieve()
                    .toBodilessEntity();
        }
    }

    public void sendChatAction(String botToken, String chatId, String action) {
        restClient.post()
                .uri(BASE_URL + botToken + "/sendChatAction")
                .body(Map.of("chat_id", chatId, "action", action))
                .retrieve()
                .toBodilessEntity();
    }

    private List<String> splitMessage(String text) {
        if (text.length() <= MAX_MESSAGE_LENGTH) {
            return List.of(text);
        }
        List<String> chunks = new ArrayList<>();
        int start = 0;
        while (start < text.length()) {
            int end = Math.min(start + MAX_MESSAGE_LENGTH, text.length());
            chunks.add(text.substring(start, end));
            start = end;
        }
        return chunks;
    }
}
