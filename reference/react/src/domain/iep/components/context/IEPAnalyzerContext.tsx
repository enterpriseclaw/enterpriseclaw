import React, { createContext, useContext, useCallback, useState, useEffect } from "react";
import type { 
  ExtractedGoal, 
  ExtractedService, 
  Correction, 
  FinalizationResult 
} from "@/domain/iep/types.ts";

export type Step = 'upload' | 'analyze' | 'review' | 'finalize';

export interface ConfidenceScores {
  overall: number;
  dates: number;
  goals: number;
  services: number;
}

export interface ExtractionData {
  studentName: string;
  studentDob: string;
  grade: string;
  schoolYear: string;
  iepStartDate: string;
  iepEndDate: string;
  iepMeetingDate: string;
  primaryDisability: string;
  goals: ExtractedGoal[];
  services: ExtractedService[];
  accommodations: string[];
  modifications: string[];
  confidence: ConfidenceScores;
}

interface AnalyzerState {
  step: Step;
  childId: string;
  documentId: string;
  fileName: string;
  logs: string[];
  progress: number;
  stage: string;
  extractionData: ExtractionData | null;
  corrections: Correction[];
  isFinalized: boolean;
  finalResult: FinalizationResult | null;
}

const INITIAL_STATE: AnalyzerState = {
  step: 'upload',
  childId: '',
  documentId: '',
  fileName: '',
  logs: [],
  progress: 0,
  stage: '',
  extractionData: null,
  corrections: [],
  isFinalized: false,
  finalResult: null,
};

interface AnalyzerContextType extends AnalyzerState {
  setStep: (step: Step) => void;
  setChildId: (id: string) => void;
  setDocumentInfo: (id: string, name: string) => void;
  addLog: (message: string) => void;
  setProgress: (progress: number) => void;
  setStage: (stage: string) => void;
  setExtraction: (data: ExtractionData) => void;
  addCorrection: (correction: Correction) => void;
  setFinalized: (result: FinalizationResult) => void;
  reset: () => void;
  clearLast: () => void;
  next: () => void;
  previous: () => void;
}

const AnalyzerContext = createContext<AnalyzerContextType | null>(null);

const SESSION_KEY = 'askiep.analyzer.state';

/** Load persisted state from sessionStorage, falling back to INITIAL_STATE */
function loadPersistedState(): AnalyzerState {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return INITIAL_STATE;
    const parsed = JSON.parse(raw) as AnalyzerState;
    // Don't restore an in-progress analysis — that stream is gone
    if (parsed.step === 'analyze') return { ...parsed, step: 'upload', logs: [], progress: 0 };
    return parsed;
  } catch {
    return INITIAL_STATE;
  }
}

export function IEPAnalyzerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AnalyzerState>(loadPersistedState);

  // Persist state to sessionStorage on every change
  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
    } catch {
      /* storage quota exceeded or private browse — ignore */
    }
  }, [state]);

  const setStep = useCallback((step: Step) => 
    setState(prev => ({ ...prev, step })), [setState]);

  const setChildId = useCallback((childId: string) => 
    setState(prev => ({ ...prev, childId })), [setState]);

  const setDocumentInfo = useCallback((documentId: string, fileName: string) => 
    setState(prev => ({ ...prev, documentId, fileName })), [setState]);

  const addLog = useCallback((message: string) => 
    setState(prev => ({ ...prev, logs: [...prev.logs, message] })), [setState]);

  const setProgress = useCallback((progress: number) => 
    setState(prev => ({ ...prev, progress })), [setState]);

  const setStage = useCallback((stage: string) => 
    setState(prev => ({ ...prev, stage })), [setState]);

  const setExtraction = useCallback((extractionData: ExtractionData) => 
    setState(prev => ({ ...prev, extractionData })), [setState]);

  const addCorrection = useCallback((correction: Correction) => 
    setState(prev => ({ 
      ...prev, 
      corrections: [...prev.corrections.filter(c => c.field !== correction.field), correction] 
    })), [setState]);

  const setFinalized = useCallback((finalResult: FinalizationResult) => 
    setState(prev => ({ ...prev, isFinalized: true, finalResult })), [setState]);

  const reset = useCallback(() => {
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
    setState(INITIAL_STATE);
  }, [setState]);

  const clearLast = useCallback(() => {
    setState(prev => ({
      ...INITIAL_STATE,
      childId: prev.childId // Keep child if wanted, or clear all
    }));
  }, [setState]);

  const next = useCallback(() => {
    const steps: Step[] = ['upload', 'analyze', 'review', 'finalize'];
    const currentIndex = steps.indexOf(state.step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  }, [state.step, setStep]);

  const previous = useCallback(() => {
    const steps: Step[] = ['upload', 'analyze', 'review', 'finalize'];
    const currentIndex = steps.indexOf(state.step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  }, [state.step, setStep]);

  const value = {
    ...state,
    setStep,
    setChildId,
    setDocumentInfo,
    addLog,
    setProgress,
    setStage,
    setExtraction,
    addCorrection,
    setFinalized,
    reset,
    clearLast,
    next,
    previous,
  };

  return <AnalyzerContext.Provider value={value}>{children}</AnalyzerContext.Provider>;
}

export function useIEPAnalyzer() {
  const context = useContext(AnalyzerContext);
  if (!context) {
    throw new Error("useIEPAnalyzer must be used within an IEPAnalyzerProvider");
  }
  return context;
}
