package com.enterpriseclaw.settings;

import com.enterpriseclaw.chat.ModelRegistry;
import com.enterpriseclaw.chat.ModelRegistry.AvailableModel;
import com.enterpriseclaw.chat.ModelRegistry.ProviderStatus;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(SettingsController.class)
class SettingsControllerTest {

    @Autowired
    MockMvc mockMvc;

    @MockitoBean
    ModelRegistry modelRegistry;

    @MockitoBean
    DiagnosticService diagnosticService;

    @Test
    void getModels_returnsAvailableModelsWithCorrectShape() throws Exception {
        given(modelRegistry.getAvailableModels()).willReturn(List.of(
                new AvailableModel("gpt-4o", "GPT-4o", "openai", true),
                new AvailableModel("copilot:gpt-4.1", "Copilot GPT-4.1", "copilot", true)
        ));

        mockMvc.perform(get("/api/v1/settings/models"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].id").value("gpt-4o"))
                .andExpect(jsonPath("$[0].displayName").value("GPT-4o"))
                .andExpect(jsonPath("$[0].provider").value("openai"))
                .andExpect(jsonPath("$[0].available").value(true));
    }

    @Test
    void getAllModels_includesUnavailableModels() throws Exception {
        given(modelRegistry.getAllModels()).willReturn(List.of(
                new AvailableModel("gpt-4o", "GPT-4o", "openai", true),
                new AvailableModel("ollama:llama3.2", "Llama 3.2", "ollama", false)
        ));

        mockMvc.perform(get("/api/v1/settings/models/all"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[1].available").value(false));
    }

    @Test
    void getProviders_returnsProviderStatuses() throws Exception {
        given(modelRegistry.getProviderStatuses()).willReturn(List.of(
                new ProviderStatus("openai", true, "API key configured"),
                new ProviderStatus("ollama", false, "Ollama not reachable")
        ));

        mockMvc.perform(get("/api/v1/settings/providers"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].provider").value("openai"))
                .andExpect(jsonPath("$[0].available").value(true))
                .andExpect(jsonPath("$[0].reason").value("API key configured"))
                .andExpect(jsonPath("$[1].available").value(false));
    }

    @Test
    void refreshModels_callsRefreshAndReturnsModels() throws Exception {
        given(modelRegistry.getAvailableModels()).willReturn(List.of(
                new AvailableModel("gpt-4o", "GPT-4o", "openai", true)
        ));

        mockMvc.perform(post("/api/v1/settings/models/refresh"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));

        verify(modelRegistry).refresh();
    }

    @Test
    void getModels_emptyModels_returnsEmptyArray() throws Exception {
        given(modelRegistry.getAvailableModels()).willReturn(List.of());

        mockMvc.perform(get("/api/v1/settings/models"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }
}
