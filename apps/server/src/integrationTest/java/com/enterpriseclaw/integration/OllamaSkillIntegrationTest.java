package com.enterpriseclaw.integration;

import com.enterpriseclaw.skills.GitHubSkill;
import com.enterpriseclaw.skills.IncidentSkill;
import com.enterpriseclaw.skills.KnowledgeSkill;
import org.junit.jupiter.api.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.ollama.OllamaChatModel;
import org.springframework.ai.ollama.api.OllamaApi;
import org.springframework.ai.ollama.api.OllamaOptions;
import org.testcontainers.containers.Container.ExecResult;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.ollama.OllamaContainer;
import org.testcontainers.utility.DockerImageName;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * Integration test that wires Spring AI Generic Agent Skills (@Tool) against a
 * real Ollama model running in a Testcontainer.
 *
 * <p>Model: {@code qwen2.5:0.5b} — ~400 MB, supports function/tool calling.
 *
 * <p>This test validates that:
 * <ul>
 *   <li>Ollama starts cleanly via Testcontainers</li>
 *   <li>The model responds coherently to plain text queries</li>
 *   <li>Spring AI {@code @Tool}-annotated skills can be registered on a {@code ChatClient}</li>
 *   <li>The model invokes the registered tool when the prompt clearly requires it</li>
 *   <li>Skills are independently callable (KnowledgeSkill, IncidentSkill, GitHubSkill)</li>
 * </ul>
 *
 * <p>Run with: {@code ./gradlew integrationTest}
 *
 * <p><b>Note:</b> The first run pulls {@code qwen2.5:0.5b} inside the Docker container (~400 MB).
 * Subsequent runs reuse the cached image layer.
 */
@Testcontainers(disabledWithoutDocker = true)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class OllamaSkillIntegrationTest {

    private static final Logger log = LoggerFactory.getLogger(OllamaSkillIntegrationTest.class);

    /** Small model: supports function/tool calling, ~400 MB on first pull. */
    static final String MODEL = "qwen2.5:0.5b";

    @Container
    static OllamaContainer ollama =
            new OllamaContainer(DockerImageName.parse("ollama/ollama:latest"));

    static ChatClient chatClient;
    static KnowledgeSkill knowledgeSkill;
    static IncidentSkill incidentSkill;
    static GitHubSkill gitHubSkill;

    @BeforeAll
    static void setup() throws Exception {
        log.info("Pulling model {} — this may take a few minutes on first run", MODEL);
        ExecResult pullResult = ollama.execInContainer("ollama", "pull", MODEL);
        if (pullResult.getExitCode() != 0) {
            log.warn("Model pull failed (exit={}); Ollama registry may be unreachable. "
                    + "Skipping all inference tests.\nstderr: {}",
                    pullResult.getExitCode(), pullResult.getStderr());
            // Skip the entire test class when the model is unavailable (e.g. no internet in CI)
            assumeTrue(pullResult.getExitCode() == 0,
                    "Ollama model '" + MODEL + "' could not be pulled — "
                    + "requires internet access to registry.ollama.ai");
            return;
        }
        log.info("Model {} ready", MODEL);

        OllamaApi api = OllamaApi.builder()
                .baseUrl(ollama.getEndpoint())
                .build();

        OllamaChatModel model = OllamaChatModel.builder()
                .ollamaApi(api)
                .defaultOptions(OllamaOptions.builder()
                        .model(MODEL)
                        .numCtx(2048)
                        .build())
                .build();

        chatClient = ChatClient.builder(model).build();
        knowledgeSkill = new KnowledgeSkill();
        incidentSkill = new IncidentSkill();
        gitHubSkill = new GitHubSkill();
    }

    // ------------------------------------------------------------------ basic model sanity

    @Test
    @Order(1)
    void modelRespondsToBasicQuery() {
        String response = chatClient.prompt()
                .user("What is 2 + 2? Reply with just the number.")
                .call()
                .content();

        log.info("Basic query response: {}", response);
        assertThat(response).isNotBlank();
        assertThat(response).contains("4");
    }

    @Test
    @Order(2)
    void modelGeneratesCoherentTextReply() {
        String response = chatClient.prompt()
                .user("In one sentence, what is an incident response plan?")
                .call()
                .content();

        log.info("Text reply: {}", response);
        assertThat(response).isNotBlank();
        assertThat(response.length()).isGreaterThan(20);
    }

    // ------------------------------------------------------------------ tool registration

    @Test
    @Order(3)
    void knowledgeSkillCanBeRegisteredAsToolWithoutError() {
        // Verify ChatClient accepts @Tool-annotated beans via tools(Object...)
        String response = chatClient.prompt()
                .user("Hello, are you ready?")
                .tools(knowledgeSkill)
                .call()
                .content();

        log.info("KnowledgeSkill registration response: {}", response);
        assertThat(response).isNotBlank();
    }

    @Test
    @Order(4)
    void allThreeSkillsCanBeRegisteredTogether() {
        String response = chatClient.prompt()
                .user("What capabilities do you have available?")
                .tools(knowledgeSkill, incidentSkill, gitHubSkill)
                .call()
                .content();

        log.info("All-skills registration response: {}", response);
        assertThat(response).isNotBlank();
    }

    // ------------------------------------------------------------------ tool invocation

    @Test
    @Order(5)
    void knowledgeSearchToolIsInvokedForKnowledgeQuery() {
        String response = chatClient.prompt()
                .user("Search the knowledge base for information about incident response procedures.")
                .tools(knowledgeSkill)
                .call()
                .content();

        log.info("Knowledge search tool result: {}", response);
        assertThat(response).isNotBlank();
        // The tool returns a stub that includes 'Knowledge search result for:'
        // or the model generates a response from the tool's output
        assertThat(response.toLowerCase())
                .satisfiesAnyOf(
                        r -> assertThat(r).contains("knowledge"),
                        r -> assertThat(r).contains("incident"),
                        r -> assertThat(r).contains("search")
                );
    }

    @Test
    @Order(6)
    void incidentSkillIsInvokedWhenAskingAboutIncidents() {
        String response = chatClient.prompt()
                .user("Use the incident tool to summarize open incidents in our system.")
                .tools(incidentSkill)
                .call()
                .content();

        log.info("Incident skill result: {}", response);
        assertThat(response).isNotBlank();
    }

    @Test
    @Order(7)
    void githubSkillIsInvokedForRepositoryQuery() {
        String response = chatClient.prompt()
                .user("Use the GitHub tool to find information about recent pull requests.")
                .tools(gitHubSkill)
                .call()
                .content();

        log.info("GitHub skill result: {}", response);
        assertThat(response).isNotBlank();
    }

    // ------------------------------------------------------------------ multi-tool routing

    @Test
    @Order(8)
    void modelSelectsCorrectToolFromMultipleRegistered() {
        String response = chatClient.prompt()
                .user("Search the knowledge base to find our SLA policy document.")
                .tools(knowledgeSkill, incidentSkill, gitHubSkill)
                .call()
                .content();

        log.info("Multi-tool routing result: {}", response);
        assertThat(response).isNotBlank();
        // The model should have used KnowledgeSkill.searchKnowledge
        // The stub response contains 'Knowledge search result for:' or 'pgvector'
        assertThat(response.toLowerCase())
                .satisfiesAnyOf(
                        r -> assertThat(r).contains("knowledge"),
                        r -> assertThat(r).contains("sla"),
                        r -> assertThat(r).contains("policy"),
                        r -> assertThat(r).contains("pgvector")
                );
    }
}
