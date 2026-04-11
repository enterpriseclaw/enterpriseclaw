package com.enterpriseclaw.skills;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.yaml.snakeyaml.Yaml;

import java.io.IOException;
import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;

@Component
public class SkillLoader {

    private static final Logger log = LoggerFactory.getLogger(SkillLoader.class);

    private final Path skillsDirectory;
    private final Map<String, LoadedSkill> skills = new LinkedHashMap<>();

    public SkillLoader(@Value("${enterpriseclaw.skills.directory:../../skills}") String skillsPath) {
        this.skillsDirectory = Path.of(skillsPath);
    }

    @PostConstruct
    void init() {
        Path resolved = skillsDirectory.toAbsolutePath().normalize();
        if (!Files.isDirectory(resolved)) {
            log.warn("Skills directory does not exist: {}", resolved);
            return;
        }

        try (DirectoryStream<Path> dirs = Files.newDirectoryStream(resolved, Files::isDirectory)) {
            for (Path dir : dirs) {
                Path skillFile = dir.resolve("SKILL.md");
                if (Files.isRegularFile(skillFile)) {
                    loadSkill(skillFile);
                }
            }
        } catch (IOException e) {
            log.warn("Failed to scan skills directory: {}", e.getMessage());
        }

        log.info("Loaded {} dynamic skill(s) from {}", skills.size(), resolved);
    }

    private void loadSkill(Path skillFile) {
        try {
            String content = Files.readString(skillFile);
            String[] parts = splitFrontmatter(content);
            if (parts == null) {
                log.warn("No YAML frontmatter found in {}", skillFile);
                return;
            }

            Yaml yaml = new Yaml();
            Map<String, Object> frontmatter = yaml.load(parts[0]);
            String name = (String) frontmatter.get("name");
            String description = (String) frontmatter.get("description");
            String markdownBody = parts[1].strip();

            List<LoadedSkill.ToolDefinition> tools = parseTools(frontmatter);

            skills.put(name, new LoadedSkill(name, description, markdownBody, tools));
            log.debug("Loaded skill: {}", name);
        } catch (Exception e) {
            log.warn("Failed to load skill from {}: {}", skillFile, e.getMessage());
        }
    }

    @SuppressWarnings("unchecked")
    private List<LoadedSkill.ToolDefinition> parseTools(Map<String, Object> frontmatter) {
        Object toolsObj = frontmatter.get("tools");
        if (!(toolsObj instanceof List<?> toolsList)) {
            return List.of();
        }

        List<LoadedSkill.ToolDefinition> result = new ArrayList<>();
        for (Object item : toolsList) {
            if (item instanceof Map<?, ?> toolMap) {
                String toolName = (String) toolMap.get("name");
                String toolDesc = (String) toolMap.get("description");
                Map<String, Object> params = toolMap.containsKey("parameters")
                        ? (Map<String, Object>) toolMap.get("parameters")
                        : Map.of();
                result.add(new LoadedSkill.ToolDefinition(toolName, toolDesc, params));
            }
        }
        return result;
    }

    private String[] splitFrontmatter(String content) {
        if (!content.startsWith("---")) {
            return null;
        }
        int endIndex = content.indexOf("---", 3);
        if (endIndex < 0) {
            return null;
        }
        String yamlPart = content.substring(3, endIndex).strip();
        String bodyPart = content.substring(endIndex + 3);
        return new String[]{yamlPart, bodyPart};
    }

    public void rescan() {
        skills.clear();
        Path resolved = skillsDirectory.toAbsolutePath().normalize();
        if (!Files.isDirectory(resolved)) {
            log.warn("Skills directory does not exist: {}", resolved);
            return;
        }

        try (DirectoryStream<Path> dirs = Files.newDirectoryStream(resolved, Files::isDirectory)) {
            for (Path dir : dirs) {
                Path skillFile = dir.resolve("SKILL.md");
                if (Files.isRegularFile(skillFile)) {
                    loadSkill(skillFile);
                }
            }
        } catch (IOException e) {
            log.warn("Failed to scan skills directory: {}", e.getMessage());
        }

        log.info("Rescanned {} dynamic skill(s) from {}", skills.size(), resolved);
    }

    public void writeSkill(String name, String content) {
        Path resolved = skillsDirectory.toAbsolutePath().normalize();
        Path skillDir = resolved.resolve(name);
        Path skillFile = skillDir.resolve("SKILL.md");

        try {
            Files.createDirectories(skillDir);
            Files.writeString(skillFile, content);
            loadSkill(skillFile);
            log.info("Wrote skill: {}", name);
        } catch (IOException e) {
            throw new RuntimeException("Failed to write skill: " + name, e);
        }
    }

    public void deleteSkill(String name) {
        Path resolved = skillsDirectory.toAbsolutePath().normalize();
        Path skillDir = resolved.resolve(name);

        try {
            Path skillFile = skillDir.resolve("SKILL.md");
            if (Files.exists(skillFile)) {
                Files.delete(skillFile);
            }
            if (Files.isDirectory(skillDir)) {
                Files.delete(skillDir);
            }
            skills.remove(name);
            log.info("Deleted skill: {}", name);
        } catch (IOException e) {
            throw new RuntimeException("Failed to delete skill: " + name, e);
        }
    }

    public Optional<String> getSkillRawContent(String name) {
        Path resolved = skillsDirectory.toAbsolutePath().normalize();
        Path skillFile = resolved.resolve(name).resolve("SKILL.md");
        if (!Files.isRegularFile(skillFile)) {
            return Optional.empty();
        }
        try {
            return Optional.of(Files.readString(skillFile));
        } catch (IOException e) {
            log.warn("Failed to read skill file: {}", skillFile);
            return Optional.empty();
        }
    }

    public List<LoadedSkill> getLoadedSkills() {
        return List.copyOf(skills.values());
    }

    public Optional<LoadedSkill> getSkill(String name) {
        return Optional.ofNullable(skills.get(name));
    }
}
