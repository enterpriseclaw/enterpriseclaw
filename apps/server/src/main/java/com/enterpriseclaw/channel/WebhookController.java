package com.enterpriseclaw.channel;

import com.enterpriseclaw.gateway.EnterpriseGatewayService;
import com.enterpriseclaw.model.ChannelType;
import com.enterpriseclaw.model.ExecutionResult;
import com.enterpriseclaw.model.IncomingChannelRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/webhook")
@RequiredArgsConstructor
public class WebhookController {

    private final WebhookChannelConnector webhookConnector;
    private final EnterpriseGatewayService gatewayService;

    public record WebhookInboundRequest(
            @NotBlank String message,
            String threadId,
            String userId,
            Map<String, String> metadata
    ) {}

    @PostMapping("/inbound")
    public ResponseEntity<ExecutionResult> inbound(
            @RequestHeader(value = "X-API-Key", required = false) String apiKey,
            @Valid @RequestBody WebhookInboundRequest request) {

        if (!webhookConnector.isConnected()) {
            return ResponseEntity.status(503).build();
        }

        String configuredKey = webhookConnector.getConfiguredApiKey();
        if (configuredKey != null && !configuredKey.equals(apiKey)) {
            return ResponseEntity.status(401).build();
        }

        IncomingChannelRequest channelRequest = new IncomingChannelRequest(
                UUID.randomUUID().toString(),
                ChannelType.API,
                request.userId() != null ? request.userId() : "webhook-user",
                request.threadId(),
                request.message(),
                null,
                Instant.now(),
                request.metadata() != null ? request.metadata() : Map.of()
        );

        ExecutionResult result = gatewayService.execute(channelRequest);
        return ResponseEntity.ok(result);
    }
}
