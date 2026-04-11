package com.enterpriseclaw.settings;

import com.enterpriseclaw.chat.ModelRegistry;
import com.enterpriseclaw.chat.ModelRegistry.ProviderStatus;
import com.enterpriseclaw.skills.LoadedSkill;
import com.enterpriseclaw.skills.SkillLoader;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

@ExtendWith(MockitoExtension.class)
class DiagnosticServiceTest {

    @Mock EntityManager entityManager;
    @Mock ModelRegistry modelRegistry;
    @Mock SkillLoader skillLoader;

    @InjectMocks DiagnosticService diagnosticService;

    @Test
    void runDiagnostics_allHealthy() {
        Query query = mock(Query.class);
        given(entityManager.createNativeQuery("SELECT 1")).willReturn(query);
        given(query.getSingleResult()).willReturn(1);

        given(modelRegistry.getProviderStatuses()).willReturn(List.of(
                new ProviderStatus("openai", true, "API key configured")
        ));

        given(skillLoader.getLoadedSkills()).willReturn(List.of(
                new LoadedSkill("test-skill", "desc", "body", List.of())
        ));

        DiagnosticReport report = diagnosticService.runDiagnostics();

        assertThat(report.overallStatus()).isEqualTo("ok");
        assertThat(report.checks()).hasSize(3);
        assertThat(report.checks()).extracting(DiagnosticReport.DiagnosticCheck::status)
                .containsOnly("ok");
    }

    @Test
    void runDiagnostics_databaseFail() {
        given(entityManager.createNativeQuery("SELECT 1")).willThrow(new RuntimeException("Connection refused"));

        given(modelRegistry.getProviderStatuses()).willReturn(List.of());
        given(skillLoader.getLoadedSkills()).willReturn(List.of());

        DiagnosticReport report = diagnosticService.runDiagnostics();

        assertThat(report.overallStatus()).isEqualTo("fail");
        assertThat(report.checks().getFirst().name()).isEqualTo("database");
        assertThat(report.checks().getFirst().status()).isEqualTo("fail");
    }

    @Test
    void runDiagnostics_noSkillsIsWarning() {
        Query query = mock(Query.class);
        given(entityManager.createNativeQuery("SELECT 1")).willReturn(query);
        given(query.getSingleResult()).willReturn(1);

        given(modelRegistry.getProviderStatuses()).willReturn(List.of(
                new ProviderStatus("openai", true, "API key configured")
        ));

        given(skillLoader.getLoadedSkills()).willReturn(List.of());

        DiagnosticReport report = diagnosticService.runDiagnostics();

        assertThat(report.overallStatus()).isEqualTo("warn");
        DiagnosticReport.DiagnosticCheck skillCheck = report.checks().stream()
                .filter(c -> "skills".equals(c.name())).findFirst().orElseThrow();
        assertThat(skillCheck.status()).isEqualTo("warn");
    }

    @Test
    void runDiagnostics_providerUnavailableIsWarning() {
        Query query = mock(Query.class);
        given(entityManager.createNativeQuery("SELECT 1")).willReturn(query);
        given(query.getSingleResult()).willReturn(1);

        given(modelRegistry.getProviderStatuses()).willReturn(List.of(
                new ProviderStatus("openai", false, "No API key"),
                new ProviderStatus("ollama", false, "Ollama not reachable")
        ));

        given(skillLoader.getLoadedSkills()).willReturn(List.of(
                new LoadedSkill("test", "d", "b", List.of())
        ));

        DiagnosticReport report = diagnosticService.runDiagnostics();

        assertThat(report.overallStatus()).isEqualTo("warn");
    }
}
