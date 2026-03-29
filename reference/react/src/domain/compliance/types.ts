export interface ComplianceItem {
  id: string;
  userId?: string;
  childId: string;
  serviceDate: string; // YYYY-MM-DD format
  serviceType: string;
  serviceProvider?: string;
  status: string;
  minutesProvided?: number;
  minutesRequired?: number;
  notes?: string;
  attachments?: any[];
  issueReported?: boolean;
  resolutionStatus?: string;
  createdAt?: string;
}

export type CreateComplianceData = Omit<ComplianceItem, "id" | "createdAt">;
export type UpdateComplianceData = Partial<Omit<CreateComplianceData, "userId">>;
