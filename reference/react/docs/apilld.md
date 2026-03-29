# IEP App API Low-Level Design (LLD)

## 1. Overview

The IEP App API provides a comprehensive backend service for parent-first IEP management, supporting role-based access control, compliance monitoring, and advocacy tools. The API follows RESTful principles with JSON responses and JWT-based authentication.

### 1.1 Architecture Principles
- **Parent-First Design**: All operations prioritize parent control and consent
- **Role-Based Access**: Strict RBAC with Parent as primary decision-maker
- **Compliance-Focused**: Built-in monitoring for IDEA, FERPA compliance
- **Audit-Ready**: Complete audit trails for all operations
- **Progressive Disclosure**: Smart legal prompts surface risks without overwhelming users

### 1.2 Core Domains
- Authentication & Authorization
- Child Profiles & IEPs
- Goals & Progress Tracking
- Behavior Analysis (ABC)
- Contact Logging
- Advocacy Insights
- Compliance Monitoring
- Legal Resources
- Letter Generation
- Settings & Preferences

---

## 2. Authentication & Authorization

### 2.1 Authentication Endpoints

#### POST /api/auth/login
**Purpose**: Authenticate user and return JWT token

**Request Body**:
```json
{
  "email": "string",
  "password": "string"
}
```

**Response** (200):
```json
{
  "token": "jwt_token_string",
  "user": {
    "id": "string",
    "email": "string",
    "displayName": "string",
    "role": "PARENT|ADVOCATE|TEACHER_THERAPIST|ADMIN"
  },
  "expiresAt": 1640995200000
}
```

**Error Responses**:
- 401: Invalid credentials
- 429: Too many attempts

#### POST /api/auth/register
**Purpose**: Register new parent user

**Request Body**:
```json
{
  "email": "string",
  "password": "string",
  "displayName": "string"
}
```

**Response** (201):
```json
{
  "user": {
    "id": "string",
    "email": "string",
    "displayName": "string",
    "role": "PARENT"
  }
}
```

#### POST /api/auth/logout
**Purpose**: Invalidate current session

**Headers**: Authorization: Bearer {token}

**Response** (200): Empty

#### POST /api/auth/refresh
**Purpose**: Refresh JWT token before expiration

**Headers**: Authorization: Bearer {token}

**Response** (200):
```json
{
  "token": "new_jwt_token",
  "expiresAt": 1640995200000
}
```

### 2.2 Authorization Model

#### Roles & Permissions
- **PARENT**: Full access to own data, can grant/revoke access to others
- **ADVOCATE**: Read-only access to assigned children, can view insights
- **TEACHER_THERAPIST**: Limited access to assigned children (goals, behaviors, contacts)
- **ADMIN**: Full system access

#### Access Control Headers
```
Authorization: Bearer {jwt_token}
X-User-Role: PARENT|ADVOCATE|TEACHER_THERAPIST|ADMIN
X-Child-Access: {child_id} (for role-restricted operations)
```

---

## 3. Child Management API

### 3.1 Child Profile Endpoints

#### GET /api/children
**Purpose**: Get all children for authenticated user

**Query Parameters**:
- `userId` (required): Parent user ID

**Response** (200):
```json
{
  "children": [
    {
      "id": "string",
      "userId": "string",
      "name": "string",
      "age": 8,
      "grade": "3rd Grade",
      "disabilities": ["ADHD", "Dyslexia"],
      "accommodations": "Extended time, preferential seating",
      "services": "Speech therapy, occupational therapy",
      "advocacyBio": "Emma loves art and struggles with reading comprehension",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-15T00:00:00Z"
    }
  ]
}
```

#### POST /api/children
**Purpose**: Create new child profile

**Request Body**:
```json
{
  "userId": "string",
  "name": "string",
  "age": 8,
  "grade": "string",
  "disabilities": ["string"],
  "accommodations": "string",
  "services": "string",
  "advocacyBio": "string"
}
```

**Response** (201): Child object

#### PUT /api/children/{childId}
**Purpose**: Update child profile

**Request Body**: Partial child data

**Response** (200): Updated child object

#### DELETE /api/children/{childId}
**Purpose**: Delete child profile (soft delete)

**Response** (204): No content

### 3.2 IEP Management

#### GET /api/children/{childId}/iep
**Purpose**: Get current IEP for child

**Response** (200):
```json
{
  "iep": {
    "id": "string",
    "childId": "string",
    "startDate": "2024-09-01",
    "endDate": "2025-08-31",
    "goals": ["Improve reading fluency by 20 WPM"],
    "accommodations": ["Extended time on tests"],
    "services": ["Speech therapy 2x/week"],
    "notes": "Annual review due in March"
  }
}
```

#### POST /api/children/{childId}/iep/analyze
**Purpose**: Analyze IEP document content

**Request Body**:
```json
{
  "content": "Full IEP document text or PDF content"
}
```

**Response** (200):
```json
{
  "analysis": {
    "summary": "IEP summary in plain language",
    "strengths": ["Clear measurable goals", "Specific accommodations"],
    "concerns": ["Vague progress monitoring", "Limited parent participation"],
    "recommendations": ["Request more frequent progress reports", "Ask for specific metrics"]
  }
}
```

---

## 4. Goals & Progress Tracking API

### 4.1 Goal Management

#### GET /api/goals
**Purpose**: Get goals for child

**Query Parameters**:
- `childId` (required): Child ID

**Response** (200):
```json
{
  "goals": [
    {
      "id": "string",
      "childId": "string",
      "iepId": "string",
      "area": "Reading",
      "description": "Improve reading comprehension",
      "baseline": 65,
      "target": 85,
      "current": 72,
      "metric": "Percentage correct on comprehension tests",
      "duration": "By end of school year",
      "status": "active|completed|discontinued",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### POST /api/goals
**Purpose**: Create new goal

**Request Body**: Goal data without id/createdAt

**Response** (201): Goal object

#### PUT /api/goals/{goalId}
**Purpose**: Update goal

**Response** (200): Updated goal object

### 4.2 Progress Tracking

#### GET /api/goals/{goalId}/progress
**Purpose**: Get progress history for goal

**Response** (200):
```json
{
  "progress": [
    {
      "id": "string",
      "goalId": "string",
      "date": "2024-01-15",
      "score": 72,
      "notes": "Improved from last month, still needs work on inference questions"
    }
  ]
}
```

#### POST /api/goals/{goalId}/progress
**Purpose**: Add progress entry

**Request Body**:
```json
{
  "date": "2024-01-15",
  "score": 72,
  "notes": "string"
}
```

**Response** (201): Progress entry object

---

## 5. Behavior Analysis API

### 5.1 ABC Behavior Logging

#### GET /api/behaviors
**Purpose**: Get behavior entries for child

**Query Parameters**:
- `childId` (required): Child ID

**Response** (200):
```json
{
  "behaviors": [
    {
      "id": "string",
      "childId": "string",
      "date": "2024-01-15",
      "time": "14:30",
      "antecedent": "Teacher asked student to start math worksheet",
      "behavior": "Student threw pencil and refused to work",
      "consequence": "Teacher sent student to timeout"
    }
  ]
}
```

#### POST /api/behaviors
**Purpose**: Log new behavior incident

**Request Body**: Behavior data without id

**Response** (201): Behavior entry object

#### PUT /api/behaviors/{behaviorId}
**Purpose**: Update behavior entry

**Response** (200): Updated behavior entry

---

## 6. Contact Logging API

### 6.1 Contact Management

#### GET /api/contacts
**Purpose**: Get contact log entries

**Query Parameters**:
- `userId` (required): User ID
- `childId` (optional): Filter by child

**Response** (200):
```json
{
  "contacts": [
    {
      "id": "string",
      "userId": "string",
      "childId": "string",
      "date": "2024-01-15",
      "type": "Email|Meeting|Phone Call",
      "contactPerson": "Ms. Johnson (Special Ed Teacher)",
      "subject": "IEP Progress Update",
      "notes": "Discussed reading goals, teacher reports steady improvement"
    }
  ]
}
```

#### POST /api/contacts
**Purpose**: Log new contact

**Request Body**: Contact data without id

**Response** (201): Contact entry object

---

## 7. Advocacy & Compliance API

### 7.1 Advocacy Insights

#### GET /api/advocacy/insights
**Purpose**: Get advocacy insights for user

**Query Parameters**:
- `userId` (required): User ID
- `priority` (optional): high|medium|low

**Response** (200):
```json
{
  "insights": [
    {
      "id": "string",
      "userId": "string",
      "childId": "string",
      "priority": "high",
      "category": "Limited Progress",
      "title": "Reading goal showing minimal progress",
      "description": "Emma's reading fluency goal has only improved 5% in 3 months",
      "actionItems": [
        "Request detailed progress monitoring data",
        "Ask for additional reading interventions",
        "Schedule IEP meeting to discuss lack of progress"
      ],
      "createdAt": "2024-01-15T00:00:00Z"
    }
  ]
}
```

### 7.2 Compliance Monitoring

#### GET /api/compliance
**Purpose**: Get compliance items for user

**Query Parameters**:
- `userId` (required): User ID

**Response** (200):
```json
{
  "compliance": [
    {
      "id": "string",
      "userId": "string",
      "childId": "string",
      "requirement": "Annual IEP Review",
      "status": "compliant|at-risk|non-compliant",
      "dueDate": "2024-03-15",
      "notes": "Next review due in March"
    }
  ]
}
```

---

## 8. Letter Generation API

### 8.1 Template Management

#### GET /api/letters/templates
**Purpose**: Get available letter templates

**Query Parameters**:
- `category` (optional): procedural|advocacy|communication

**Response** (200):
```json
{
  "templates": [
    {
      "id": "string",
      "userId": "string",
      "name": "Request for IEP Meeting",
      "category": "procedural",
      "template": "Dear [School Administrator],\n\nI am writing to request an IEP meeting for my child [Child Name]..."
    }
  ]
}
```

#### POST /api/letters/generate
**Purpose**: Generate letter draft from template

**Request Body**:
```json
{
  "templateId": "string",
  "variables": {
    "childName": "Emma Johnson",
    "date": "January 15, 2024",
    "schoolAdministrator": "Dr. Smith"
  }
}
```

**Response** (200):
```json
{
  "draft": "Dear Dr. Smith,\n\nI am writing to request an IEP meeting for my child Emma Johnson...",
  "templateId": "string",
  "generatedAt": "2024-01-15T00:00:00Z"
}
```

---

## 9. Resources API

### 9.1 Legal Resources

#### GET /api/legal-resources
**Purpose**: Get legal resources

**Query Parameters**:
- `category` (optional): IDEA|FAPE|LRE|PWN

**Response** (200):
```json
{
  "resources": [
    {
      "id": "string",
      "title": "Understanding IDEA",
      "category": "IDEA",
      "description": "Overview of the Individuals with Disabilities Education Act",
      "plainLanguage": "IDEA is the law that makes sure children with disabilities get the education they need...",
      "citation": "20 U.S.C. § 1400 et seq.",
      "url": "https://www.parentcenterhub.org/idea/"
    }
  ]
}
```

### 9.2 General Resources

#### GET /api/resources
**Purpose**: Get general advocacy resources

**Query Parameters**:
- `category` (optional): federal-laws|state-resources|advocacy-groups

**Response** (200):
```json
{
  "resources": [
    {
      "id": "string",
      "title": "Parent Training and Information Centers",
      "category": "advocacy-groups",
      "description": "Network of parent centers providing training and information",
      "url": "https://www.parentcenterhub.org/",
      "tags": ["training", "information", "support"]
    }
  ]
}
```

---

## 10. Dashboard & Settings API

### 10.1 Dashboard Summary

#### GET /api/dashboard/summary
**Purpose**: Get dashboard summary for user

**Query Parameters**:
- `userId` (required): User ID

**Response** (200):
```json
{
  "summary": {
    "complianceHealth": 85,
    "goalMasteryAvg": 72,
    "recentContactsCount": 3,
    "advocacyQuote": "Advocacy is not a job, it's a way of life for parents of children with special needs."
  }
}
```

### 10.2 User Preferences

#### GET /api/settings/preferences
**Purpose**: Get user preferences

**Query Parameters**:
- `userId` (required): User ID

**Response** (200):
```json
{
  "preferences": {
    "userId": "string",
    "theme": "light|dark|auto",
    "notifications": true,
    "emailUpdates": true
  }
}
```

#### PUT /api/settings/preferences
**Purpose**: Update user preferences

**Request Body**: Partial preferences data

**Response** (200): Updated preferences object

---

## 11. Smart Legal Prompts API

### 11.1 Prompt Triggers

#### GET /api/smart-prompts/triggers
**Purpose**: Get active smart prompts for user

**Query Parameters**:
- `userId` (required): User ID

**Response** (200):
```json
{
  "prompts": [
    {
      "id": "string",
      "type": "Limited Progress Detected",
      "severity": "high",
      "title": "Reading Goal Progress Concern",
      "description": "Emma's reading goal has shown less than 10% progress in the last 3 months",
      "triggerData": {
        "goalId": "string",
        "progressRate": 5,
        "timeframe": "3 months"
      },
      "recommendedActions": [
        "Request detailed progress monitoring data",
        "Ask for additional interventions",
        "Schedule IEP meeting"
      ],
      "questionsToAsk": [
        "Can you provide the specific data showing progress?",
        "What interventions have been tried?",
        "When was the last IEP meeting?"
      ],
      "createdAt": "2024-01-15T00:00:00Z"
    }
  ]
}
```

### 11.2 Prompt Acknowledgment

#### POST /api/smart-prompts/{promptId}/acknowledge
**Purpose**: Acknowledge smart prompt (creates audit trail)

**Request Body**:
```json
{
  "action": "acknowledged|dismissed|acted-upon",
  "notes": "User's response or action taken"
}
```

**Response** (200): Acknowledgment record

---

## 12. Audit & Export API

### 12.1 Audit Trail

#### GET /api/audit/events
**Purpose**: Get audit events for user

**Query Parameters**:
- `userId` (required): User ID
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string
- `eventType` (optional): login|data-access|email-sent|etc.

**Response** (200):
```json
{
  "events": [
    {
      "id": "string",
      "userId": "string",
      "eventType": "email-sent",
      "description": "Progress update email sent to teacher",
      "metadata": {
        "recipient": "teacher@school.edu",
        "subject": "IEP Progress Update"
      },
      "timestamp": "2024-01-15T14:30:00Z",
      "ipAddress": "192.168.1.1"
    }
  ]
}
```

### 12.2 Data Export

#### GET /api/export/child/{childId}
**Purpose**: Export all data for a child

**Query Parameters**:
- `format` (optional): json|pdf|csv (default: json)

**Response** (200): File download

#### GET /api/export/user/{userId}/summary
**Purpose**: Export user activity summary

**Response** (200): PDF report

---

## 13. Error Handling & Status Codes

### 13.1 Standard HTTP Status Codes
- **200**: Success
- **201**: Created
- **204**: No Content
- **400**: Bad Request (validation error)
- **401**: Unauthorized (invalid/missing token)
- **403**: Forbidden (insufficient permissions)
- **404**: Not Found
- **409**: Conflict (data integrity issue)
- **422**: Unprocessable Entity (business rule violation)
- **429**: Too Many Requests
- **500**: Internal Server Error

### 13.2 Error Response Format
```json
{
  "error": {
    "code": "VALIDATION_ERROR|AUTH_ERROR|PERMISSION_DENIED|NOT_FOUND",
    "message": "Human-readable error message",
    "details": {
      "field": "specific field that failed validation",
      "reason": "why it failed"
    },
    "timestamp": "2024-01-15T14:30:00Z",
    "requestId": "uuid-for-tracing"
  }
}
```

### 13.3 Validation Errors
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "email": "Must be a valid email address",
      "age": "Must be between 3 and 22"
    }
  }
}
```

---

## 14. Security & Compliance

### 14.1 Data Protection
- **Encryption**: All data encrypted at rest and in transit
- **FERPA Compliance**: Strict parent consent for all data sharing
- **Audit Logging**: All access and modifications logged
- **Data Retention**: Configurable retention policies
- **Right to Delete**: Parents can request complete data deletion

### 14.2 API Security
- **JWT Tokens**: Short-lived access tokens with refresh capability
- **Rate Limiting**: Per-user and per-endpoint rate limits
- **Input Validation**: Strict validation on all inputs
- **SQL Injection Protection**: Parameterized queries only
- **XSS Protection**: Output encoding and content security policies

### 14.3 Privacy Controls
- **Consent Management**: Granular consent for data sharing
- **Access Revocation**: Parents can revoke access at any time
- **Data Portability**: Export all user data in standard formats
- **Anonymized Analytics**: Optional participation in improvement analytics

---

## 15. Performance & Scalability

### 15.1 Caching Strategy
- **API Response Caching**: 5-minute cache for static resources
- **Database Query Caching**: Redis for frequently accessed data
- **CDN**: Static assets served via CDN

### 15.2 Database Optimization
- **Indexing**: Optimized indexes on frequently queried fields
- **Read Replicas**: Separate read and write databases
- **Connection Pooling**: Efficient database connection management

### 15.3 Monitoring & Alerting
- **Response Time Monitoring**: <200ms average response time target
- **Error Rate Tracking**: <0.1% error rate target
- **Resource Usage**: CPU, memory, and disk monitoring
- **Automated Scaling**: Horizontal scaling based on load

---

## 16. API Versioning & Evolution

### 16.1 Versioning Strategy
- **URL Versioning**: `/api/v1/endpoint`
- **Backward Compatibility**: 12-month support for deprecated endpoints
- **Deprecation Notices**: Advance warning of breaking changes

### 16.2 Breaking Change Policy
- **Major Versions**: Breaking changes (v1 → v2)
- **Minor Versions**: New features, backward compatible
- **Patch Versions**: Bug fixes only

### 16.3 Migration Support
- **Parallel Support**: Old and new versions run simultaneously
- **Migration Guides**: Detailed documentation for API consumers
- **Support Window**: 6 months for major version migrations