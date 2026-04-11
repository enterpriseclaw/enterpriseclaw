package com.enterpriseclaw.settings;

import com.enterpriseclaw.chat.ModelRegistry;
import com.enterpriseclaw.chat.ModelRegistry.AvailableModel;
import com.enterpriseclaw.chat.ModelRegistry.ProviderStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/settings")
@RequiredArgsConstructor
public class SettingsController {

    private final ModelRegistry modelRegistry;
    private final DiagnosticService diagnosticService;

    @GetMapping("/models")
    public List<AvailableModel> getAvailableModels() {
        return modelRegistry.getAvailableModels();
    }

    @GetMapping("/models/all")
    public List<AvailableModel> getAllModels() {
        return modelRegistry.getAllModels();
    }

    @GetMapping("/providers")
    public List<ProviderStatus> getProviderStatuses() {
        return modelRegistry.getProviderStatuses();
    }

    @PostMapping("/models/refresh")
    public List<AvailableModel> refreshModels() {
        modelRegistry.refresh();
        return modelRegistry.getAvailableModels();
    }

    @GetMapping("/doctor")
    public DiagnosticReport doctor() {
        return diagnosticService.runDiagnostics();
    }
}
