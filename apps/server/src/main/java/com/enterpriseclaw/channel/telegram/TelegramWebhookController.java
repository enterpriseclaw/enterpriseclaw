package com.enterpriseclaw.channel.telegram;

import com.enterpriseclaw.gateway.EnterpriseGatewayService;
import com.enterpriseclaw.model.ChannelType;
import com.enterpriseclaw.model.ExecutionResult;
import com.enterpriseclaw.model.IncomingChannelRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/channels/telegram")
@RequiredArgsConstructor
@Slf4j
public class TelegramWebhookController {

    private final EnterpriseGatewayService gateway;
    private final TelegramApiClient telegramApiClient;
    private final TelegramChannelConnector connector;

    @PostMapping("/webhook")
    public ResponseEntity<Void> handleWebhook(@RequestBody TelegramUpdate update) {
        if (update.message() == null || update.message().text() == null || update.message().text().isBlank()) {
            return ResponseEntity.ok().build();
        }

        String chatId = String.valueOf(update.message().chat().id());
        String userId = String.valueOf(update.message().from().id());
        String text = update.message().text();
        String botToken = getBotToken();

        // Send typing indicator
        telegramApiClient.sendChatAction(botToken, chatId, "typing");

        // Process on virtual thread to avoid blocking Telegram's webhook
        Thread.startVirtualThread(() -> {
            try {
                IncomingChannelRequest request = new IncomingChannelRequest(
                        UUID.randomUUID().toString(),
                        ChannelType.TELEGRAM,
                        userId,
                        chatId,
                        text,
                        null,
                        Instant.now(),
                        Map.of()
                );

                ExecutionResult result = gateway.execute(request);

                if (result.success() && result.response() != null) {
                    connector.sendReply(chatId, result.response());
                } else {
                    connector.sendReply(chatId, "Sorry, I encountered an error processing your message.");
                }
            } catch (Exception e) {
                log.error("Failed to process Telegram message from chat {}", chatId, e);
                connector.sendReply(chatId, "Sorry, an unexpected error occurred.");
            }
        });

        return ResponseEntity.ok().build();
    }

    private String getBotToken() {
        return connector.getBotToken();
    }
}
