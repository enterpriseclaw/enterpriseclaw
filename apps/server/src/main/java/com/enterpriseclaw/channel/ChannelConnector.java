package com.enterpriseclaw.channel;

import com.enterpriseclaw.model.ChannelType;

public interface ChannelConnector {

    ChannelType channelType();

    void start(ChannelConfig config);

    void stop();

    boolean isConnected();

    void sendReply(String channelThreadId, String message);

    String displayName();
}
