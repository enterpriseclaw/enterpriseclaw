package com.enterpriseclaw.channel;

import com.enterpriseclaw.model.ChannelType;

import java.util.Map;

/**
 * Configuration for a channel connector instance.
 */
public record ChannelConfig(
        String channelId,
        ChannelType channelType,
        String tenantId,
        Map<String, String> configJson
) {}
