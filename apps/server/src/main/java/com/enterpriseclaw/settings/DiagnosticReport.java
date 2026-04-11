package com.enterpriseclaw.settings;

import java.util.List;

public record DiagnosticReport(String overallStatus, List<DiagnosticCheck> checks) {

    public record DiagnosticCheck(String name, String status, String message) {}
}
