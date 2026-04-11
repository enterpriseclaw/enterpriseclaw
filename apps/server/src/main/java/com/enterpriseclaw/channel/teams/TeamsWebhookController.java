package com.enterpriseclaw.channel.teams;

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
@RequestMapping("/api/v1/channels/teams")
@RequiredArgsConstructor
@Slf4j
public class TeamsWebhookController {

    private final EnterpriseGatewayService gateway;
    private final TeamsChannelConnector teamsConnector;

    @PostMapping("/messages")
    public ResponseEntity<Void> receiveActivity(@RequestBody TeamsActivity activity) {
        log.debug("Received Teams activity: type={} from={}", activity.type(), activity.from());

        if (!"message".equals(activity.type())) {
            log.debug("Ignoring non-message activity type: {}", activity.type());
            return ResponseEntity.ok().build();
        }

        if (activity.text() == null || activity.text().isBlank()) {
            log.debug("Ignoring activity with empty text");
            return ResponseEntity.ok().build();
        }

        String conversationId = activity.conversation() != null ? activity.conversation().id() : null;
        String fromId = activity.from() != null ? activity.from().id() : "unknown";
        String serviceUrl = activity.serviceUrl();

        // Store serviceUrl for replies
        if (serviceUrl != null) {
            teamsConnector.setServiceUrl(serviceUrl);
        }

        IncomingChannelRequest request = new IncomingChannelRequest(
                UUID.randomUUID().toString(),
                ChannelType.TEAMS,
                fromId,
                conversationId,
                activity.text(),
                null, // tenantId resolved downstream
                Instant.now(),
                Map.of("serviceUrl", serviceUrl != null ? serviceUrl : "")
        );

        ExecutionResult result = gateway.execute(request);

        // Send reply back to Teams
        if (result.success() && result.response() != null && serviceUrl != null && conversationId != null) {
            teamsConnector.sendReply(serviceUrl, conversationId, result.response());
        } else if (!result.success()) {
            log.warn("Gateway execution failed for Teams message: {}", result.errorMessage());
        }

        return ResponseEntity.ok().build();
    }
}
