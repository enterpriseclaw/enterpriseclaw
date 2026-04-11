package com.enterpriseclaw.channel.telegram;

import com.enterpriseclaw.gateway.EnterpriseGatewayService;
import com.enterpriseclaw.model.ExecutionResult;
import com.enterpriseclaw.model.IncomingChannelRequest;
import tools.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(TelegramWebhookController.class)
class TelegramWebhookControllerTest {

    @Autowired
    MockMvc mockMvc;

    ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    EnterpriseGatewayService gateway;

    @MockitoBean
    TelegramApiClient telegramApiClient;

    @MockitoBean
    TelegramChannelConnector connector;

    @Test
    void shouldParseUpdateAndProcessMessage() throws Exception {
        given(connector.getBotToken()).willReturn("test-bot-token");
        given(gateway.execute(any(IncomingChannelRequest.class)))
                .willReturn(ExecutionResult.success("req-1", "Hello!", List.of(), List.of(), 100));

        String body = """
                {
                    "update_id": 123456,
                    "message": {
                        "message_id": 1,
                        "from": {"id": 42, "first_name": "Test", "username": "testuser"},
                        "chat": {"id": 42, "type": "private"},
                        "text": "Hello bot",
                        "date": 1700000000
                    }
                }
                """;

        mockMvc.perform(post("/api/v1/channels/telegram/webhook")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk());

        verify(telegramApiClient).sendChatAction("test-bot-token", "42", "typing");
    }

    @Test
    void shouldIgnoreUpdateWithNullMessage() throws Exception {
        String body = """
                {
                    "update_id": 123456,
                    "message": null
                }
                """;

        mockMvc.perform(post("/api/v1/channels/telegram/webhook")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk());

        verifyNoInteractions(gateway);
        verifyNoInteractions(telegramApiClient);
    }

    @Test
    void shouldIgnoreUpdateWithNullText() throws Exception {
        String body = """
                {
                    "update_id": 123456,
                    "message": {
                        "message_id": 1,
                        "from": {"id": 42, "first_name": "Test", "username": "testuser"},
                        "chat": {"id": 42, "type": "private"},
                        "text": null,
                        "date": 1700000000
                    }
                }
                """;

        mockMvc.perform(post("/api/v1/channels/telegram/webhook")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk());

        verifyNoInteractions(gateway);
    }

    @Test
    void shouldIgnoreUpdateWithEmptyText() throws Exception {
        String body = """
                {
                    "update_id": 123456,
                    "message": {
                        "message_id": 1,
                        "from": {"id": 42, "first_name": "Test", "username": "testuser"},
                        "chat": {"id": 42, "type": "private"},
                        "text": "   ",
                        "date": 1700000000
                    }
                }
                """;

        mockMvc.perform(post("/api/v1/channels/telegram/webhook")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk());

        verifyNoInteractions(gateway);
    }
}
