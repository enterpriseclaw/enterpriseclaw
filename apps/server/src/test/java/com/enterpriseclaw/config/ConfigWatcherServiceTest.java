package com.enterpriseclaw.config;

import com.enterpriseclaw.skills.SkillLoader;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThatNoException;

@ExtendWith(MockitoExtension.class)
class ConfigWatcherServiceTest {

    @Mock SkillLoader skillLoader;

    @Test
    void init_withValidDirectory_startsWithoutError(@TempDir Path tempDir) {
        ConfigWatcherService service = new ConfigWatcherService(skillLoader, tempDir.toString());

        assertThatNoException().isThrownBy(service::init);

        service.shutdown();
    }

    @Test
    void init_withMissingDirectory_logsWarningWithoutError() {
        ConfigWatcherService service = new ConfigWatcherService(skillLoader, "/nonexistent/path");

        assertThatNoException().isThrownBy(service::init);

        service.shutdown();
    }

    @Test
    void shutdown_withoutInit_doesNotThrow() {
        ConfigWatcherService service = new ConfigWatcherService(skillLoader, "/nonexistent/path");

        assertThatNoException().isThrownBy(service::shutdown);
    }

    @Test
    void shutdown_afterInit_closesCleanly(@TempDir Path tempDir) {
        ConfigWatcherService service = new ConfigWatcherService(skillLoader, tempDir.toString());
        service.init();

        assertThatNoException().isThrownBy(service::shutdown);
    }
}
