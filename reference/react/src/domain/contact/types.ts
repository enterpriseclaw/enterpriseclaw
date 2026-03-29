export interface ContactEntry {
  id: string;
  userId: string;
  childId?: string; // Optional - some contacts may not be child-specific
  date: string;
  type: "Email" | "Meeting" | "Phone Call" | "Text/Messaging" | "Letter";
  contactPerson: string;
  role: string; // "Teacher", "Principal", "Special Ed Coordinator", "Therapist", etc.
  subject: string;
  message: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type CreateContactData = Omit<ContactEntry, "id" | "createdAt" | "updatedAt">;
export type UpdateContactData = Partial<Omit<CreateContactData, "userId">>;

