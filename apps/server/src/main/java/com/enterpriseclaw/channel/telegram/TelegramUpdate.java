package com.enterpriseclaw.channel.telegram;

public record TelegramUpdate(long update_id, TelegramMessage message) {
    public record TelegramMessage(long message_id, TelegramUser from, TelegramChat chat, String text, long date) {}
    public record TelegramUser(long id, String first_name, String username) {}
    public record TelegramChat(long id, String type) {}
}
