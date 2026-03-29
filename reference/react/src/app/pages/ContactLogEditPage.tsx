import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getContactService } from "../../domain/contact/contact.service";
import { useAuth } from "../providers/AuthProvider";
import type { ContactEntry } from "../../domain/contact/types";
import { PageHeader } from "../ui/PageHeader";
import { Card } from "../../components/ui/card";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Button } from "../../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../../components/ui/alert-dialog";
import { ArrowLeft, Save, Trash2, MessageSquare, UserCircle, Calendar, AlertTriangle } from "lucide-react";
import { config } from "../../lib/config";
import { useNotification } from "../../hooks/useNotification";

const CONTACT_TYPES: ContactEntry["type"][] = ["Email", "Meeting", "Phone Call", "Text/Messaging", "Letter"];

const ROLES = [
  "Teacher",
  "Special Education Teacher",
  "Principal",
  "Assistant Principal",
  "Special Ed Coordinator",
  "School Psychologist",
  "Speech Therapist",
  "Occupational Therapist",
  "Physical Therapist",
  "Behavior Specialist",
  "School Counselor",
  "District Administrator",
  "Case Manager",
  "Other",
];

const MESSAGE_TEMPLATES = {
  request_meeting: "I would like to request a meeting to discuss my child's progress and current IEP implementation. Please let me know your available dates and times.",
  request_evaluation: "I am formally requesting a comprehensive evaluation for my child in the area(s) of [specify areas]. Please provide me with a Prior Written Notice and evaluation consent forms.",
  service_concern: "I have concerns about the delivery of services outlined in my child's IEP. Specifically, [describe concern]. Can we schedule a time to discuss this?",
  progress_inquiry: "I would like to receive an update on my child's progress toward their IEP goals. Can you provide recent data or schedule a progress review meeting?",
  behavior_concern: "I wanted to share some observations about [describe behavior]. I believe this may require discussion at an IEP team meeting to address supports.",
  thank_you: "Thank you for your ongoing support and communication regarding my child's education. I appreciate your collaboration and dedication.",
  follow_up: "Following up on our conversation from [date] regarding [topic]. I wanted to confirm next steps and timelines.",
  documentation_request: "I am requesting copies of [specific documents] for my child's records. Please provide these within the required timeframe.",
};

export function ContactLogEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const auth = useAuth();

  // Support multiple AuthProvider shapes
  const userId =
    (auth as any)?.session?.userId ??
    (auth as any)?.session?.user?.id ??
    (auth as any)?.userId ??
    (auth as any)?.user?.id ??
    (auth as any)?.user?.userId ??
    "user-1"; // Fallback

  const isNew = id === "new";

  const [date] = useState(new Date().toISOString().split("T")[0]); // Auto-set to today
  const [type, setType] = useState<ContactEntry["type"]>("Email");
  const [contactPerson, setContactPerson] = useState("");
  const [role, setRole] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [notes, setNotes] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    if (!auth.accessToken) return;
    if (!isNew && id) {
      loadContact(id);
    }
  }, [id, isNew, auth.accessToken]);

  async function loadContact(contactId: string) {
    if (!auth.accessToken) return;
    const service = getContactService();
    const contact = await service.getById(auth.accessToken, contactId);
    setType(contact.type);
    setContactPerson(contact.contactPerson);
    setRole(contact.role || "");
    setSubject(contact.subject);
    setMessage(contact.message || contact.notes || "");
    setNotes(contact.notes || "");
  }

  async function handleSave() {
    if (!type || !contactPerson || !subject) {
      showError("Validation Error", "Please fill in all required fields");
      return;
    }

    if (!auth.accessToken) {
      showError("Authentication Error", "Missing session. Please log in again.");
      return;
    }

    try {
      const service = getContactService();
      const data = {
        userId,
        childId: undefined, // Not tracking child for contacts
        date: new Date().toISOString().split("T")[0] ?? "", // Auto-set to today
        type,
        contactPerson,
        role,
        subject,
        message,
        notes,
      };

      if (isNew) {
        await service.create(auth.accessToken, data);
        showSuccess("Contact Created", "Contact log created successfully");
      } else if (id) {
        await service.update(auth.accessToken, id, data);
        showSuccess("Changes Saved", "Contact log updated successfully");
      }

      navigate(config.routes.contactLog);
    } catch (error) {
      showError("Save Failed", "Could not save contact log entry");
      console.error("Error saving contact:", error);
    }
  }

  async function handleDeleteConfirm() {
    if (!isNew && id && auth.accessToken) {
      try {
        const service = getContactService();
        await service.delete(auth.accessToken, id);
        showSuccess("Contact Deleted", "Contact log deleted successfully");
        navigate(config.routes.contactLog);
      } catch (error) {
        showError("Delete Failed", "Could not delete contact log entry");
        console.error("Error deleting contact:", error);
      }
    }
  }

  function applyTemplate(templateKey: keyof typeof MESSAGE_TEMPLATES) {
    const template = MESSAGE_TEMPLATES[templateKey];
    setMessage(template);
  }

  return (
    <div className="h-full flex flex-col">
      {/* HEADER */}
      <div className="border-b">
          {/*<Button
            size="sm"
            variant="ghost"
            onClick={() => navigate(config.routes.contactLog)}
          >
            <ArrowLeft className="h-2 w-2 mr-1" />
           
          </Button>*/}
          <h1 className="text-xl font-semibold">
            {isNew ? "New Contact Log" : "Edit Contact Log"}
          </h1>
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto px-6 pb-32 max-w-6xl mx-auto w-full">
          {/* CONTACT DETAILS */}
        <section className="space-y-4 py-4">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Contact Details
            </h2>
          </div>

            <div className="grid gap-4">
              <div className="grid grid-cols-[90px_1fr] items-center gap-3">
                <Label className="text-right text-sm">
                  Type<span className="text-destructive ml-1">*</span>
                </Label>
                <Select value={type} onValueChange={(value) => setType(value as ContactEntry["type"])}>
                  <SelectTrigger id="type" className="text-base">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTACT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
        </section>

        <hr className="border-border/40" />

          {/* CONTACT PERSON */}
        <section className="space-y-4 py-4">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <UserCircle className="h-5 w-5" />
              Who Did You Contact?
            </h2>
          </div>

            <div className="grid gap-4">
              <div className="grid grid-cols-[90px_1fr] items-center gap-3">
                <Label className="text-right text-sm">
                  Person<span className="text-destructive ml-1">*</span>
                </Label>
                <Input
                  id="contactPerson"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="e.g., Ms. Johnson"
                  className="text-base"
                />
              </div>

              <div className="grid grid-cols-[90px_1fr] items-center gap-3">
                <Label className="text-right text-sm">Role/Title</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger id="role" className="text-base">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
        </section>

        <hr className="border-border/40" />

          {/* SUBJECT */}
        <section className="space-y-4 py-4">
          <div>
            <h2 className="text-lg font-semibold">Subject/Topic</h2>
          </div>

            <div className="grid grid-cols-[90px_1fr] items-center gap-3">
              <Label className="text-right text-sm">
                Subject<span className="text-destructive ml-1">*</span>
              </Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g., Request for IEP Meeting, Progress Update, Service Concerns"
                className="text-base"
              />
            </div>
        </section>

        <hr className="border-border/40" />

          {/* MESSAGE */}
        <section className="space-y-4 py-4">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Message/Communication
            </h2>
          </div>

            <div className="space-y-1.5">
              <div className="grid grid-cols-[90px_1fr] items-center gap-3">
                <Label className="text-right text-sm">
                  Template
                </Label>

                <Select
                  onValueChange={(value) =>
                    applyTemplate(value as keyof typeof MESSAGE_TEMPLATES)
                  }
                >
                  <SelectTrigger className="text-base">
                    <SelectValue placeholder="Select template (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="request_meeting">Request Meeting</SelectItem>
                    <SelectItem value="request_evaluation">Request Evaluation</SelectItem>
                    <SelectItem value="service_concern">Service Concern</SelectItem>
                    <SelectItem value="progress_inquiry">Progress Inquiry</SelectItem>
                    <SelectItem value="behavior_concern">Behavior Concern</SelectItem>
                    <SelectItem value="thank_you">Thank You</SelectItem>
                    <SelectItem value="follow_up">Follow Up</SelectItem>
                    <SelectItem value="documentation_request">Documentation Request</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Label htmlFor="message">Message Content</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What did you communicate? Click a template above to get started..."
                rows={8}
              />
              <p className="text-xs text-muted-foreground">
                Document what you said/wrote. This creates a paper trail for advocacy.
              </p>
            </div>
        </section>

        <hr className="border-border/40" />

          {/* NOTES */}
        <section className="space-y-4 py-8">
          <div>
            <h2 className="text-lg font-semibold">Additional Notes</h2>
          </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Response received, follow-up needed, next steps, etc..."
                rows={4}
              />
            </div>
        </section>
      </div>

      {/* STICKY ACTION BAR */}
      <div className="sticky bottom-0 border-t bg-background/95 backdrop-blur shadow-lg">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {!isNew && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowDeleteDialog(true)}
                className="h-8"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            )}
            <span className="hidden sm:inline">
              You can edit this later
            </span>
          </div>

          <div className="flex gap-3">
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate(config.routes.contactLog)}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              {isNew ? "Create Log" : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>

      {/* DELETE DIALOG */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Delete Contact Log
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
