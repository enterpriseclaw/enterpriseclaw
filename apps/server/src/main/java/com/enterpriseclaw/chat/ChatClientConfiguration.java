package com.enterpriseclaw.chat;

import com.enterpriseclaw.chat.provider.CodexTokenProvider;
import com.enterpriseclaw.chat.provider.CopilotTokenProvider;
import com.enterpriseclaw.skills.GitHubSkill;
import com.enterpriseclaw.skills.IncidentSkill;
import com.enterpriseclaw.skills.KnowledgeSkill;
import org.springaicommunity.agent.tools.SkillsTool;
import org.springaicommunity.agent.tools.TodoWriteTool;
import org.springframework.ai.anthropic.AnthropicChatModel;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.ollama.OllamaChatModel;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.ai.openai.api.OpenAiApi;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.ToolCallbackProvider;
import org.springframework.ai.tool.function.FunctionToolCallback;
import org.springframework.ai.tool.method.MethodToolCallbackProvider;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

@Configuration
@EnableConfigurationProperties(EnterpriseChatProperties.class)
public class ChatClientConfiguration {

    @Value("${enterpriseclaw.skills.directory:../../skills}")
    private String skillsDirectory;

    @Bean
    public TodoWriteTool enterpriseTodoWriteTool() {
        return TodoWriteTool.builder()
                .todoEventHandler(todos -> {
                })
                .build();
    }

    @Bean
    public ToolCallbackProvider enterpriseToolCallbackProvider(
            KnowledgeSkill knowledgeSkill,
            IncidentSkill incidentSkill,
            GitHubSkill gitHubSkill,
            EnterpriseQuestionTool enterpriseQuestionTool,
            TodoWriteTool enterpriseTodoWriteTool) {
        return MethodToolCallbackProvider.builder()
                .toolObjects(
                        knowledgeSkill,
                        incidentSkill,
                        gitHubSkill,
                        enterpriseQuestionTool,
                        enterpriseTodoWriteTool
                )
                .build();
    }

    @Bean
    public ToolCallback enterpriseSkillsTool() {
        Path repoSkillsPath = Path.of(skillsDirectory);
        if (!Files.isDirectory(repoSkillsPath)) {
            return FunctionToolCallback.builder("Skill", command -> "No local skills are configured.")
                    .description("Returns the locally installed EnterpriseClaw skills.")
                    .inputType(String.class)
                    .build();
        }
        return SkillsTool.builder()
                .addSkillsDirectory(repoSkillsPath.toAbsolutePath().toString())
                .build();
    }

    @Bean
    @Qualifier("openAiChatClient")
    @ConditionalOnBean(OpenAiChatModel.class)
    public ChatClient openAiChatClient(OpenAiChatModel chatModel,
                                       ObjectProvider<ToolCallbackProvider> toolCallbackProviders,
                                       ObjectProvider<ToolCallback> toolCallbacks) {
        return ChatClient.builder(chatModel)
                .defaultToolCallbacks(allToolCallbacks(toolCallbackProviders, toolCallbacks))
                .build();
    }

    @Bean
    @Qualifier("anthropicChatClient")
    @ConditionalOnBean(AnthropicChatModel.class)
    public ChatClient anthropicChatClient(AnthropicChatModel chatModel,
                                          ObjectProvider<ToolCallbackProvider> toolCallbackProviders,
                                          ObjectProvider<ToolCallback> toolCallbacks) {
        return ChatClient.builder(chatModel)
                .defaultToolCallbacks(allToolCallbacks(toolCallbackProviders, toolCallbacks))
                .build();
    }

    @Bean
    @Qualifier("copilotChatClient")
    public ChatClient copilotChatClient(CopilotTokenProvider copilotTokenProvider,
                                        ObjectProvider<ToolCallbackProvider> toolCallbackProviders,
                                        ObjectProvider<ToolCallback> toolCallbacks) {
        if (!copilotTokenProvider.isAvailable()) {
            return null;
        }
        HttpHeaders headers = new HttpHeaders();
        headers.set("Openai-Intent", "conversation-edits");

        OpenAiApi copilotApi = OpenAiApi.builder()
                .baseUrl("https://api.githubcopilot.com")
                .apiKey(copilotTokenProvider.getToken())
                .headers(headers)
                .completionsPath("/chat/completions")
                .embeddingsPath("/v1/embeddings")
                .build();

        OpenAiChatModel copilotModel = OpenAiChatModel.builder()
                .openAiApi(copilotApi)
                .defaultOptions(OpenAiChatOptions.builder().model("gpt-4.1").build())
                .build();

        return ChatClient.builder(copilotModel)
                .defaultToolCallbacks(allToolCallbacks(toolCallbackProviders, toolCallbacks))
                .build();
    }

    @Bean
    @Qualifier("codexChatClient")
    public ChatClient codexChatClient(CodexTokenProvider codexTokenProvider,
                                      ObjectProvider<ToolCallbackProvider> toolCallbackProviders,
                                      ObjectProvider<ToolCallback> toolCallbacks) {
        if (!codexTokenProvider.isAvailable()) {
            return null;
        }
        OpenAiApi codexApi = OpenAiApi.builder()
                .baseUrl("https://api.openai.com")
                .apiKey(codexTokenProvider.getToken())
                .build();

        OpenAiChatModel codexModel = OpenAiChatModel.builder()
                .openAiApi(codexApi)
                .defaultOptions(OpenAiChatOptions.builder().model("gpt-5.4").build())
                .build();

        return ChatClient.builder(codexModel)
                .defaultToolCallbacks(allToolCallbacks(toolCallbackProviders, toolCallbacks))
                .build();
    }

    @Bean
    @Qualifier("ollamaChatClient")
    @ConditionalOnBean(OllamaChatModel.class)
    public ChatClient ollamaChatClient(OllamaChatModel chatModel,
                                       ObjectProvider<ToolCallbackProvider> toolCallbackProviders,
                                       ObjectProvider<ToolCallback> toolCallbacks) {
        return ChatClient.builder(chatModel)
                .defaultToolCallbacks(allToolCallbacks(toolCallbackProviders, toolCallbacks))
                .build();
    }

    @Bean
    public ToolCallback[] enterpriseToolCallbacks(ObjectProvider<ToolCallbackProvider> toolCallbackProviders,
                                                  ObjectProvider<ToolCallback> toolCallbacks) {
        return allToolCallbacks(toolCallbackProviders, toolCallbacks);
    }

    private ToolCallback[] allToolCallbacks(ObjectProvider<ToolCallbackProvider> toolCallbackProviders,
                                            ObjectProvider<ToolCallback> toolCallbacks) {
        List<ToolCallback> callbacks = new ArrayList<>();
        toolCallbackProviders.orderedStream()
                .forEach(provider -> callbacks.addAll(List.of(provider.getToolCallbacks())));
        toolCallbacks.orderedStream().forEach(callbacks::add);
        return callbacks.toArray(ToolCallback[]::new);
    }
}
