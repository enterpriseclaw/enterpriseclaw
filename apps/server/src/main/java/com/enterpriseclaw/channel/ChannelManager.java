package com.enterpriseclaw.channel;

import com.enterpriseclaw.model.ChannelType;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Function;
import java.util.stream.Collectors;

@Component
@Slf4j
public class ChannelManager {

    private final Map<ChannelType, ChannelConnector> connectors;
    private final ChannelConfigRepository configRepository;
    private final ConcurrentHashMap<String, ChannelConfig> activeChannels = new ConcurrentHashMap<>();

    public ChannelManager(List<ChannelConnector> connectorList, ChannelConfigRepository configRepository) {
        this.connectors = connectorList.stream()
                .collect(Collectors.toMap(ChannelConnector::channelType, Function.identity()));
        this.configRepository = configRepository;
        log.info("Registered {} channel connectors: {}", connectors.size(), connectors.keySet());
    }

    @PostConstruct
    void startAllEnabled() {
        List<ChannelConfig> enabled = configRepository.findByEnabledTrue();
        for (ChannelConfig config : enabled) {
            startChannel(config);
        }
        log.info("Started {} enabled channels", enabled.size());
    }

    public void startChannel(ChannelConfig config) {
        ChannelConnector connector = connectors.get(config.getChannelType());
        if (connector == null) {
            log.warn("No connector registered for channel type: {}", config.getChannelType());
            return;
        }
        connector.start(config);
        activeChannels.put(config.getId(), config);
        log.info("Started channel: {} ({})", config.getName(), config.getChannelType());
    }

    public void stopChannel(String configId) {
        ChannelConfig config = activeChannels.remove(configId);
        if (config == null) return;
        ChannelConnector connector = connectors.get(config.getChannelType());
        if (connector != null) {
            connector.stop();
            log.info("Stopped channel: {} ({})", config.getName(), config.getChannelType());
        }
    }

    public Optional<ChannelConnector> getConnector(ChannelType type) {
        return Optional.ofNullable(connectors.get(type));
    }

    public record ChannelStatus(String id, String name, ChannelType channelType, boolean enabled, boolean connected) {}

    public List<ChannelStatus> getStatus() {
        return configRepository.findAll().stream()
                .map(config -> {
                    ChannelConnector connector = connectors.get(config.getChannelType());
                    boolean connected = connector != null && connector.isConnected();
                    return new ChannelStatus(config.getId(), config.getName(), config.getChannelType(), config.isEnabled(), connected);
                })
                .toList();
    }
}
