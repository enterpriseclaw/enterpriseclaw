package com.enterpriseclaw.chat;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "enterpriseclaw.chat")
public class EnterpriseChatProperties {

    private String defaultProvider = "auto";
    private String defaultModel = "gpt-4.1";
    private final Copilot copilot = new Copilot();

    public String getDefaultProvider() {
        return defaultProvider;
    }

    public void setDefaultProvider(String defaultProvider) {
        this.defaultProvider = defaultProvider;
    }

    public String getDefaultModel() {
        return defaultModel;
    }

    public void setDefaultModel(String defaultModel) {
        this.defaultModel = defaultModel;
    }

    public Copilot getCopilot() {
        return copilot;
    }

    public static class Copilot {
        private boolean enabled = true;
        private String model = "gpt-4.1";
        private String toolPermissionMode = "approve_all";

        public boolean isEnabled() {
            return enabled;
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }

        public String getModel() {
            return model;
        }

        public void setModel(String model) {
            this.model = model;
        }

        public String getToolPermissionMode() {
            return toolPermissionMode;
        }

        public void setToolPermissionMode(String toolPermissionMode) {
            this.toolPermissionMode = toolPermissionMode;
        }
    }
}
