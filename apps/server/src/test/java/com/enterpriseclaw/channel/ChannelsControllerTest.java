package com.enterpriseclaw.channel;

import com.enterpriseclaw.model.ChannelType;
import tools.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ChannelsController.class)
class ChannelsControllerTest {

    @Autowired
    MockMvc mockMvc;

    ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    ChannelConfigRepository configRepository;

    @MockitoBean
    ChannelManager channelManager;

    @Test
    void listChannels_returnsStatus() throws Exception {
        var status = new ChannelManager.ChannelStatus("id-1", "My Webhook", ChannelType.API, true, true);
        given(channelManager.getStatus()).willReturn(List.of(status));

        mockMvc.perform(get("/api/v1/channels"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("My Webhook"))
                .andExpect(jsonPath("$[0].channelType").value("API"));
    }

    @Test
    void createChannel_returnsCreated() throws Exception {
        given(configRepository.save(any(ChannelConfig.class))).willAnswer(inv -> inv.getArgument(0));

        String body = """
                {"name": "Test Channel", "channelType": "API", "configJson": "{\\"apiKey\\": \\"secret\\"}"}
                """;

        mockMvc.perform(post("/api/v1/channels")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Test Channel"))
                .andExpect(jsonPath("$.channelType").value("API"));
    }

    @Test
    void getChannel_notFound() throws Exception {
        given(configRepository.findById("missing")).willReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/channels/missing"))
                .andExpect(status().isNotFound());
    }

    @Test
    void deleteChannel_stopsAndDeletes() throws Exception {
        ChannelConfig config = ChannelConfig.builder()
                .id("ch-1")
                .name("Test")
                .channelType(ChannelType.API)
                .enabled(true)
                .createdAt(Instant.now())
                .build();
        given(configRepository.findById("ch-1")).willReturn(Optional.of(config));

        mockMvc.perform(delete("/api/v1/channels/ch-1"))
                .andExpect(status().isNoContent());

        verify(channelManager).stopChannel("ch-1");
        verify(configRepository).delete(config);
    }

    @Test
    void enableChannel_startsConnector() throws Exception {
        ChannelConfig config = ChannelConfig.builder()
                .id("ch-1")
                .name("Test")
                .channelType(ChannelType.API)
                .enabled(false)
                .createdAt(Instant.now())
                .build();
        given(configRepository.findById("ch-1")).willReturn(Optional.of(config));
        given(configRepository.save(any(ChannelConfig.class))).willAnswer(inv -> inv.getArgument(0));

        mockMvc.perform(post("/api/v1/channels/ch-1/enable"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enabled").value(true));

        verify(channelManager).startChannel(any(ChannelConfig.class));
    }
}
