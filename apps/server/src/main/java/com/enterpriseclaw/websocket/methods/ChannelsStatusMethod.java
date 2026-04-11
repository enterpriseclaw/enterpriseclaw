package com.enterpriseclaw.websocket.methods;

import com.enterpriseclaw.channel.ChannelConfigRepository;
import com.enterpriseclaw.channel.ChannelManager;
import com.enterpriseclaw.websocket.rpc.RpcMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;

import java.util.Map;

@Component
public class ChannelsStatusMethod implements RpcMethod {

    private final ChannelConfigRepository configRepository;
    private final ChannelManager channelManager;

    public ChannelsStatusMethod(ChannelConfigRepository configRepository, ChannelManager channelManager) {
        this.configRepository = configRepository;
        this.channelManager = channelManager;
    }

    @Override
    public String methodName() {
        return "channels.status";
    }

    @Override
    public Object execute(Map<String, Object> params, WebSocketSession session) {
        String id = (String) params.get("id");
        if (id == null) {
            return channelManager.getStatus();
        }
        return configRepository.findById(id)
                .map(config -> {
                    var connector = channelManager.getConnector(config.getChannelType());
                    boolean connected = connector.isPresent() && connector.get().isConnected();
                    return new ChannelManager.ChannelStatus(
                            config.getId(), config.getName(), config.getChannelType(), config.isEnabled(), connected);
                })
                .orElse(null);
    }
}
