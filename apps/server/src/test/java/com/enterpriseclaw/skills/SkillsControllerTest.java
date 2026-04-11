package com.enterpriseclaw.skills;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(SkillsController.class)
class SkillsControllerTest {

    @Autowired
    MockMvc mockMvc;

    @MockitoBean
    SkillLoader skillLoader;

    private static final LoadedSkill KNOWLEDGE_SKILL = new LoadedSkill(
            "knowledge",
            "Organization knowledge base search",
            "# Knowledge Skill\n\nSearches the knowledge base.",
            List.of(new LoadedSkill.ToolDefinition(
                    "searchKnowledge",
                    "Search the knowledge base",
                    Map.of("query", Map.of("type", "string"))))
    );

    private static final LoadedSkill GITHUB_SKILL = new LoadedSkill(
            "github",
            "GitHub integration",
            "# GitHub Skill",
            List.of()
    );

    @Test
    void listSkills_returnsAllSkillSummaries() throws Exception {
        given(skillLoader.getLoadedSkills()).willReturn(List.of(KNOWLEDGE_SKILL, GITHUB_SKILL));

        mockMvc.perform(get("/api/v1/skills"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].name").value("knowledge"))
                .andExpect(jsonPath("$[0].description").value("Organization knowledge base search"))
                .andExpect(jsonPath("$[0].toolCount").value(1))
                .andExpect(jsonPath("$[0].provider").value("knowledge"))
                .andExpect(jsonPath("$[1].name").value("github"))
                .andExpect(jsonPath("$[1].toolCount").value(0));
    }

    @Test
    void listSkills_emptyList_returnsEmptyArray() throws Exception {
        given(skillLoader.getLoadedSkills()).willReturn(List.of());

        mockMvc.perform(get("/api/v1/skills"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void getSkill_existingSkill_returnsDetail() throws Exception {
        given(skillLoader.getSkill("knowledge")).willReturn(Optional.of(KNOWLEDGE_SKILL));

        mockMvc.perform(get("/api/v1/skills/knowledge"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("knowledge"))
                .andExpect(jsonPath("$.description").value("Organization knowledge base search"))
                .andExpect(jsonPath("$.markdownBody").value("# Knowledge Skill\n\nSearches the knowledge base."))
                .andExpect(jsonPath("$.tools.length()").value(1))
                .andExpect(jsonPath("$.tools[0].name").value("searchKnowledge"))
                .andExpect(jsonPath("$.provider").value("knowledge"));
    }

    @Test
    void getSkill_notFound_returns404() throws Exception {
        given(skillLoader.getSkill("nonexistent")).willReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/skills/nonexistent"))
                .andExpect(status().isNotFound());
    }

    @Test
    void rescan_callsRescanAndReturnsCount() throws Exception {
        given(skillLoader.getLoadedSkills()).willReturn(List.of(KNOWLEDGE_SKILL, GITHUB_SKILL));

        mockMvc.perform(post("/api/v1/skills/rescan"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.count").value(2));

        verify(skillLoader).rescan();
    }

    @Test
    void createSkill_validRequest_returns201() throws Exception {
        String content = "---\nname: test\ndescription: A test skill\n---\n# Test";
        given(skillLoader.getSkill("test"))
                .willReturn(Optional.empty())
                .willReturn(Optional.of(new LoadedSkill("test", "A test skill", "# Test", List.of())));

        mockMvc.perform(post("/api/v1/skills")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name": "test", "content": "---\\nname: test\\ndescription: A test skill\\n---\\n# Test"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("test"))
                .andExpect(jsonPath("$.description").value("A test skill"));

        verify(skillLoader).writeSkill("test", "---\nname: test\ndescription: A test skill\n---\n# Test");
    }

    @Test
    void createSkill_duplicate_returns409() throws Exception {
        given(skillLoader.getSkill("knowledge")).willReturn(Optional.of(KNOWLEDGE_SKILL));

        mockMvc.perform(post("/api/v1/skills")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name": "knowledge", "content": "some content"}
                                """))
                .andExpect(status().isConflict());
    }

    @Test
    void updateSkill_existingSkill_returnsUpdated() throws Exception {
        LoadedSkill updated = new LoadedSkill("knowledge", "Updated description", "# Updated", List.of());
        given(skillLoader.getSkill("knowledge"))
                .willReturn(Optional.of(KNOWLEDGE_SKILL))
                .willReturn(Optional.of(updated));

        mockMvc.perform(put("/api/v1/skills/knowledge")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"content": "---\\nname: knowledge\\ndescription: Updated description\\n---\\n# Updated"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.description").value("Updated description"));
    }

    @Test
    void updateSkill_notFound_returns404() throws Exception {
        given(skillLoader.getSkill("nonexistent")).willReturn(Optional.empty());

        mockMvc.perform(put("/api/v1/skills/nonexistent")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"content": "some content"}
                                """))
                .andExpect(status().isNotFound());
    }

    @Test
    void deleteSkill_existingSkill_returns204() throws Exception {
        given(skillLoader.getSkill("knowledge")).willReturn(Optional.of(KNOWLEDGE_SKILL));

        mockMvc.perform(delete("/api/v1/skills/knowledge"))
                .andExpect(status().isNoContent());

        verify(skillLoader).deleteSkill("knowledge");
    }

    @Test
    void deleteSkill_notFound_returns404() throws Exception {
        given(skillLoader.getSkill("nonexistent")).willReturn(Optional.empty());

        mockMvc.perform(delete("/api/v1/skills/nonexistent"))
                .andExpect(status().isNotFound());
    }
}
