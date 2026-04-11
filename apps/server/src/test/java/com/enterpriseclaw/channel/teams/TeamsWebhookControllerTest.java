package com.enterpriseclaw.channel.teams;

import com.enterpriseclaw.gateway.EnterpriseGatewayService;
import com.enterpriseclaw.model.ExecutionResult;
import com.enterpriseclaw.model.IncomingChannelRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(TeamsWebhookController.class)
class TeamsWebhookControllerTest {

    @Autowired
    MockMvc mockMvc;

    @MockitoBean
    EnterpriseGatewayService gateway;

    @MockitoBean
    TeamsChannelConnector teamsConnector;

    @MockitoBean
    TeamsAuthProvider teamsAuthProvider;

    @Test
    void shouldParseActivityAndProcessMessage() throws Exception {
        given(gateway.execute(any(IncomingChannelRequest.class)))
                .willReturn(ExecutionResult.success("req-1", "Hello from bot!", List.of(), List.of(), 100));

        String body = """
                {
                    "type": "message",
                    "id": "activity-1",
                    "text": "Hello bot",
                    "from": {"id": "user-123", "name": "Test User"},
                    "conversation": {"id": "conv-456"},
                    "serviceUrl": "https://smba.trafficmanager.net/teams/",
                    "channelId": "msteams"
                }
                """;

        mockMvc.perform(post("/api/v1/channels/teams/messages")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk());

        verify(gateway).execute(any(IncomingChannelRequest.class));
        verify(teamsConnector).sendReply(
                eq("https://smba.trafficmanager.net/teams/"),
                eq("conv-456"),
                eq("Hello from bot!"));
    }

    @Test
    void shouldIgnoreNonMessageActivity() throws Exception {
        String body = """
                {
                    "type": "conversationUpdate",
                    "id": "activity-2",
                    "text": null,
                    "from": {"id": "user-123", "name": "Test User"},
                    "conversation": {"id": "conv-456"},
                    "serviceUrl": "https://smba.trafficmanager.net/teams/",
                    "channelId": "msteams"
                }
                """;

        mockMvc.perform(post("/api/v1/channels/teams/messages")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk());

        verifyNoInteractions(gateway);
    }

    @Test
    void shouldIgnoreActivityWithEmptyText() throws Exception {
        String body = """
                {
                    "type": "message",
                    "id": "activity-3",
                    "text": "   ",
                    "from": {"id": "user-123", "name": "Test User"},
                    "conversation": {"id": "conv-456"},
                    "serviceUrl": "https://smba.trafficmanager.net/teams/",
                    "channelId": "msteams"
                }
                """;

        mockMvc.perform(post("/api/v1/channels/teams/messages")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk());

        verifyNoInteractions(gateway);
    }

    @Test
    void shouldIgnoreActivityWithNullText() throws Exception {
        String body = """
                {
                    "type": "message",
                    "id": "activity-4",
                    "text": null,
                    "from": {"id": "user-123", "name": "Test User"},
                    "conversation": {"id": "conv-456"},
                    "serviceUrl": "https://smba.trafficmanager.net/teams/",
                    "channelId": "msteams"
                }
                """;

        mockMvc.perform(post("/api/v1/channels/teams/messages")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk());

        verifyNoInteractions(gateway);
    }

    @Test
    void shouldHandleGatewayFailureGracefully() throws Exception {
        given(gateway.execute(any(IncomingChannelRequest.class)))
                .willReturn(ExecutionResult.failure("req-1", "Something went wrong", 50));

        String body = """
                {
                    "type": "message",
                    "id": "activity-5",
                    "text": "Hello bot",
                    "from": {"id": "user-123", "name": "Test User"},
                    "conversation": {"id": "conv-456"},
                    "serviceUrl": "https://smba.trafficmanager.net/teams/",
                    "channelId": "msteams"
                }
                """;

        mockMvc.perform(post("/api/v1/channels/teams/messages")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk());

        verify(gateway).execute(any(IncomingChannelRequest.class));
        verify(teamsConnector, never()).sendReply(any(), any(), any());
    }
}
