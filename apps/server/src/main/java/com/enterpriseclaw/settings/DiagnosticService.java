package com.enterpriseclaw.settings;

import com.enterpriseclaw.chat.ModelRegistry;
import com.enterpriseclaw.chat.ModelRegistry.ProviderStatus;
import com.enterpriseclaw.skills.SkillLoader;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class DiagnosticService {

    private final EntityManager entityManager;
    private final ModelRegistry modelRegistry;
    private final SkillLoader skillLoader;

    public DiagnosticReport runDiagnostics() {
        List<DiagnosticReport.DiagnosticCheck> checks = new ArrayList<>();

        checks.add(checkDatabase());

        for (ProviderStatus ps : modelRegistry.getProviderStatuses()) {
            checks.add(new DiagnosticReport.DiagnosticCheck(
                    ps.provider(),
                    ps.available() ? "ok" : "warn",
                    ps.reason()
            ));
        }

        checks.add(checkSkills());

        String overall = checks.stream().anyMatch(c -> "fail".equals(c.status())) ? "fail"
                : checks.stream().anyMatch(c -> "warn".equals(c.status())) ? "warn" : "ok";

        return new DiagnosticReport(overall, checks);
    }

    private DiagnosticReport.DiagnosticCheck checkDatabase() {
        try {
            entityManager.createNativeQuery("SELECT 1").getSingleResult();
            return new DiagnosticReport.DiagnosticCheck("database", "ok", "Connected");
        } catch (Exception e) {
            log.warn("Database health check failed: {}", e.getMessage());
            return new DiagnosticReport.DiagnosticCheck("database", "fail", "Unreachable: " + e.getMessage());
        }
    }

    private DiagnosticReport.DiagnosticCheck checkSkills() {
        int count = skillLoader.getLoadedSkills().size();
        return new DiagnosticReport.DiagnosticCheck(
                "skills",
                count > 0 ? "ok" : "warn",
                count + " skill(s) loaded"
        );
    }
}
