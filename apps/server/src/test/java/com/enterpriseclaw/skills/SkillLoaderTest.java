package com.enterpriseclaw.skills;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class SkillLoaderTest {

    @TempDir
    Path tempDir;

    @Test
    void loadsSkillFromDirectory() throws IOException {
        Path skillDir = tempDir.resolve("test-skill");
        Files.createDirectories(skillDir);
        Files.writeString(skillDir.resolve("SKILL.md"), """
                ---
                name: test-skill
                description: A test skill for unit testing
                tools:
                  - name: doSomething
                    description: Does something useful
                    parameters:
                      input: { type: string, description: "The input value" }
                ---

                # Test Skill

                This is a test skill body.
                """);

        SkillLoader loader = new SkillLoader(tempDir.toString());
        loader.init();

        List<LoadedSkill> skills = loader.getLoadedSkills();
        assertThat(skills).hasSize(1);

        LoadedSkill skill = skills.getFirst();
        assertThat(skill.name()).isEqualTo("test-skill");
        assertThat(skill.description()).isEqualTo("A test skill for unit testing");
        assertThat(skill.markdownBody()).contains("# Test Skill");

        assertThat(skill.tools()).hasSize(1);
        LoadedSkill.ToolDefinition tool = skill.tools().getFirst();
        assertThat(tool.name()).isEqualTo("doSomething");
        assertThat(tool.description()).isEqualTo("Does something useful");
        assertThat(tool.parameters()).containsKey("input");
    }

    @Test
    void handlesEmptyDirectory() throws IOException {
        Path emptyDir = tempDir.resolve("empty");
        Files.createDirectories(emptyDir);

        SkillLoader loader = new SkillLoader(emptyDir.toString());
        loader.init();

        assertThat(loader.getLoadedSkills()).isEmpty();
    }

    @Test
    void handlesMissingDirectory() {
        SkillLoader loader = new SkillLoader(tempDir.resolve("nonexistent").toString());
        loader.init();

        assertThat(loader.getLoadedSkills()).isEmpty();
    }

    @Test
    void getSkillByName() throws IOException {
        Path skillDir = tempDir.resolve("my-skill");
        Files.createDirectories(skillDir);
        Files.writeString(skillDir.resolve("SKILL.md"), """
                ---
                name: my-skill
                description: Another skill
                tools: []
                ---

                Body content.
                """);

        SkillLoader loader = new SkillLoader(tempDir.toString());
        loader.init();

        assertThat(loader.getSkill("my-skill")).isPresent();
        assertThat(loader.getSkill("nonexistent")).isEmpty();
    }
}
