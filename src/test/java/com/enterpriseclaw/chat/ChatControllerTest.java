package com.enterpriseclaw.chat;

import com.enterpriseclaw.chat.dto.ChatEvent;
import com.enterpriseclaw.chat.dto.ChatRequest;
import com.enterpriseclaw.chat.dto.SessionSummary;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyEmitter;

import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.asyncDispatch;

@WebMvcTest(ChatController.class)
class ChatControllerTest {

    @Autowired
    MockMvc mockMvc;

    ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    ChatService chatService;

    @Test
    void postChat_returnsNdjsonStream() throws Exception {
        given(chatService.streamChat(any())).willReturn(
                stubNdjsonEmitter(
                        ChatEvent.token("Hello "),
                        ChatEvent.token("world"),
                        ChatEvent.done()
                )
        );

        // ResponseBodyEmitter requires async dispatch in MockMvc
        MvcResult asyncResult = mockMvc.perform(post("/api/v1/chat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"sessionId":"s1","message":"hi","model":"gpt-4o"}
                                """))
                .andReturn();

        mockMvc.perform(asyncDispatch(asyncResult))
                .andExpect(status().isOk());

        String body = asyncResult.getResponse().getContentAsString();
        List<String> types = parseNdjsonTypes(body);
        assertThat(types).containsSubsequence("token", "done");
    }

    @Test
    void postSessions_createsSession() throws Exception {
        given(chatService.createSession()).willReturn(
                new SessionSummary("session-1", null, Instant.now())
        );

        mockMvc.perform(post("/api/v1/sessions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sessionId").value("session-1"));
    }

    @Test
    void getSessions_returnsSessionList() throws Exception {
        given(chatService.listSessions()).willReturn(List.of(
                new SessionSummary("s1", "First chat", Instant.now()),
                new SessionSummary("s2", "Second chat", Instant.now())
        ));

        mockMvc.perform(get("/api/v1/sessions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].sessionId").value("s1"));
    }

    @Test
    void deleteSession_returnsNoContent() throws Exception {
        mockMvc.perform(delete("/api/v1/sessions/s1"))
                .andExpect(status().isNoContent());
    }

    @Test
    void postChat_validatesRequestBody() throws Exception {
        mockMvc.perform(post("/api/v1/chat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sessionId\":\"\",\"message\":\"\",\"model\":\"gpt-4o\"}"))
                .andExpect(status().isBadRequest());
    }

    // ---- helpers ----

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

    private List<String> parseNdjsonTypes(String body) {
        return Arrays.stream(body.split("\n"))
                .filter(line -> !line.isBlank())
                .map(line -> {
                    try {
                        return new ObjectMapper().readTree(line).get("type").asText();
                    } catch (Exception e) {
                        return "parse-error";
                    }
                })
                .collect(Collectors.toList());
    }
}
