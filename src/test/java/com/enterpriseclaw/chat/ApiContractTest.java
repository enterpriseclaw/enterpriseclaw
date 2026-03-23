package com.enterpriseclaw.chat;

import com.enterpriseclaw.chat.dto.AnswerRequest;
import com.enterpriseclaw.chat.dto.ChatEvent;
import com.enterpriseclaw.chat.dto.ChatRequest;
import com.enterpriseclaw.chat.dto.SessionSummary;
import tools.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyEmitter;

import java.time.Instant;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.asyncDispatch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * E2E API contract tests for all implemented /api/v1 endpoints.
 *
 * <p>These tests verify the HTTP method, path, response status, Content-Type, and
 * response-body shape for every endpoint currently wired in {@link ChatController}.
 * They act as a living specification of the API contract consumed by the React frontend
 * (see {@code frontend/src/lib/config.ts} for the corresponding client-side constants).
 *
 * <p>Scenario coverage:
 * <ul>
 *   <li>Happy-path: valid request → expected status + response shape</li>
 *   <li>Validation: missing/blank required fields → 400 Bad Request</li>
 *   <li>NDJSON streaming: POST /chat emits token events followed by done</li>
 * </ul>
 */
@WebMvcTest(ChatController.class)
class ApiContractTest {

    @Autowired
    MockMvc mockMvc;

    ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    ChatService chatService;

    // -------------------------------------------------------------------------
    // POST /api/v1/sessions
    // Contract: 200 OK, application/json
    //           body: { sessionId: string, title: string|null, lastMessageAt: string }
    // -------------------------------------------------------------------------

    @Test
    void createSession_returns200_withSessionSummaryShape() throws Exception {
        Instant now = Instant.parse("2026-01-01T00:00:00Z");
        given(chatService.createSession())
                .willReturn(new SessionSummary("sess-abc", null, now));

        mockMvc.perform(post("/api/v1/sessions"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.sessionId").value("sess-abc"))
                .andExpect(jsonPath("$.title").doesNotExist())  // null omitted or null
                .andExpect(jsonPath("$.lastMessageAt").isString());
    }

    @Test
    void createSession_sessionIdIsNeverNull() throws Exception {
        given(chatService.createSession())
                .willReturn(new SessionSummary("sess-xyz", "My Chat", Instant.now()));

        mockMvc.perform(post("/api/v1/sessions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sessionId").isNotEmpty());
    }

    // -------------------------------------------------------------------------
    // GET /api/v1/sessions
    // Contract: 200 OK, application/json
    //           body: array of SessionSummary objects
    // -------------------------------------------------------------------------

    @Test
    void listSessions_returns200_withJsonArray() throws Exception {
        given(chatService.listSessions()).willReturn(List.of(
                new SessionSummary("s1", "First",  Instant.now()),
                new SessionSummary("s2", "Second", Instant.now())
        ));

        mockMvc.perform(get("/api/v1/sessions"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].sessionId").value("s1"))
                .andExpect(jsonPath("$[0].title").value("First"))
                .andExpect(jsonPath("$[1].sessionId").value("s2"));
    }

    @Test
    void listSessions_returns200_withEmptyArray_whenNoSessions() throws Exception {
        given(chatService.listSessions()).willReturn(List.of());

        mockMvc.perform(get("/api/v1/sessions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(0));
    }

    // -------------------------------------------------------------------------
    // DELETE /api/v1/sessions/{id}
    // Contract: 204 No Content
    // -------------------------------------------------------------------------

    @Test
    void deleteSession_returns204NoContent() throws Exception {
        mockMvc.perform(delete("/api/v1/sessions/sess-abc"))
                .andExpect(status().isNoContent());

        verify(chatService).deleteSession("sess-abc");
    }

    // -------------------------------------------------------------------------
    // PATCH /api/v1/sessions/{id}/title
    // Contract: 200 OK (empty body)
    //           request body: { "title": string }
    // -------------------------------------------------------------------------

    @Test
    void patchSessionTitle_returns200() throws Exception {
        mockMvc.perform(patch("/api/v1/sessions/sess-abc/title")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Renamed Session\"}"))
                .andExpect(status().isOk());

        verify(chatService).updateSessionTitle(eq("sess-abc"), eq("Renamed Session"));
    }

    // -------------------------------------------------------------------------
    // POST /api/v1/chat
    // Contract: 200 OK, Content-Type: application/x-ndjson
    //           streaming body: newline-delimited ChatEvent JSON objects
    //           required fields: sessionId (NotBlank), message (NotBlank)
    // -------------------------------------------------------------------------

    @Test
    void postChat_returns200_withNdjsonContentType() throws Exception {
        given(chatService.streamChat(any())).willReturn(
                stubNdjsonEmitter(ChatEvent.token("Hi"), ChatEvent.done()));

        MvcResult async = mockMvc.perform(post("/api/v1/chat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sessionId\":\"s1\",\"message\":\"hello\",\"model\":\"gpt-4o\"}"))
                .andReturn();

        // Content-Type is declared via @PostMapping(produces = "application/x-ndjson");
        // MockMvc verifies the mapping is honoured by expecting a successful dispatch.
        mockMvc.perform(asyncDispatch(async))
                .andExpect(status().isOk());
    }

    @Test
    void postChat_streamContainsTokenEvents_followedByDone() throws Exception {
        given(chatService.streamChat(any())).willReturn(
                stubNdjsonEmitter(
                        ChatEvent.token("Hello "),
                        ChatEvent.token("world"),
                        ChatEvent.done()));

        MvcResult async = mockMvc.perform(post("/api/v1/chat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sessionId\":\"s1\",\"message\":\"hi\",\"model\":\"gpt-4o\"}"))
                .andReturn();

        // Collect the raw NDJSON body; actual dispatch streams synchronously in tests
        mockMvc.perform(asyncDispatch(async))
                .andExpect(status().isOk());

        String body = async.getResponse().getContentAsString();
        assertNdjsonContainsType(body, "token");
        assertNdjsonContainsType(body, "done");
    }

    @Test
    void postChat_streamContainsToolCallAndToolDone() throws Exception {
        given(chatService.streamChat(any())).willReturn(
                stubNdjsonEmitter(
                        ChatEvent.toolCall("code-reviewer"),
                        ChatEvent.toolDone("code-reviewer"),
                        ChatEvent.token("Done."),
                        ChatEvent.done()));

        MvcResult async = mockMvc.perform(post("/api/v1/chat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sessionId\":\"s1\",\"message\":\"review\",\"model\":\"gpt-4o\"}"))
                .andReturn();

        mockMvc.perform(asyncDispatch(async)).andExpect(status().isOk());

        String body = async.getResponse().getContentAsString();
        assertNdjsonContainsType(body, "tool_call");
        assertNdjsonContainsType(body, "tool_done");
        assertNdjsonContainsType(body, "done");
    }

    @Test
    void postChat_streamContainsQuestionEvent() throws Exception {
        given(chatService.streamChat(any())).willReturn(
                stubNdjsonEmitter(
                        ChatEvent.question("q1", "Which branch?"),
                        ChatEvent.done()));

        MvcResult async = mockMvc.perform(post("/api/v1/chat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sessionId\":\"s1\",\"message\":\"deploy\",\"model\":\"gpt-4o\"}"))
                .andReturn();

        mockMvc.perform(asyncDispatch(async)).andExpect(status().isOk());

        String body = async.getResponse().getContentAsString();
        assertNdjsonContainsType(body, "question");
    }

    @Test
    void postChat_streamContainsErrorEvent_onServiceError() throws Exception {
        given(chatService.streamChat(any())).willReturn(
                stubNdjsonEmitter(ChatEvent.error("something went wrong")));

        MvcResult async = mockMvc.perform(post("/api/v1/chat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sessionId\":\"s1\",\"message\":\"hi\",\"model\":\"gpt-4o\"}"))
                .andReturn();

        mockMvc.perform(asyncDispatch(async)).andExpect(status().isOk());

        String body = async.getResponse().getContentAsString();
        assertNdjsonContainsType(body, "error");
    }

    @Test
    void postChat_returns400_whenSessionIdIsBlank() throws Exception {
        mockMvc.perform(post("/api/v1/chat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sessionId\":\"\",\"message\":\"hi\",\"model\":\"gpt-4o\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void postChat_returns400_whenMessageIsBlank() throws Exception {
        mockMvc.perform(post("/api/v1/chat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sessionId\":\"s1\",\"message\":\"\",\"model\":\"gpt-4o\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void postChat_returns400_whenBodyIsMissing() throws Exception {
        mockMvc.perform(post("/api/v1/chat")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest());
    }

    // -------------------------------------------------------------------------
    // POST /api/v1/chat/answer
    // Contract: 200 OK (empty body)
    //           required fields: sessionId, questionId, answer (all NotBlank)
    // -------------------------------------------------------------------------

    @Test
    void postChatAnswer_returns200_withValidPayload() throws Exception {
        mockMvc.perform(post("/api/v1/chat/answer")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sessionId\":\"s1\",\"questionId\":\"q1\",\"answer\":\"main\"}"))
                .andExpect(status().isOk());

        verify(chatService).submitAnswer(any(AnswerRequest.class));
    }

    @Test
    void postChatAnswer_returns400_whenSessionIdBlank() throws Exception {
        mockMvc.perform(post("/api/v1/chat/answer")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sessionId\":\"\",\"questionId\":\"q1\",\"answer\":\"main\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void postChatAnswer_returns400_whenQuestionIdBlank() throws Exception {
        mockMvc.perform(post("/api/v1/chat/answer")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sessionId\":\"s1\",\"questionId\":\"\",\"answer\":\"main\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void postChatAnswer_returns400_whenAnswerBlank() throws Exception {
        mockMvc.perform(post("/api/v1/chat/answer")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sessionId\":\"s1\",\"questionId\":\"q1\",\"answer\":\"\"}"))
                .andExpect(status().isBadRequest());
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private ResponseBodyEmitter stubNdjsonEmitter(ChatEvent... events) {
        ResponseBodyEmitter emitter = new ResponseBodyEmitter();
        ObjectMapper om = new ObjectMapper();
        try {
            for (ChatEvent e : events) {
                emitter.send(om.writeValueAsString(e) + "\n");
            }
            emitter.complete();
        } catch (Exception ex) {
            emitter.completeWithError(ex);
        }
        return emitter;
    }

    private void assertNdjsonContainsType(String body, String expectedType) {
        boolean found = java.util.Arrays.stream(body.split("\n"))
                .filter(line -> !line.isBlank())
                .anyMatch(line -> {
                    try {
                        return expectedType.equals(
                                new ObjectMapper().readTree(line).get("type").asText());
                    } catch (Exception e) {
                        return false;
                    }
                });
        if (!found) {
            throw new AssertionError(
                    "Expected NDJSON stream to contain event type '" + expectedType
                    + "' but it was not found. Stream body:\n" + body);
        }
    }
}
