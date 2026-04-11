package com.enterpriseclaw.channel;

import com.enterpriseclaw.model.ChannelType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/channels")
@RequiredArgsConstructor
public class ChannelsController {

    private final ChannelConfigRepository configRepository;
    private final ChannelManager channelManager;

    public record CreateChannelRequest(
            @NotBlank String name,
            @NotNull ChannelType channelType,
            String configJson
    ) {}

    public record UpdateChannelRequest(
            String name,
            String configJson
    ) {}

    @GetMapping
    public List<ChannelManager.ChannelStatus> listChannels() {
        return channelManager.getStatus();
    }

    @PostMapping
    public ResponseEntity<ChannelConfig> createChannel(@Valid @RequestBody CreateChannelRequest request) {
        ChannelConfig config = ChannelConfig.builder()
                .id(UUID.randomUUID().toString())
                .name(request.name())
                .channelType(request.channelType())
                .configJson(request.configJson())
                .enabled(false)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        configRepository.save(config);
        return ResponseEntity.ok(config);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ChannelConfig> getChannel(@PathVariable String id) {
        return configRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<ChannelConfig> updateChannel(@PathVariable String id,
                                                        @RequestBody UpdateChannelRequest request) {
        return configRepository.findById(id).map(config -> {
            if (request.name() != null) config.setName(request.name());
            if (request.configJson() != null) config.setConfigJson(request.configJson());
            configRepository.save(config);
            return ResponseEntity.ok(config);
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteChannel(@PathVariable String id) {
        return configRepository.findById(id).map(config -> {
            channelManager.stopChannel(id);
            configRepository.delete(config);
            return ResponseEntity.noContent().<Void>build();
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/enable")
    public ResponseEntity<ChannelConfig> enableChannel(@PathVariable String id) {
        return configRepository.findById(id).map(config -> {
            config.setEnabled(true);
            configRepository.save(config);
            channelManager.startChannel(config);
            return ResponseEntity.ok(config);
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/disable")
    public ResponseEntity<ChannelConfig> disableChannel(@PathVariable String id) {
        return configRepository.findById(id).map(config -> {
            config.setEnabled(false);
            configRepository.save(config);
            channelManager.stopChannel(id);
            return ResponseEntity.ok(config);
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/status")
    public ResponseEntity<ChannelManager.ChannelStatus> getChannelStatus(@PathVariable String id) {
        return configRepository.findById(id).map(config -> {
            var connector = channelManager.getConnector(config.getChannelType());
            boolean connected = connector.isPresent() && connector.get().isConnected();
            var status = new ChannelManager.ChannelStatus(
                    config.getId(), config.getName(), config.getChannelType(), config.isEnabled(), connected);
            return ResponseEntity.ok(status);
        }).orElse(ResponseEntity.notFound().build());
    }
}
