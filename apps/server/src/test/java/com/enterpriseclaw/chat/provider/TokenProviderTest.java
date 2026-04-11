package com.enterpriseclaw.chat.provider;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

class TokenProviderTest {

    @TempDir
    Path tempDir;

    @Test
    void codexTokenProvider_withTokenSet_isAvailableAndReturnsToken() {
        CodexTokenProvider provider = new CodexTokenProvider();
        ReflectionTestUtils.setField(provider, "token", "test-jwt-token-12345");
        // Set lastModified to match the file so getToken() doesn't attempt refresh
        ReflectionTestUtils.setField(provider, "lastModified", System.currentTimeMillis());

        assertThat(provider.isAvailable()).isTrue();
        // getToken() checks file modification time - since AUTH_FILE likely doesn't exist,
        // it will just return the current token value
        assertThat(provider.getToken()).isNotNull();
    }

    @Test
    void codexTokenProvider_noToken_isNotAvailable() {
        CodexTokenProvider provider = new CodexTokenProvider();
        // Don't call init() — token remains null
        ReflectionTestUtils.setField(provider, "token", null);

        assertThat(provider.isAvailable()).isFalse();
    }

    @Test
    void copilotTokenProvider_isAvailable_returnsBoolean() {
        CopilotTokenProvider provider = new CopilotTokenProvider();
        // Don't call init() to avoid executing gh process
        // With no token set, isAvailable should return false
        assertThat(provider.isAvailable()).isFalse();
    }

    @Test
    void copilotTokenProvider_withToken_isAvailable() {
        CopilotTokenProvider provider = new CopilotTokenProvider();
        // Simulate a token being set
        ReflectionTestUtils.setField(provider, "token", "gho_test_token");

        assertThat(provider.isAvailable()).isTrue();
    }
}
