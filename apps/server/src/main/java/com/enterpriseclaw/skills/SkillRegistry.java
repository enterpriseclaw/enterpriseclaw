package com.enterpriseclaw.skills;

import org.springframework.ai.tool.annotation.Tool;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.List;

/**
 * Registry of all Generic Agent Skills available in this deployment.
 * Scans known skill beans for @Tool-annotated methods following the
 * Spring AI Generic Agent Skills pattern.
 */
@Component
public class SkillRegistry {

    private final List<Object> skillBeans;
    private final SkillLoader skillLoader;

    public SkillRegistry(KnowledgeSkill knowledgeSkill, IncidentSkill incidentSkill, GitHubSkill gitHubSkill,
                         SkillLoader skillLoader) {
        this.skillBeans = List.of(knowledgeSkill, incidentSkill, gitHubSkill);
        this.skillLoader = skillLoader;
    }

    public List<SkillInfo> getRegisteredSkills() {
        List<SkillInfo> skills = new ArrayList<>();
        for (Object bean : skillBeans) {
            for (Method method : bean.getClass().getMethods()) {
                Tool tool = method.getAnnotation(Tool.class);
                if (tool != null) {
                    skills.add(new SkillInfo(
                            bean.getClass().getSimpleName() + "." + method.getName(),
                            tool.description(),
                            bean.getClass().getSimpleName()
                    ));
                }
            }
        }
        for (LoadedSkill loaded : skillLoader.getLoadedSkills()) {
            for (LoadedSkill.ToolDefinition toolDef : loaded.tools()) {
                skills.add(new SkillInfo(
                        loaded.name() + "." + toolDef.name(),
                        toolDef.description(),
                        loaded.name()
                ));
            }
        }
        return skills;
    }

    public record SkillInfo(String name, String description, String provider) {}
}
