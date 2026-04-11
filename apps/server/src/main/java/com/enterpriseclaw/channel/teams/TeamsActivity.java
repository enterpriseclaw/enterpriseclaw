package com.enterpriseclaw.channel.teams;

public record TeamsActivity(
        String type,
        String id,
        String text,
        TeamsFrom from,
        TeamsConversation conversation,
        String serviceUrl,
        String channelId
) {
    public record TeamsFrom(String id, String name) {}
    public record TeamsConversation(String id) {}
}
