# ADR-0006: UI Design for IEP Document Analysis Workflow

**Status**: In Progress  
**Date**: 2026-02-01 (Updated)  
**Context**: React/TypeScript UI with shadcn/ui components

---

## Context

The IEP Document Analysis workflow requires a comprehensive UI that supports:
1. **Upload** - File upload (PDF/DOC/DOCX/TXT) with duplicate detection
2. **Analyze** - AI extraction with real-time streaming progress (NDJSON)
3. **Review** - Display extracted data with confidence scores and edit capabilities
4. **Finalize** - Normalize to database (goals, services, prompts)
5. **Dashboard** - Show documents, goals, compliance metrics

### Current State Assessment (2026-02-01)

**✅ What We Have:**
- Basic IEPAnalyzerPage (textarea-based, mock analysis)
- IEPListPage (displays saved IEPs in table format)
- IEP service layer with CRUD operations
- `apiLongRequest` for NDJSON streaming (already implemented in http.ts)
- Dashboard page skeleton
- Authentication and routing infrastructure
- shadcn/ui component library integrated

**❌ What We're Missing:**
- File upload functionality (multipart/form-data)
- Document upload page with duplicate detection
- Real-time streaming analysis UI with progress tracking
- Extraction review page with confidence scores
- Correction submission workflow
- Document finalization flow
- Service methods for: upload, analyze-iep, extraction, corrections, finalize
- Enhanced document types (metadata, goals, services with confidence scores)
- Dashboard integration with document status widgets

**Backend API Endpoints Available** (from iep-analysis-workflow.http):
```
✅ POST /api/v1/iep/upload - Upload document
✅ GET /api/v1/iep?childId={id}&limit=20 - List documents
✅ GET /api/v1/iep/:id - Get document details
✅ GET /api/v1/iep/:id/analyze-iep - Analyze with NDJSON streaming
✅ GET /api/v1/iep/:id/extraction - Get extraction results
✅ POST /api/v1/iep/:id/corrections - Submit corrections
✅ GET /api/v1/iep/:id/can-finalize - Check finalization readiness
✅ POST /api/v1/iep/:id/finalize - Finalize to database
✅ DELETE /api/v1/iep/:id - Delete document
✅ DELETE /api/v1/iep/child/:childId/all - Delete all for child
✅ GET /api/v1/iep/:id/download - Download original
✅ GET /api/v1/dashboard/overview?childId={id} - Dashboard data
✅ POST /api/v1/dashboard/refresh - Refresh views
```

---

## Decision

### Strategy: Incremental Enhancement Without Major Refactoring

We will **enhance existing pages** rather than create entirely new routes, minimizing changes:

1. **Convert IEPAnalyzerPage** → Document Upload + Analysis Hub
2. **Enhance IEPListPage** → Add status tracking, extraction review modals
3. **Extend IEP Service** → Add upload, analyze, extraction, corrections, finalize methods
4. **Add Document Types** → Enhanced interfaces for extraction data
5. **Reuse Components** → Leverage existing Card, Dialog, Table, Progress components

### 1. Core Pages & Routes (Minimally Modified)

### 1. Core Pages & Routes (Minimally Modified)

#### 1.1 Enhanced IEPAnalyzerPage - Document Upload Hub
**Route**: `/iep/analyzer` (existing route, enhanced functionality)

**Current**: Textarea for pasting IEP content + mock analysis
**Enhanced**: File upload + real-time streaming analysis

**Changes Needed**:
- Replace textarea with File input + drag-drop zone
- Add child selector dropdown (reuse from other pages)
- Implement file upload with FormData (multipart/form-data)
- Add duplicate detection handling (409 Conflict)
- Replace mock progress with real NDJSON streaming via `apiLongRequest`
- Show streaming logs and stage progress
- On completion, navigate to IEPListPage or show extraction results inline

**Implementation Approach**:
```tsx
// Keep existing structure, add file upload mode
const [uploadMode, setUploadMode] = useState<'text' | 'file'>('file');
const [selectedFile, setSelectedFile] = useState<File | null>(null);
const [childId, setChildId] = useState<string>('');

// Use existing showProgress/updateProgress hooks
const handleFileUpload = async () => {
  const formData = new FormData();
  formData.append('childId', childId);
  formData.append('file', selectedFile!);
  
  // Call service.uploadDocument()
  const { documentId } = await service.uploadDocument(token, formData);
  
  // Immediately start analysis
  await handleAnalyze(documentId);
};

const handleAnalyze = async (documentId: string) => {
  // Replace mock progress with apiLongRequest
  await service.analyzeDocument(token, documentId, (log) => {
    // Update progress UI with real logs
    updateProgress(progressId, calculateProgress(log.stage), log.message);
  });
  
  // Navigate to list page or show results
  navigate('/iep/list');
};
```

**Status**: ✅ Existing page, needs enhancement

#### 1.2 Enhanced IEPListPage - Document Management + Review
**Route**: `/iep/list` (existing route, enhanced functionality)

**Current**: Table listing IEPs with edit/delete actions
**Enhanced**: Add status badges, extraction review dialogs, finalization workflow

**Changes Needed**:
- Add status badges for `status` and `analysisStatus` columns
- Add "View Extraction" button for analyzed documents
- Implement extraction review dialog (modal) - opens inline, no new route
- Add "Finalize" action for reviewed documents
- Show confidence indicators for documents needing review

**Implementation Approach**:
```tsx
// Add to table columns
<TableCell>
  <Badge variant={getStatusVariant(iep.status)}>
    {iep.status}
  </Badge>
  {iep.analysisStatus === 'completed' && (
    <Badge variant="outline" className="ml-2">
      {iep.analysisStatus}
    </Badge>
  )}
</TableCell>

// Add action buttons
<TableCell>
  {iep.analysisStatus === 'completed' && (
    <Button size="sm" onClick={() => openExtractionDialog(iep.id)}>
      Review Extraction
    </Button>
  )}
  {iep.status === 'analyzed' && canFinalize && (
    <Button size="sm" onClick={() => handleFinalize(iep.id)}>
      Finalize
    </Button>
  )}
</TableCell>

// Extraction Review Dialog
<Dialog open={showExtraction} onOpenChange={setShowExtraction}>
  <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
    <Tabs defaultValue="metadata">
      <TabsList>
        <TabsTrigger value="metadata">Metadata</TabsTrigger>
        <TabsTrigger value="goals">Goals ({goals.length})</TabsTrigger>
        <TabsTrigger value="services">Services ({services.length})</TabsTrigger>
      </TabsList>
      {/* Display extraction data with confidence scores */}
      <TabsContent value="metadata">
        {/* Field editor with inline corrections */}
      </TabsContent>
    </Tabs>
    
    <DialogFooter>
      <Checkbox checked={reviewed} onCheckedChange={setReviewed}>
        I have reviewed all data
      </Checkbox>
      <Button onClick={handleSubmitCorrections}>
        Submit & Continue
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Status**: ✅ Existing page, needs enhancement

#### 1.3 Extraction Review (Dialog Component, Not a Page)
**Location**: Embedded in IEPListPage as Dialog

**Purpose**: Review and correct AI-extracted data before finalization

**Features**:
- Show summary card with counts (X goals, Y services to be created)
- Confirmation dialog to prevent accidental finalization
- Success toast notification with breakdown
- Auto-refresh document list after finalization

**Implementation Approach**:
```tsx
// Triggered after corrections submitted
const handleFinalize = async (docId: string) => {
  const confirmed = window.confirm('Finalize this document? This will create goals and services in the database.');
  if (!confirmed) return;
  
  const result = await service.finalizeDocument(token, docId);
  
  showSuccess('Document Finalized', 
    `Created ${result.goalsCreated} goals, ${result.servicesCreated} services`);
  
  // Reload list
  await loadDocuments();
};
```

**API Endpoints Used**:
- `GET /api/v1/iep/:id/can-finalize` (optional check)
- `POST /api/v1/iep/:id/finalize`

**Status**: ❌ New functionality needed in IEPListPage

### 2. Dashboard Integration (Minimal Changes)
### 2. Dashboard Integration (Minimal Changes)

#### 2.1 Enhanced DashboardPage - Add Document Status Widget
**Location**: `src/app/pages/DashboardPage.tsx`

**Changes Needed**:
- Add "Recent Documents" card to existing dashboard grid
- Display last 5 documents with status badges
- Add "Upload IEP" button
- Optionally show compliance/goal metrics if API available

**Implementation Approach**:
```tsx
// Add to existing dashboard grid
<Card>
  <CardHeader>
    <CardTitle>Recent IEP Documents</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-2">
      {recentDocs.slice(0, 5).map(doc => (
        <div key={doc.id} className="flex items-center justify-between text-sm">
          <span className="truncate">{doc.originalFileName}</span>
          <Badge variant={getStatusVariant(doc.status)}>
            {doc.status}
          </Badge>
        </div>
      ))}
    </div>
    <Button className="w-full mt-3" onClick={() => navigate('/iep/analyzer')}>
      Upload New Document
    </Button>
  </CardContent>
</Card>
```

**API Endpoints**:
- `GET /api/v1/iep?limit=5` (for recent documents)
- `GET /api/v1/dashboard/overview?childId={id}` (optional, for full metrics)

**Status**: ✅ Existing page, needs widget addition

### 3. Service Layer Enhancements

### 3. Service Layer Enhancements

#### 3.1 Enhanced IEPService
**Location**: `src/domain/iep/iep.service.ts`

**Current Methods** (✅ Already Implemented):
- `getAll(token, childId?)` - List documents
- `getById(token, id)` - Get document details
- `analyze(token, content)` - Mock analysis (to be replaced)
- `create(token, data)` - Create IEP record
- `update(token, id, data)` - Update IEP
- `delete(token, id)` - Delete IEP

**New Methods Needed** (❌ To Be Implemented):
```typescript
interface IEPService {
  // NEW: File upload with FormData
  uploadDocument(token: string, formData: FormData): Promise<{
    documentId: string;
    fileName: string;
    status: string;
  }>;
  
  // NEW: Streaming analysis (replace mock analyze())
  analyzeDocument(
    token: string,
    documentId: string,
    onLog?: (log: StreamLogEvent) => void
  ): Promise<ExtractionResult>;
  
  // NEW: Get extraction results
  getExtraction(token: string, documentId: string): Promise<{
    data: ExtractionData;
  }>;
  
  // NEW: Submit corrections
  submitCorrections(
    token: string,
    documentId: string,
    corrections: Correction[],
    reviewCompleted: boolean
  ): Promise<void>;
  
  // NEW: Check finalization readiness
  canFinalize(token: string, documentId: string): Promise<{
    canFinalize: boolean;
    reason?: string;
  }>;
  
  // NEW: Finalize document
  finalizeDocument(token: string, documentId: string): Promise<{
    goalsCreated: number;
    servicesCreated: number;
    promptsCreated: number;
    goals: any[];
    services: any[];
  }>;
  
  // NEW: Delete all for child
  deleteAllForChild(token: string, childId: string): Promise<{
    deletedCount: number;
  }>;
  
  // Existing methods...
}
```

**Implementation Example**:
```typescript
// File upload with multipart/form-data
async uploadDocument(token: string, formData: FormData) {
  const response = await fetch(config.api.resolveUrl('/api/v1/iep/upload'), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData, // Browser sets Content-Type with boundary automatically
  });
  
  if (response.status === 409) {
    const data = await response.json();
    throw new DuplicateDocumentError(data.existingDocument);
  }
  
  if (!response.ok) throw new ApiError('Upload failed', response.status);
  
  return (await response.json()).data;
}

// Streaming analysis using apiLongRequest (already in http.ts)
async analyzeDocument(token: string, documentId: string, onLog?: (log: StreamLogEvent) => void) {
  return apiLongRequest<ExtractionResult>(
    `/api/v1/iep/${documentId}/analyze-iep`,
    {
      method: 'GET',
      token,
      timeout: 300000, // 5 minutes
      onLog
    }
  );
}

// Standard REST endpoints
async getExtraction(token: string, documentId: string) {
  return apiRequest(`/api/v1/iep/${documentId}/extraction`, { token });
}

async submitCorrections(token: string, documentId: string, corrections: Correction[], reviewCompleted: boolean) {
  return apiRequest(`/api/v1/iep/${documentId}/corrections`, {
    method: 'POST',
    token,
    body: { corrections, reviewCompleted }
  });
}

async finalizeDocument(token: string, documentId: string) {
  return apiRequest(`/api/v1/iep/${documentId}/finalize`, {
    method: 'POST',
    token
  });
}
```

#### 3.2 Enhanced Type Definitions
**Location**: `src/domain/iep/types.ts`

**Current Types** (✅ Already Defined):
```typescript
interface IEP {
  id: string;
  childId: string;
  startDate: string;
  endDate: string;
  goals: string[];
  accommodations: string[];
  services: string[];
  notes?: string;
}

interface IEPAnalysisResult {
  summary: string;
  strengths: string[];
  concerns: string[];
  recommendations: string[];
}
```

**New Types Needed** (❌ To Be Added):
```typescript
// Enhanced document with status tracking
export interface DocumentListItem extends IEP {
  originalFileName: string;
  fileName: string; // stored filename
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
  baseline: string;
  target: string;
  measurementMethod: string;
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
  data: {
    extractedData: ExtractionData;
    confidence: {
      metadata: Record<string, number>;
      goals: number[];
      services: number[];
    };
    lowConfidenceFields: string[];
    reviewRequired: boolean;
    extractionStatus: 'pending' | 'completed' | 'failed';
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

// Custom error for duplicate detection
export class DuplicateDocumentError extends Error {
  existingDocument: {
    id: string;
    fileName: string;
    uploadDate: string;
    status: string;
  };
  
  constructor(existingDoc: any) {
    super('Duplicate document detected');
    this.name = 'DuplicateDocumentError';
    this.existingDocument = existingDoc;
  }
}
```

### 4. UI Component Patterns (Reuse Existing Components)
  async getById(token: string, id: string): Promise<IEP>;
  
  // New methods needed
  async uploadDocument(
    token: string, 
    childId: string, 
    file: File
  ): Promise<{ documentId: string; fileName: string }>;
  
  async analyzeDocument(
    token: string,
    documentId: string,
    onLog?: (log: string) => void
  ): Promise<ExtractionResult>;
  
  async getExtraction(
    token: string,
    documentId: string
  ): Promise<ExtractionData>;
  
  async submitCorrections(
    token: string,
    documentId: string,
    corrections: Correction[]
  ): Promise<void>;
  
  async finalizeDocument(
    token: string,
    documentId: string
  ): Promise<FinalizationResult>;
  
  async deleteAllForChild(
    token: string,
    childId: string
  ): Promise<{ deletedCount: number }>;
}
```

#### 3.2 Document Types
**Location**: `src/domain/iep/types.ts`

```typescript
export interface DocumentListItem {
  id: string;
  fileName: string;
  originalFileName: string;
  documentType: 'iep' | 'progress_report' | 'evaluation' | 'pwn' | 'other' | null;
  status: 'uploaded' | 'processing' | 'analyzed' | 'failed';
  analysisStatus: 'pending' | 'in_progress' | 'completed' | 'failed';
  uploadDate: string;
  childId: string;
}

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
  confidence: {
    metadata: Record<string, number>;
    goals: number[];
    services: number[];
  };
  lowConfidenceFields: string[];
  reviewRequired: boolean;
}

export interface Correction {
  field: string;
  originalValue: any;
  correctedValue: any;
  reason?: string;
}

export interface FinalizationResult {
  goalsCreated: number;
  servicesCreated: number;
  promptsCreated: number;
  goals: Goal[];
  services: Service[];
}
```

### 4. API Integration Patterns

#### 4.1 File Upload (Multipart FormData)
```typescript
async uploadDocument(token: string, childId: string, file: File) {
  const formData = new FormData();
  formData.append('childId', childId);
  formData.append('file', file);
  
  const response = await fetch(config.api.resolveUrl('/api/v1/iep/upload'), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData, // No Content-Type header - browser sets it with boundary
  });
  
  if (response.status === 409) {
    const data = await response.json();
    throw new DuplicateDocumentError(data.existingDocument);
  }
  
  if (!response.ok) throw new ApiError('Upload failed', response.status);
  
  return response.json();
}
```

#### 4.2 Streaming Analysis (Use apiLongRequest)
```typescript
async analyzeDocument(
  token: string, 
  documentId: string,
  onLog?: (log: string, stage?: string) => void
) {
  return apiLongRequest<ExtractionResult>(
    `/api/v1/iep/${documentId}/analyze-iep`,
    {
      method: 'GET',
      token,
      timeout: 300000, // 5 min
      onLog: (event) => {
        if (onLog) {
          onLog(event.message, event.stage);
        }
      }
    }
  );
}
```

#### 4.3 Standard REST Operations
```typescript
async getExtraction(token: string, documentId: string) {
  return apiRequest<{ data: ExtractionData }>(
    `/api/v1/iep/${documentId}/extraction`,
    { token }
  );
}

async submitCorrections(token: string, documentId: string, corrections: Correction[]) {
  return apiRequest(
    `/api/v1/iep/${documentId}/corrections`,
    {
      method: 'POST',
      token,
      body: { corrections, reviewCompleted: true }
    }
  );
}

async finalizeDocument(token: string, documentId: string) {
  return apiRequest<{ data: FinalizationResult }>(
    `/api/v1/iep/${documentId}/finalize`,
    { method: 'POST', token }
  );
}
```

### 5. User Flow Diagrams

#### 5.1 Happy Path Flow
```
1. User navigates to /documents
2. Clicks "Upload Document"
3. Selects child + file → Upload
4. Auto-redirected to /documents/:id/analyze
5. Watches real-time NDJSON stream progress
6. Auto-redirected to /documents/:id/review on completion
7. Reviews extracted data (tabs: metadata, goals, services)
8. Corrects low-confidence fields
9. Checks "Reviewed" → Submits corrections
10. Clicks "Finalize Document"
11. Sees success message with counts
12. Navigates to /dashboard or /goals
```

#### 5.2 Duplicate Detection Flow
```
1. User uploads file
2. API returns 409 Conflict
3. UI shows dialog:
   "Document 'iep-sample-1.pdf' already exists (uploaded 2026-01-15)
    Status: Analyzed
    
    [View Existing] [Delete & Re-upload] [Cancel]"
4a. If "Delete & Re-upload":
    - DELETE /api/v1/iep/:existingId
    - Retry upload
4b. If "View Existing":
    - Navigate to /documents/:existingId/review
```

#### 5.3 Error Recovery Flow
```
1. Analysis fails (500 or timeout)
2. UI shows error with retry button
3. User clicks "Retry Analysis"
4. Restarts from step 4 in happy path
```

### 6. Component Library

#### 6.1 New Shared Components Needed

**FileDropzone Component**:
```tsx
interface FileDropzoneProps {
  accept: string;
  maxSize: number;
  onUpload: (file: File) => void;
  disabled?: boolean;
}

export const FileDropzone = ({ accept, maxSize, onUpload, disabled }: FileDropzoneProps) => {
  // Drag & drop + click to browse
  // File validation
  // Preview selected file
};
```

**StreamingProgressCard Component**:
```tsx
interface StreamingProgressCardProps {
  logs: string[];
  currentStage?: string;
  progress: number;
}

export const StreamingProgressCard = ({ logs, currentStage, progress }: StreamingProgressCardProps) => {
  // Progress bar
  // Stage badge
  // Scrollable log viewer
};
```

**ExtractionFieldEditor Component**:
```tsx
interface ExtractionFieldEditorProps {
  fields: Record<string, any>;
  confidence: Record<string, number>;
  lowConfidenceFields: string[];
  onCorrect: (field: string, value: any) => void;
}

export const ExtractionFieldEditor = ({ fields, confidence, lowConfidenceFields, onCorrect }: ExtractionFieldEditorProps) => {
  // Field list with inline editing
  // Confidence badges
  // Highlight low-confidence fields
};
```

**GoalExtractionCard Component**:
```tsx
interface GoalExtractionCardProps {
  goal: ExtractedGoal;
  confidence?: number;
  onEdit: (updated: ExtractedGoal) => void;
}

export const GoalExtractionCard = ({ goal, confidence, onEdit }: GoalExtractionCardProps) => {
  // Goal display with editable fields
  // Baseline, target, measurement method
  // Domain selector
};
```

### 7. Navigation & Routing

#### 7.1 Updated Route Configuration
**Location**: `src/lib/config.ts`

```typescript
routes: {
  // ... existing routes
  
  // Document Management
  documents: '/documents',
  documentsUpload: '/documents/upload',
  documentsAnalyze: (id: string) => `/documents/${id}/analyze`,
  documentsReview: (id: string) => `/documents/${id}/review`,
  documentsFinalize: (id: string) => `/documents/${id}/finalize`,
  documentView: (id: string) => `/documents/${id}`,
}
```

#### 7.2 Updated Navigation Menu
```tsx
// Add to sidebar navigation
{
  label: 'Documents',
  icon: FileText,
  href: '/documents',
  badge: uploadingCount > 0 ? uploadingCount : undefined,
}
```

### 8. Testing Considerations

#### 8.1 E2E Test Scenarios
- Upload document → analyze → review → finalize (happy path)
- Upload duplicate → handle 409 → delete old → re-upload
- Analyze timeout → retry
- Low confidence fields → correct → submit → finalize
- Dashboard shows correct document counts and statuses

#### 8.2 Component Tests
- FileDropzone validation (file type, size)
- StreamingProgressCard updates as logs arrive
- ExtractionFieldEditor highlights low-confidence fields
- ConfidenceBadge shows correct colors

---

## Consequences

### Positive
- **Streaming UX**: Real-time progress feedback during 30-60s AI analysis
- **Confidence Scores**: Users know which fields need review
- **Duplicate Detection**: Prevents accidental re-uploads
- **Dashboard Integration**: Documents visible alongside goals/compliance
- **Correction Tracking**: Audit trail of manual edits

### Negative
- **Complexity**: Multiple pages and state transitions
- **Error Handling**: Need robust retry/recovery for long-running operations
- **Mobile UX**: File upload and multi-tab review harder on mobile

### Mitigations
- Use `apiLongRequest` wrapper for consistent streaming handling
- Implement error boundaries with retry buttons
- Responsive design with bottom sheet for mobile tabs
- Optimistic UI updates where possible

---

## Implementation Phases

### Phase 1: Core Workflow (Week 1-2)
- Document list page
- File upload with FormData
- Streaming analysis with `apiLongRequest`
- Basic extraction review (read-only)

### Phase 2: Editing & Finalization (Week 3)
- Inline correction editor
- Confidence badges and highlights
- Submit corrections endpoint
- Finalization flow with success confirmation

### Phase 3: Dashboard & Polish (Week 4)
- Dashboard overview widget
- Document status counts
- Recent documents list
- Duplicate detection handling

### Phase 4: Mobile & Accessibility (Week 5)
- Responsive design improvements
- Touch-friendly file upload
- Bottom sheet for mobile tabs
- Keyboard navigation for corrections

---

## Related ADRs
- ADR-0001: IEP Document Processing & AI Integration Architecture
- ADR-0003: Database Schema & Dashboard Architecture
- ADR-0005: Duplicate Detection Strategy

---

## References
- Backend API: `/docs/API_DOCUMENTATION.md`
- Workflow Tests: `/requests/analyse/iep-analysis-workflow.http`
- Existing UI: `IEPAnalyzerPage.tsx`, `IEPListPage.tsx`, `DashboardPage.tsx`
- HTTP Client: `src/lib/http.ts` (`apiLongRequest` for NDJSON streaming)
---

## ADDENDUM: Gap Analysis & Implementation Plan (2026-02-01)

### ✅ Backend API - All 13 Endpoints Working
- POST /api/v1/iep/upload
- GET /api/v1/iep/:id/analyze-iep (NDJSON streaming)
- GET /api/v1/iep/:id/extraction
- POST /api/v1/iep/:id/corrections
- POST /api/v1/iep/:id/finalize
- Plus list, get, delete, dashboard endpoints

### ✅ UI Infrastructure Ready
- apiLongRequest() in http.ts (NDJSON streaming)
- shadcn/ui components (Card, Dialog, Tabs, Badge, Progress)
- useAuth + useNotification hooks
- IEPAnalyzerPage, IEPListPage, DashboardPage

### ❌ Gaps to Fill (1-2 days)

**Service Layer (2-3 hours)**:
- uploadDocument(), analyzeDocument(), getExtraction(), submitCorrections(), finalizeDocument()
- Enhanced types: DocumentListItem, ExtractionData, Correction, FinalizationResult

**IEPAnalyzerPage (2 hours)**: Add file upload + real streaming analysis

**IEPListPage (3-4 hours)**: Add status badges + extraction review dialog + finalize

**Strategy**: Enhance existing pages, use Dialog for review, no new routes needed.