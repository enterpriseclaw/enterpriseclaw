import { config } from "@/lib/config";
import { apiRequest } from "@/lib/http";
import { logger } from "@/lib/logger";
import type { ContactEntry, CreateContactData, UpdateContactData } from "./types";

// TODO Phase 2: Smart Legal Prompts - Communication Tracking
// Implement getAlerts() method to flag:
// 1. Parent requests without PWN response within 10 school days
// 2. Unanswered concerns >30 days (no follow-up documented)
// 3. Meeting decisions without documented follow-up or action items
// 4. Service delivery concerns without resolution timeline
// 5. Pattern of delayed responses from school (track average response time)
// 6. Missing required notices (eval results, IEP invitations, placement changes)

export interface ContactService {
  getAll(token: string): Promise<ContactEntry[]>;
  getById(token: string, id: string): Promise<ContactEntry>;
  create(token: string, data: CreateContactData): Promise<ContactEntry>;
  update(token: string, id: string, data: UpdateContactData): Promise<ContactEntry>;
  delete(token: string, id: string): Promise<void>;
}

class ContactServiceImpl implements ContactService {
  async getAll(token: string): Promise<ContactEntry[]> {
    if (!token) throw new Error("Missing access token");
    try {
      const response = await apiRequest<{ logs: any[] }>(config.api.endpoints.contact.list, {
        method: "GET",
        token,
      });
      const contacts = response.logs || [];
      contacts.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
      logger.debug("Contacts fetched", { count: contacts.length });
      
      // Map response to frontend format
      return contacts.map((c: any) => ({
        id: c.id,
        userId: c.userId,
        childId: c.childId,
        date: c.date,
        type: this.mapContactTypeBack(c.contactType),
        contactPerson: c.contactWith,
        role: c.contactRole || '',
        subject: c.subject,
        message: c.summary,
        notes: c.summary,
        createdAt: c.createdAt || new Date().toISOString(),
        updatedAt: c.updatedAt || new Date().toISOString(),
      }));
    } catch (error) {
      logger.error("Error fetching contacts", { error });
      throw error;
    }
  }

  async getById(token: string, id: string): Promise<ContactEntry> {
    if (!token) throw new Error("Missing access token");
    try {
      const response = await apiRequest<any>(config.api.endpoints.contact.get.replace(":id", id), {
        method: "GET",
        token,
      });
      logger.debug("Contact fetched", { id, type: response.contactType });
      
      // Map response to frontend format
      return {
        id: response.id,
        userId: response.userId,
        childId: response.childId,
        date: response.date,
        type: this.mapContactTypeBack(response.contactType),
        contactPerson: response.contactWith,
        role: response.contactRole || '',
        subject: response.subject,
        message: response.summary,
        notes: response.summary,
        createdAt: response.createdAt || new Date().toISOString(),
        updatedAt: response.updatedAt || new Date().toISOString(),
      };
    } catch (error) {
      logger.error("Error fetching contact", { id, error });
      throw error;
    }
  }

  async create(token: string, data: CreateContactData): Promise<ContactEntry> {
    if (!token) throw new Error("Missing access token");
    try {
      // Map frontend fields to backend API schema
      const apiData = {
        childId: data.childId || undefined, // Optional - contacts don't require a child
        date: data.date,
        contactType: this.mapContactType(data.type),
        contactWith: data.contactPerson,
        contactRole: data.role || undefined,
        subject: data.subject,
        summary: data.message || data.notes || '',
        followUpRequired: false,
        attachments: [],
      };

      const response = await apiRequest<any>(config.api.endpoints.contact.create, {
        method: "POST",
        token,
        body: apiData,
      });
      
      // Map response back to frontend format
      const contact: ContactEntry = {
        id: response.id,
        userId: response.userId,
        childId: response.childId,
        date: response.date,
        type: this.mapContactTypeBack(response.contactType),
        contactPerson: response.contactWith,
        role: response.contactRole || '',
        subject: response.subject,
        message: response.summary,
        notes: response.summary,
        createdAt: response.createdAt || new Date().toISOString(),
        updatedAt: response.updatedAt || new Date().toISOString(),
      };
      
      logger.info("Contact entry created", { id: contact.id, type: contact.type });
      return contact;
    } catch (error) {
      logger.error("Error creating contact", { error });
      throw error;
    }
  }

  private mapContactType(type: ContactEntry["type"]): string {
    const mapping: Record<string, string> = {
      "Email": "email",
      "Meeting": "meeting",
      "Phone Call": "phone",
      "Text/Messaging": "other",
      "Letter": "letter",
    };
    return mapping[type] || "other";
  }

  private mapContactTypeBack(type: string): ContactEntry["type"] {
    const mapping: Record<string, ContactEntry["type"]> = {
      "email": "Email",
      "meeting": "Meeting",
      "phone": "Phone Call",
      "letter": "Letter",
      "portal": "Email",
      "other": "Text/Messaging",
    };
    return mapping[type] || "Email";
  }

  async update(token: string, id: string, data: UpdateContactData): Promise<ContactEntry> {
    if (!token) throw new Error("Missing access token");
    try {
      // Map frontend fields to backend API schema
      const apiData: any = {};
      if (data.date) apiData.date = data.date;
      if (data.type) apiData.contactType = this.mapContactType(data.type);
      if (data.contactPerson) apiData.contactWith = data.contactPerson;
      if (data.role !== undefined) apiData.contactRole = data.role || undefined;
      if (data.subject) apiData.subject = data.subject;
      if (data.message) apiData.summary = data.message;
      else if (data.notes) apiData.summary = data.notes;

      const response = await apiRequest<any>(config.api.endpoints.contact.update.replace(":id", id), {
        method: "PUT",
        token,
        body: apiData,
      });
      logger.info("Contact entry updated", { id });
      
      // Map response back to frontend format
      return {
        id: response.id,
        userId: response.userId,
        childId: response.childId,
        date: response.date,
        type: this.mapContactTypeBack(response.contactType),
        contactPerson: response.contactWith,
        role: response.contactRole || '',
        subject: response.subject,
        message: response.summary,
        notes: response.summary,
        createdAt: response.createdAt || new Date().toISOString(),
        updatedAt: response.updatedAt || new Date().toISOString(),
      };
    } catch (error) {
      logger.error("Error updating contact", { id, error });
      throw error;
    }
  }

  async delete(token: string, id: string): Promise<void> {
    if (!token) throw new Error("Missing access token");
    try {
      await apiRequest<void>(config.api.endpoints.contact.delete.replace(":id", id), {
        method: "DELETE",
        token,
      });
      logger.info("Contact entry deleted", { id });
    } catch (error) {
      logger.error("Error deleting contact", { id, error });
      throw error;
    }
  }
}

const contactServiceInstance = new ContactServiceImpl();

export function getContactService(): ContactService {
  return contactServiceInstance;
}
