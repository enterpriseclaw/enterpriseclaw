package com.enterpriseclaw.websocket.methods;

import com.enterpriseclaw.skills.SkillLoader;
import com.enterpriseclaw.websocket.rpc.RpcMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;

import java.util.Map;

@Component
public class SkillsRescanMethod implements RpcMethod {

    private final SkillLoader skillLoader;

    public SkillsRescanMethod(SkillLoader skillLoader) {
        this.skillLoader = skillLoader;
    }

    @Override
    public String methodName() {
        return "skills.rescan";
    }

    @Override
    public Object execute(Map<String, Object> params, WebSocketSession session) {
        skillLoader.rescan();
        return Map.of("count", skillLoader.getLoadedSkills().size());
    }
}
