package com.enterpriseclaw.websocket.methods;

import com.enterpriseclaw.skills.SkillLoader;
import com.enterpriseclaw.skills.LoadedSkill;
import com.enterpriseclaw.websocket.rpc.RpcMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;

import java.util.Map;

@Component
public class SkillsDetailMethod implements RpcMethod {

    private final SkillLoader skillLoader;

    public SkillsDetailMethod(SkillLoader skillLoader) {
        this.skillLoader = skillLoader;
    }

    @Override
    public String methodName() {
        return "skills.detail";
    }

    @Override
    public Object execute(Map<String, Object> params, WebSocketSession session) {
        String name = (String) params.get("name");
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("name parameter is required");
        }

        LoadedSkill skill = skillLoader.getSkill(name)
                .orElseThrow(() -> new IllegalArgumentException("Skill not found: " + name));

        return Map.of(
                "name", skill.name(),
                "description", skill.description(),
                "markdownBody", skill.markdownBody(),
                "tools", skill.tools(),
                "provider", skill.name()
        );
    }
}
