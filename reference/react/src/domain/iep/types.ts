export interface IEP {
  id: string;
  childId: string;
  startDate: string;
  endDate: string;
  goals: string[];
  accommodations: string[];
  services: string[];
  notes?: string;
}

export type CreateIEPData = Omit<IEP, "id">;
export type UpdateIEPData = Partial<CreateIEPData>;

export interface IEPAnalysisResult {
  summary: string;
  strengths: string[];
  concerns: string[];
  recommendations: string[];
}
// Enhanced document with status tracking
export interface DocumentListItem extends IEP {
  originalFileName: string;
  fileName: string;
  documentType: 'iep' | 'progress_report' | 'evaluation' | 'pwn' | 'other' | null;
  status: 'uploaded' | 'processing' | 'analyzed' | 'failed';
  analysisStatus: 'pending' | 'in_progress' | 'completed' | 'failed';
  uploadDate: string;
  fileSize?: number;
  mimeType?: string;
}

// Extraction data structure
export interface ExtractionData {
  metadata: {
    studentName: string | null;
    age: number | null;
    grade: string | null;
    schoolName: string | null;
    iepStartDate: string | null;
    iepEndDate: string | null;
    disabilities: string[];
  };
  goals: ExtractedGoal[];
  services: ExtractedService[];
  redFlags?: RedFlag[];
}

export interface ExtractedGoal {
  domain: string;
  goalName: string;
  goalText?: string;
  baseline: string;
  target: string;
  measurementMethod: string;
  criteria?: string;
  frequency?: string;
  startDate?: string;
  confidence?: number;
}

export interface ExtractedService {
  serviceType: string;
  provider: string;
  frequency: string;
  duration: string;
  minutesPerSession: number;
  confidence?: number;
}

export interface RedFlag {
  type: string;
  severity: 'high' | 'medium' | 'low';
  message: string;
  field?: string;
}

// Correction tracking
export interface Correction {
  field: string;
  originalValue: any;
  correctedValue: any;
  aiConfidence?: number;
  reason?: string;
}

// Response from extraction endpoint
export interface ExtractionResponse {
  success: boolean;
  data: {
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
    summary?: string;
    redFlags?: string[];
    legalLens?: string;
    confidence: {
      overall: number;
      dates: number;
      goals: number;
      services: number;
    };
    metadata?: {
      documentQuality?: string;
      extractionNotes?: string;
    };
  };
}

// Finalization result
export interface FinalizationResult {
  goalsCreated: number;
  servicesCreated: number;
  promptsCreated: number;
  goals: any[];
  services: any[];
}


