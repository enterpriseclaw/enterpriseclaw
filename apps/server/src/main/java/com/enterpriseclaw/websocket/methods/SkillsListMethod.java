package com.enterpriseclaw.websocket.methods;

import com.enterpriseclaw.skills.SkillRegistry;
import com.enterpriseclaw.websocket.rpc.RpcMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;

import java.util.Map;

@Component
public class SkillsListMethod implements RpcMethod {

    private final SkillRegistry skillRegistry;

    public SkillsListMethod(SkillRegistry skillRegistry) {
        this.skillRegistry = skillRegistry;
    }

    @Override
    public String methodName() {
        return "skills.list";
    }

    @Override
    public Object execute(Map<String, Object> params, WebSocketSession session) {
        return skillRegistry.getRegisteredSkills();
    }
}
