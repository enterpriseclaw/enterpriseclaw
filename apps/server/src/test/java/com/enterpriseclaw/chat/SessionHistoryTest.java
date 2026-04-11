package com.enterpriseclaw.chat;

import com.enterpriseclaw.chat.dto.MessageSummary;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;

import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ChatController.class)
class SessionHistoryTest {

    @Autowired
    MockMvc mockMvc;

    @MockitoBean
    ChatService chatService;

    @Test
    void getSessionMessages_returnsMessageList() throws Exception {
        given(chatService.getSessionMessages("s1", 50, 0)).willReturn(List.of(
                new MessageSummary("m1", MessageRole.USER, "Hello", Instant.parse("2026-01-01T00:00:00Z")),
                new MessageSummary("m2", MessageRole.ASSISTANT, "Hi there", Instant.parse("2026-01-01T00:00:01Z"))
        ));

        mockMvc.perform(get("/api/v1/sessions/s1/messages"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].id").value("m1"))
                .andExpect(jsonPath("$[0].role").value("USER"))
                .andExpect(jsonPath("$[0].content").value("Hello"))
                .andExpect(jsonPath("$[1].id").value("m2"))
                .andExpect(jsonPath("$[1].role").value("ASSISTANT"));
    }

    @Test
    void getSessionMessages_withPagination() throws Exception {
        given(chatService.getSessionMessages("s1", 10, 5)).willReturn(List.of(
                new MessageSummary("m6", MessageRole.USER, "Msg 6", Instant.parse("2026-01-01T00:00:06Z"))
        ));

        mockMvc.perform(get("/api/v1/sessions/s1/messages?limit=10&offset=5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value("m6"));
    }

    @Test
    void getSessionMessages_emptySession() throws Exception {
        given(chatService.getSessionMessages("empty", 50, 0)).willReturn(List.of());

        mockMvc.perform(get("/api/v1/sessions/empty/messages"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void clearSessionMessages_returnsNoContent() throws Exception {
        mockMvc.perform(delete("/api/v1/sessions/s1/messages"))
                .andExpect(status().isNoContent());

        verify(chatService).clearSessionMessages("s1");
    }
}
