package com.enterpriseclaw.chat;

import org.springaicommunity.agent.tools.AskUserQuestionTool;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class EnterpriseQuestionTool {

    private final InteractiveQuestionStore questionStore;

    public EnterpriseQuestionTool(InteractiveQuestionStore questionStore) {
        this.questionStore = questionStore;
    }

    @Tool(name = "AskUserQuestionTool", description = """
            Use this tool when the assistant needs the user to make a decision before execution can continue.
            EnterpriseClaw will surface the question in the chat UI and pause the current response.
            """)
    public String askUserQuestion(
            @ToolParam(description = "Questions to ask the user") List<AskUserQuestionTool.Question> questions) {
        throw questionStore.raise(questions);
    }
}
