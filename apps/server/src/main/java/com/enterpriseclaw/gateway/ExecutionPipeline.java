package com.enterpriseclaw.gateway;

import com.enterpriseclaw.model.ExecutionRequest;
import com.enterpriseclaw.model.ExecutionResult;
import com.enterpriseclaw.model.IncomingChannelRequest;

/**
 * Contract for the enterprise execution pipeline:
 *
 * Channel Input
 * → Context Extraction
 * → Identity Resolution
 * → Policy Evaluation
 * → Visible Tools/Skills Resolution
 * → MCP Invocation
 * → Response Formatting
 * → Audit Persist
 */
public interface ExecutionPipeline {

    /**
     * Execute the full pipeline for an incoming channel request.
     * This is the primary entry point for all channels.
     */
    ExecutionResult execute(IncomingChannelRequest request);

    /**
     * Execute when the request has already been authorized (e.g., from internal services).
     */
    ExecutionResult executeAuthorized(ExecutionRequest request);
}
