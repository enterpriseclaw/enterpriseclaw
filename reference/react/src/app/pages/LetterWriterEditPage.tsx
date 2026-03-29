import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import { getLetterService } from "@/domain/letters/letter.service";
import { getChildService } from "@/domain/child/child.service";
import type { Letter } from "@/domain/letters/types";
import type { Child } from "@/domain/child/types";
import { PageHeader } from "@/app/ui/PageHeader";
import { AiInformationalDisclaimer } from "@/app/ui/AiInformationalDisclaimer";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowLeft, Save, Trash2, FileText, Send, AlertTriangle } from "lucide-react";
import { config } from "@/lib/config";
import { useNotification } from "@/hooks/useNotification";
import { logger } from "@/lib/logger";

const LETTER_TYPES = [
  "Request for IEP Meeting",
  "Request for Evaluation",
  "Request for Independent Educational Evaluation (IEE)",
  "Concern About Services",
  "Concern About Progress",
  "Request for Records",
  "Prior Written Notice Response",
  "Consent for Evaluation",
  "Disagreement with IEP",
  "Request for Due Process",
  "Thank You Letter",
  "Other",
];

const LETTER_TEMPLATES: Record<string, string> = {
  "Request for IEP Meeting": `[Date]

Dear [Recipient],

I am writing to formally request an IEP team meeting for my child, [Child's Name], who is currently receiving special education services in your school/district.

I would like to discuss the following concerns:
[List your specific concerns or topics here]

Please provide me with:
1. Available meeting dates and times within the next 30 days
2. A list of team members who will attend
3. Prior Written Notice if you deny this request

I understand that under IDEA, the IEP team must meet when the parent requests a meeting to review the IEP. I look forward to collaborating with the team to ensure [Child's Name] receives appropriate supports.

Thank you for your prompt attention to this matter.

Sincerely,
[Your Name]
[Contact Information]`,

  "Request for Evaluation": `[Date]

Dear [Recipient],

I am formally requesting a comprehensive evaluation for my child, [Child's Name], under the Individuals with Disabilities Education Act (IDEA).

I have concerns in the following areas:
[List specific areas: academic, behavioral, speech/language, occupational therapy, etc.]

I am requesting evaluations in these areas:
[List specific evaluation areas]

Under IDEA regulations, I understand that:
1. You must respond to my request within a reasonable time
2. You must provide me with Prior Written Notice of your decision
3. If you agree, evaluations must be completed within 60 days (or your state timeline)
4. I must provide informed consent before evaluations begin

Please send me the evaluation consent forms and Prior Written Notice regarding this request within 10 school days.

Thank you for your cooperation.

Sincerely,
[Your Name]
[Contact Information]`,

  "Concern About Services": `[Date]

Dear [Recipient],

I am writing to express concerns about the implementation of services outlined in my child's IEP. [Child's Name] is entitled to receive the services listed in the IEP as written.

Specifically, I have observed the following concerns:
[Describe specific concerns about service delivery, frequency, duration, etc.]

I am requesting:
1. A written explanation of why services have not been provided as outlined
2. A plan for compensatory services to make up for missed instruction/therapy
3. An IEP team meeting to discuss and address these concerns

I understand that failure to implement an IEP as written is a violation of IDEA. Please respond to this letter within 10 school days with your action plan.

I appreciate your immediate attention to ensuring my child receives the services they are entitled to under federal law.

Sincerely,
[Your Name]
[Contact Information]`,

  "Request for Records": `[Date]

Dear [Recipient],

Under the Family Educational Rights and Privacy Act (FERPA) and IDEA, I am requesting copies of all educational records for my child, [Child's Name].

Please provide copies of the following:
☐ Complete cumulative file
☐ All IEP documents and amendments
☐ All evaluation reports (psychological, academic, speech, OT, PT, etc.)
☐ Progress reports and report cards
☐ Discipline records
☐ Attendance records
☐ Communications between school staff
☐ Data collection sheets and graphs
☐ [Other specific documents]

Under FERPA, you must provide these records within 45 days of this request. Please let me know if there will be any copying fees.

I prefer to receive these records:
☐ By mail to: [Your address]
☐ For pickup at: [Location]
☐ Electronically to: [Email]

Thank you for your prompt attention to this request.

Sincerely,
[Your Name]
[Contact Information]`,

  "Thank You Letter": `[Date]

Dear [Recipient],

I wanted to take a moment to express my sincere gratitude for your dedication and support of my child, [Child's Name].

[Describe specific things you appreciate: progress observed, excellent communication, going above and beyond, specific strategies that worked, etc.]

Your commitment to [Child's Name]'s education and growth makes a tremendous difference. It is clear that you care deeply about your students, and we are fortunate to have you as part of our team.

Thank you again for all that you do.

With appreciation,
[Your Name]`,
};

export function LetterWriterEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, accessToken } = useAuth();
  const { showSuccess, showError } = useNotification();

  const isNew = id === "new";
  const userId = user?.id || "";

  const [children, setChildren] = useState<Child[]>([]);
  const [childId, setChildId] = useState("");
  const [letterType, setLetterType] = useState("");
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"draft" | "final" | "sent">("draft");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    if (!userId || !accessToken) return;
    
    loadChildren();
    if (!isNew && id) {
      loadLetter(id);
    }
  }, [id, isNew, userId]);

  // Auto-populate subject when letter type changes
  useEffect(() => {
    if (letterType && isNew) {
      setSubject(letterType);
    }
  }, [letterType, isNew]);

  async function loadChildren() {
    try {
      const service = getChildService();
      const data = await service.getAll(accessToken);
      setChildren(data);
      if (data.length > 0 && !childId && data[0]) {
        setChildId(data[0].id);
      }
    } catch (error) {
      logger.error("Error loading children", { error });
      showError("Failed to load children");
    }
  }

  async function loadLetter(letterId: string) {
    try {
      if (!accessToken) return;
      const service = getLetterService();
      const letter = await service.getById(accessToken, letterId);
      
      // Set fields from the enhanced letter response
      setChildId(letter.childId);
      setLetterType(letter.letterType); // Already mapped to display name by service
      setRecipient(letter.recipient || ''); // Extracted by service
      setSubject(letter.subject || letter.title || ''); // subject is aliased from title
      setContent(letter.content);
      setStatus(letter.status); // Backend enum: 'draft' | 'final' | 'sent'
      
      logger.debug("Letter loaded", { id: letterId, type: letter.letterType, status: letter.status });
    } catch (error) {
      logger.error("Error loading letter", { error });
      showError("Failed to load letter");
    }
  }

  async function handleSave(saveStatus: "draft" | "final" | "sent" = "draft") {
    if (!userId) {
      showError("User not authenticated");
      return;
    }

    if (!childId || !letterType || !recipient || !subject || !content) {
      showError("Please fill in all required fields");
      return;
    }

    try {
      const service = getLetterService();
      const data = {
        userId,
        childId,
        letterType, // Will be mapped to backend enum by service
        category: getCategoryFromType(letterType),
        recipient,
        subject, // Will be used as title by service
        title: subject,
        content,
        status: saveStatus,
      };

      if (isNew) {
        await service.create(accessToken, data);
        showSuccess(`Letter ${saveStatus === "sent" ? "marked as sent" : "saved as draft"} successfully`);
        logger.info("Letter created", { status: saveStatus });
      } else if (id) {
        await service.update(accessToken, id, { ...data, status: saveStatus });
        showSuccess(`Letter ${saveStatus === "sent" ? "marked as sent" : "updated"} successfully`);
        logger.info("Letter updated", { id, status: saveStatus });
      }

      navigate(config.routes.letterWriter);
    } catch (error) {
      logger.error("Error saving letter", { error });
      showError("Failed to save letter. Please try again.");
    }
  }

  async function handleDeleteConfirm() {
    if (!isNew && id && accessToken) {
      try {
        const service = getLetterService();
        await service.delete(accessToken, id);
        showSuccess("Letter deleted successfully");
        logger.info("Letter deleted", { id });
        navigate(config.routes.letterWriter);
      } catch (error) {
        logger.error("Error deleting letter", { error });
        showError("Failed to delete letter. Please try again.");
      }
    }
  }

  function useTemplate(templateKey: string) {
    const template = LETTER_TEMPLATES[templateKey];
    if (template) {
      let populatedContent = template;
      
      // Replace placeholders
      populatedContent = populatedContent.replace(/\[Date\]/g, new Date().toLocaleDateString());
      
      const child = children.find((c) => c.id === childId);
      if (child) {
        populatedContent = populatedContent.replace(/\[Child's Name\]/g, child.name);
      }

      // Replace recipient if provided
      if (recipient) {
        populatedContent = populatedContent.replace(/\[Recipient\]/g, recipient);
      }

      // Replace your name if user has displayName
      if (user?.displayName) {
        populatedContent = populatedContent.replace(/\[Your Name\]/g, user.displayName);
      }

      setContent(populatedContent);
    }
  }

  function getCategoryFromType(type: string): string {
    if (type.includes("Request")) return "Requests";
    if (type.includes("Concern")) return "Concerns";
    if (type.includes("Thank You")) return "Thank You";
    return "Other";
  }

  return (
    <div className="h-full flex flex-col">
      {/* HEADER */}
      
          <h1 className="text-xl font-semibold">
            {isNew ? "New Letter" : "Edit Letter"}
          </h1>

      {/* AI Disclaimer */}
      <div className="px-6 pt-2">
        <AiInformationalDisclaimer scope="AI-generated letter content" />
      </div>
      <div className="flex-1 overflow-y-auto px-6 pb-32 max-w-6xl mx-auto w-full">
        {/* LETTER DETAILS */}
        <section className="space-y-4 py-4">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Letter Details
            </h2>
          </div>

          <div className="grid gap-4">
              <div className="grid grid-cols-[90px_1fr] items-center gap-3">
                <Label className="text-right text-sm">
                  Child<span className="text-destructive ml-1">*</span>
                </Label>
                <Select value={childId} onValueChange={setChildId}>
                  <SelectTrigger id="child" className="text-base">
                    <SelectValue placeholder="Select child" />
                  </SelectTrigger>
                  <SelectContent>
                    {children.map((child) => (
                      <SelectItem key={child.id} value={child.id}>
                        {child.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-[90px_1fr] items-center gap-3">
                <Label className="text-right text-sm">
                  Type<span className="text-destructive ml-1">*</span>
                </Label>
                <Select value={letterType} onValueChange={setLetterType}>
                  <SelectTrigger id="letterType" className="text-base">
                    <SelectValue placeholder="Select letter type" />
                  </SelectTrigger>
                  <SelectContent>
                    {LETTER_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-[90px_1fr] items-center gap-3">
                <Label className="text-right text-sm">
                  Recipient<span className="text-destructive ml-1">*</span>
                </Label>
                <Input
                  id="recipient"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="e.g., Principal Name, Special Ed Director, IEP Team"
                  className="text-base"
                />
              </div>

              <div className="grid grid-cols-[90px_1fr] items-center gap-3">
                <Label className="text-right text-sm">
                  Subject<span className="text-destructive ml-1">*</span>
                </Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Letter subject line"
                  className="text-base"
                />
              </div>
            </div>
        </section>

        <hr className="border-border/40" />

          {/* TEMPLATE SELECTION */}
          {isNew && (
        <section className="space-y-4 py-4">
          <div>
            <h2 className="text-lg font-semibold">Use a Template</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Select a template to auto-fill your letter. You can customize it after.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => useTemplate("Request for IEP Meeting")}
                  disabled={!childId}
                >
                  IEP Meeting Request
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => useTemplate("Request for Evaluation")}
                  disabled={!childId}
                >
                  Evaluation Request
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => useTemplate("Concern About Services")}
                  disabled={!childId}
                >
                  Service Concerns
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => useTemplate("Request for Records")}
                  disabled={!childId}
                >
                  Records Request
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => useTemplate("Thank You Letter")}
                  disabled={!childId}
                >
                  Thank You
                </Button>
              </div>
        </section>
          )}

        <hr className="border-border/40" />

          {/* LETTER CONTENT */}
        <section className="space-y-4 py-4">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Letter Content
            </h2>
          </div>

          <div className="space-y-2">
              <Label htmlFor="content">
                Letter Text <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your letter here or use a template above..."
                rows={20}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Professional, formal letters create a paper trail for advocacy. Keep copies of all sent letters.
              </p>
            </div>
        </section>

        <hr className="border-border/40" />

          {/* TIPS */}
        <section className="space-y-4 py-8">
          <div>
            <h2 className="text-lg font-semibold">💡 Letter Writing Tips</h2>
          </div>

          <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Keep it professional and factual</li>
              <li>• Reference specific IEP sections or IDEA regulations when applicable</li>
              <li>• State clear requests with timelines</li>
              <li>• Send via certified mail or request email receipt confirmation</li>
              <li>• Keep copies of all correspondence</li>
              <li>• Follow up if you don't receive a response within 10 school days</li>
            </ul>
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
              onClick={() => navigate(config.routes.letterWriter)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleSave("draft")}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
            <Button size="sm" onClick={() => handleSave("sent")}>
              <Send className="h-4 w-4 mr-2" />
              Mark as Sent
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
              Delete Letter
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
