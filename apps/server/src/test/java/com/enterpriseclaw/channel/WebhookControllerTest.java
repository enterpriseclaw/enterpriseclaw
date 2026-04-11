package com.enterpriseclaw.channel;

import com.enterpriseclaw.gateway.EnterpriseGatewayService;
import com.enterpriseclaw.model.ExecutionResult;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(WebhookController.class)
class WebhookControllerTest {

    @Autowired
    MockMvc mockMvc;

    ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    WebhookChannelConnector webhookConnector;

    @MockitoBean
    EnterpriseGatewayService gatewayService;

    @Test
    void inbound_whenNotConnected_returns503() throws Exception {
        given(webhookConnector.isConnected()).willReturn(false);

        mockMvc.perform(post("/api/v1/webhook/inbound")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"message": "hello"}
                                """))
                .andExpect(status().isServiceUnavailable());
    }

    @Test
    void inbound_withInvalidApiKey_returns401() throws Exception {
        given(webhookConnector.isConnected()).willReturn(true);
        given(webhookConnector.getConfiguredApiKey()).willReturn("correct-key");

        mockMvc.perform(post("/api/v1/webhook/inbound")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-API-Key", "wrong-key")
                        .content("""
                                {"message": "hello"}
                                """))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void inbound_withValidKey_executesAndReturnsResult() throws Exception {
        given(webhookConnector.isConnected()).willReturn(true);
        given(webhookConnector.getConfiguredApiKey()).willReturn("my-key");

        ExecutionResult result = ExecutionResult.success("req-1", "Hello back!", List.of(), List.of(), 100);
        given(gatewayService.execute(any())).willReturn(result);

        mockMvc.perform(post("/api/v1/webhook/inbound")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-API-Key", "my-key")
                        .content("""
                                {"message": "hello"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.response").value("Hello back!"))
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void inbound_withNoConfiguredKey_allowsAnyRequest() throws Exception {
        given(webhookConnector.isConnected()).willReturn(true);
        given(webhookConnector.getConfiguredApiKey()).willReturn(null);

        ExecutionResult result = ExecutionResult.success("req-2", "response", List.of(), List.of(), 50);
        given(gatewayService.execute(any())).willReturn(result);

        mockMvc.perform(post("/api/v1/webhook/inbound")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"message": "open request"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}
