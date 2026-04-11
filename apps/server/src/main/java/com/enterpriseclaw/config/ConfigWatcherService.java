package com.enterpriseclaw.config;

import com.enterpriseclaw.skills.SkillLoader;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.*;

@Component
@Slf4j
public class ConfigWatcherService {

    private final SkillLoader skillLoader;
    private final Path skillsDirectory;
    private volatile WatchService watchService;

    public ConfigWatcherService(
            SkillLoader skillLoader,
            @Value("${enterpriseclaw.skills.directory:../../skills}") String skillsPath) {
        this.skillLoader = skillLoader;
        this.skillsDirectory = Path.of(skillsPath).toAbsolutePath().normalize();
    }

    @PostConstruct
    void init() {
        if (!Files.isDirectory(skillsDirectory)) {
            log.warn("Skills directory does not exist, skipping file watcher: {}", skillsDirectory);
            return;
        }

        try {
            watchService = skillsDirectory.getFileSystem().newWatchService();
            skillsDirectory.register(watchService,
                    StandardWatchEventKinds.ENTRY_CREATE,
                    StandardWatchEventKinds.ENTRY_MODIFY,
                    StandardWatchEventKinds.ENTRY_DELETE);

            Thread.ofVirtual().name("config-watcher").start(this::watchLoop);
            log.info("Config watcher started on {}", skillsDirectory);
        } catch (IOException e) {
            log.warn("Failed to start config watcher: {}", e.getMessage());
        }
    }

    private void watchLoop() {
        while (watchService != null) {
            try {
                WatchKey key = watchService.take();
                boolean shouldRescan = false;

                for (WatchEvent<?> event : key.pollEvents()) {
                    Path changed = (Path) event.context();
                    if (changed != null && changed.toString().endsWith(".md")) {
                        log.info("Skills change detected: {} {}", event.kind().name(), changed);
                        shouldRescan = true;
                    }
                }

                if (shouldRescan) {
                    skillLoader.rescan();
                }

                if (!key.reset()) {
                    log.warn("Config watcher key invalidated, stopping");
                    break;
                }
            } catch (ClosedWatchServiceException e) {
                log.debug("Config watcher closed");
                break;
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            }
        }
    }

    @PreDestroy
    void shutdown() {
        if (watchService != null) {
            try {
                watchService.close();
            } catch (IOException e) {
                log.debug("Error closing config watcher: {}", e.getMessage());
            }
        }
    }
}
