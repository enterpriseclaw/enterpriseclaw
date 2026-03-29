export interface DashboardSummary {
  children: {
    total: number;
    active: number;
  };
  upcomingDeadlines: Array<{
    id: string;
    childId: string;
    childName: string;
    type: 'iep_meeting' | 'evaluation' | 'goal_review' | 'follow_up';
    title: string;
    date: string;
    daysUntil: number;
  }>;
  advocacyAlerts: {
    total: number;
    byPriority: {
      high: number;
      medium: number;
      low: number;
    };
  };
  recentActivity: Array<{
    id: string;
    type: 'communication' | 'behavior' | 'goal_update' | 'compliance' | 'document';
    title: string;
    childName?: string;
    date: string;
  }>;
  advocacyQuote?: string;
  statistics: {
    totalGoals: number;
    goalsInProgress: number;
    totalCommunications: number;
    pendingFollowUps: number;
    recentContactsCount: number;
  };
  // Legacy fields for backward compatibility
  complianceHealth?: number;
  goalMasteryAvg?: number;
  recentContactsCount?: number;
}
