package com.enterpriseclaw.websocket.methods;

import com.enterpriseclaw.channel.ChannelManager;
import com.enterpriseclaw.websocket.rpc.RpcMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;

import java.util.Map;

@Component
public class ChannelsListMethod implements RpcMethod {

    private final ChannelManager channelManager;

    public ChannelsListMethod(ChannelManager channelManager) {
        this.channelManager = channelManager;
    }

    @Override
    public String methodName() {
        return "channels.list";
    }

    @Override
    public Object execute(Map<String, Object> params, WebSocketSession session) {
        return channelManager.getStatus();
    }
}
