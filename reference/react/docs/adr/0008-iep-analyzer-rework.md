# ADR 0008: IEP Analyzer Rework & Cleanup

## Status
Proposed

## Context
The current implementation of the IEP Analyzer is highly fragmented and verbose. Key issues include:
- **State Fragmentation**: Multiple instances of the same hooks (`useAnalysisSession`, etc.) are created in both parent and child components, resulting in state not being shared (e.g., logs updated in one instance don't show up in the progress UI).
- **Excessive Boilerplate**: Redundant "Container" patterns (`IEPAnalyze` vs `IEPAnalyzer` folders) that merely pass props without adding significant logic.
- **Workflow Persistence**: Only the current step is persisted in session storage. Actual analysis data (logs, extraction results, corrections) is lost on page refresh.
- **Navigational Rigidity**: Hardcoded step flow makes it difficult to implement "Back" buttons or jump between steps safely.

## Decisions

### 1. Unified Analysis Context
We will move from isolated hooks to a single `IEPAnalyzerProvider` (Context API). This will ensure:
- A single source of truth for the entire analysis workflow.
- Direct access to state/methods for all sub-components without prop-drilling or container mirroring.
- Ability to persist the entire session state (using `useSessionStorage` for the whole context state).

### 2. Component Structure Logic
- **`IEPAnalyzerPage`**: Acts as the host, managing the Stepper and the Context Provider.
- **`WorkflowSteps/`**: A single folder containing pure presentational steps and a coordinator.
- **Removals**: Delete the redundant `IEPAnalyze/` container folder and merge required logic into the context or the steps themselves.

### 3. State Management & Navigation
- Implement a `useWorkflow` navigation hook within the context that handles `next()`, `previous()`, and `reset()`.
- The `reset()` function will explicitly clear all session storage related to the analysis, satisfying the "clear last" requirement when starting new work.
- Use pure functions for data transformations (e.g., mapping raw extraction data to the review form).

### 4. Simplified Service Integration
- Move API orchestration (upload -> analyze -> poll -> review -> finalize) into a dedicated workflow manager or direct context methods to keep the UI components clean.

## Benefits
- **Shared State**: UI updates (logs, progress) will correctly reflect in all components.
- **Less Verbose**: Estimated 40% reduction in boilerplate by removing containers.
- **Reliability**: Users can refresh the page without losing their analysis progress.
- **Maintainability**: Clearer separation between workflow logic and presentational UI.

## File Changes Overview
- Create `src/app/pages/IEPAnalyzer/context/IEPAnalyzerContext.tsx`
- Refactor `IEPAnalyzerPage.tsx` to use the new context.
- Consolidate components into `src/app/pages/IEPAnalyzer/steps/`.
- Remove `src/app/pages/IEPAnalyze/`.
