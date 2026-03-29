import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { useAuth } from "@/app/providers/AuthProvider";
import { getAdvocacyService } from "@/domain/advocacy/advocacy.service";
import { config } from "@/lib/config";
import type { AdvocacyInsight } from "@/domain/advocacy/types";
import { useNotification } from "@/hooks/useNotification";
import { LoadingState } from "@/app/ui/LoadingState";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
  ArrowLeft,
  Save,
  Trash2,
  AlertTriangle,
  X,
  Plus,
  Target,
} from "lucide-react";

import { logger } from "@/lib/logger";

/* ------------------------------------------------------------------ */
/* CONSTANTS */
/* ------------------------------------------------------------------ */

const PRIORITY_OPTIONS = ["high", "medium", "low"] as const;

const CATEGORY_OPTIONS = [
  "Service Delivery",
  "Progress Monitoring",
  "Documentation",
  "IEP Meeting",
  "Evaluation",
  "Behavior Support",
  "Accommodations",
  "Related Services",
  "Transition Planning",
  "Other",
];

const ADVOCACY_TEMPLATES = [
  {
    label: "Service Delivery Issue",
    priority: "high" as const,
    category: "Service Delivery",
    title: "Service Minutes Not Being Provided",
    description: "IEP mandated services are not being delivered as specified in the IEP. This impacts my child's ability to make meaningful progress toward their goals.",
    actionItems: [
      "Request meeting with service provider and case manager",
      "Document all missed sessions with dates and times",
      "Request compensatory services for missed sessions",
      "Request written explanation from district",
      "Consider filing a compliance complaint if not resolved"
    ]
  },
  {
    label: "Progress Monitoring Concern",
    priority: "medium" as const,
    category: "Progress Monitoring",
    title: "Inadequate Progress Reporting",
    description: "Progress reports are vague, infrequent, or don't provide measurable data on goal achievement. I need detailed, data-based progress updates to understand how my child is doing.",
    actionItems: [
      "Request specific data collection methods and schedules",
      "Ask for copies of all progress monitoring data",
      "Request more frequent progress updates",
      "Propose specific measurable indicators",
      "Schedule meeting to review current progress and adjust goals if needed"
    ]
  },
  {
    label: "Accommodation Not Implemented",
    priority: "high" as const,
    category: "Accommodations",
    title: "IEP Accommodations Not Being Provided",
    description: "Teachers are not consistently implementing the accommodations specified in my child's IEP. This puts my child at a disadvantage and violates their right to FAPE.",
    actionItems: [
      "Document specific instances when accommodations weren't provided",
      "Email teachers and case manager about accommodation requirements",
      "Request immediate implementation of all IEP accommodations",
      "Ask for accommodation tracking log",
      "Request staff training on IEP implementation if needed"
    ]
  },
  {
    label: "Evaluation Request",
    priority: "medium" as const,
    category: "Evaluation",
    title: "Request Comprehensive Evaluation",
    description: "I believe my child needs a comprehensive evaluation (or re-evaluation) to accurately assess their current needs and determine appropriate services and supports.",
    actionItems: [
      "Submit written request for evaluation to district",
      "Specify areas of concern requiring assessment",
      "Request assessment in all areas of suspected disability",
      "Track district's 60-day timeline for completion",
      "Prepare questions and concerns for evaluation planning meeting"
    ]
  },
  {
    label: "Behavior Support Plan",
    priority: "high" as const,
    category: "Behavior Support",
    title: "Need for Functional Behavior Assessment",
    description: "My child's behaviors are interfering with learning but there is no current FBA or Behavior Intervention Plan. Positive behavior supports are needed to address these challenges.",
    actionItems: [
      "Request Functional Behavior Assessment (FBA)",
      "Document behavioral incidents with ABC data",
      "Request Behavior Intervention Plan (BIP) development",
      "Ask for positive behavior support strategies",
      "Request training for staff on behavior plan implementation"
    ]
  },
  {
    label: "IEP Meeting Preparation",
    priority: "medium" as const,
    category: "IEP Meeting",
    title: "Prepare for Upcoming IEP Meeting",
    description: "Upcoming IEP meeting requires thorough preparation to ensure my child's needs are properly addressed and appropriate services are put in place.",
    actionItems: [
      "Review current IEP and progress reports",
      "Prepare list of concerns and questions",
      "Gather supporting documentation and assessments",
      "Identify proposed goals and services",
      "Consider bringing advocate or support person",
      "Request draft IEP at least 5 days before meeting"
    ]
  },
  {
    label: "Transition Planning",
    priority: "medium" as const,
    category: "Transition Planning",
    title: "Transition Services Planning",
    description: "My child is approaching transition age and needs appropriate transition services and planning to prepare for life after high school.",
    actionItems: [
      "Request transition assessment",
      "Develop measurable postsecondary goals",
      "Identify needed transition services and activities",
      "Connect with adult service agencies",
      "Plan for skills training and work experiences",
      "Ensure transition plan is updated annually"
    ]
  },
  {
    label: "Custom Advocacy Issue",
    priority: "medium" as const,
    category: "",
    title: "",
    description: "",
    actionItems: []
  }
];

/* ------------------------------------------------------------------ */
/* COMPONENT */
/* ------------------------------------------------------------------ */

export function AdvocacyLabEditPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === "new";

  const { user, accessToken } = useAuth();
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const [insight, setInsight] = useState<AdvocacyInsight | null>(null);

  /* ---------------- FORM STATE ---------------- */

  const [formData, setFormData] = useState({
    priority: "medium" as "high" | "medium" | "low",
    category: "",
    title: "",
    description: "",
  });

  const [actionItems, setActionItems] = useState<string[]>([]);
  const [newActionItem, setNewActionItem] = useState("");

  /* ---------------- HELPERS ---------------- */

  const updateField =
    (key: keyof typeof formData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setFormData(prev => ({
        ...prev,
        [key]: e.target.value,
      }));

  const addActionItem = () => {
    if (newActionItem.trim()) {
      setActionItems(prev => [...prev, newActionItem.trim()]);
      setNewActionItem("");
    }
  };

  const removeActionItem = (index: number) => {
    setActionItems(prev => prev.filter((_, i) => i !== index));
  };

  const applyTemplate = (template: typeof ADVOCACY_TEMPLATES[0]) => {
    setFormData(prev => ({
      ...prev,
      priority: template.priority,
      category: template.category,
      title: template.title,
      description: template.description,
    }));
    setActionItems(template.actionItems);
  };

  /* ------------------------------------------------------------------ */
  /* LOAD DATA */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      try {
        if (isNew) {
          setIsLoading(false);
          return;
        }

        // Load existing insight
        const service = getAdvocacyService();
        const found = await service.getById(accessToken, id!);

        if (!found) {
          showError("Advocacy insight not found");
          navigate(config.routes.advocacyLab);
          return;
        }

        setInsight(found);
        setFormData({
          priority: found.priority,
          category: found.category,
          title: found.title,
          description: found.description,
        });
        setActionItems(found.actionItems || []);

        logger.info("Loaded advocacy insight", { id });
      } catch (e) {
        logger.error("Load error", { e });
        showError("Failed to load advocacy insight");
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [id, user]);

  /* ------------------------------------------------------------------ */
  /* SAVE */
  /* ------------------------------------------------------------------ */

  const handleSave = async () => {
    if (!user) return;

    if (!formData.category || !formData.title || !formData.description) {
      showError("Please fill all required fields");
      return;
    }

    if (actionItems.length === 0) {
      showError("Please add at least one action item");
      return;
    }

    setIsSaving(true);
    try {
      const service = getAdvocacyService();

      const data = {
        userId: user.id,
        childId: undefined, // Not tracking child for advocacy insights
        priority: formData.priority,
        category: formData.category,
        title: formData.title,
        description: formData.description,
        actionItems,
      };

      if (isNew) {
        await service.create(accessToken, data);
        showSuccess("Advocacy insight created");
      } else {
        await service.update(accessToken, id!, data);
        showSuccess("Changes saved");
      }

      navigate(config.routes.advocacyLab);
    } catch (e) {
      logger.error("Save error", { e });
      showError("Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /* DELETE */
  /* ------------------------------------------------------------------ */

  const handleDelete = async () => {
    if (!id) return;

    setIsDeleting(true);
    try {
      const service = getAdvocacyService();
      await service.delete(accessToken, id);
      showSuccess("Advocacy insight deleted");
      navigate(config.routes.advocacyLab);
    } catch {
      showError("Delete failed");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  if (isLoading) return <LoadingState />;

  /* ------------------------------------------------------------------ */
  /* RENDER */
  /* ------------------------------------------------------------------ */

  return (
    <div className="h-full flex flex-col">
      {/* HEADER */}

          <h1 className="text-xl font-semibold">
            {isNew ? "Add Advocacy Insight" : "Edit Advocacy Insight"}
          </h1>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto px-6 pb-32 max-w-6xl mx-auto w-full">
        {/* CORE INFORMATION */}
        <section className="space-y-4 py-1">
          {/* Header */}
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Target className="h-5 w-5" />
              Core Information
            </h2>
          </div>

          {/* Template Selector */}
          <div className="grid grid-cols-[90px_1fr] items-center gap-3">
            <Label className="text-right text-sm">Template</Label>
            <Select value="" onValueChange={(idx) => {
              const template = ADVOCACY_TEMPLATES[parseInt(idx)];
              if (template) applyTemplate(template);
            }}>
              <SelectTrigger className="text-base">
                <SelectValue placeholder="Select a template to auto-fill..." />
              </SelectTrigger>
              <SelectContent>
                {ADVOCACY_TEMPLATES.map((tpl, idx) => (
                  <SelectItem key={idx} value={idx.toString()}>
                    {tpl.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Priority + Category */}
          <div className="grid grid-cols-[90px_150px_90px_1fr] items-center gap-3">
            <Label className="text-right text-sm">
              Priority<span className="text-destructive ml-1">*</span>
            </Label>
            <Select
              value={formData.priority}
              onValueChange={(value: "high" | "medium" | "low") => setFormData(prev => ({ ...prev, priority: value }))}
            >
              <SelectTrigger className="text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map((priority) => (
                  <SelectItem key={priority} value={priority}>
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Label className="text-right text-sm">
              Category<span className="text-destructive ml-1">*</span>
            </Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
            >
              <SelectTrigger className="text-base">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="grid grid-cols-[90px_1fr] items-center gap-3">
            <Label className="text-right text-sm">
              Title<span className="text-destructive ml-1">*</span>
            </Label>
            <Input
              value={formData.title}
              onChange={updateField("title")}
              className="text-base"
              placeholder="Brief summary of the advocacy action"
            />
          </div>
        </section>

        <hr className="border-border/40" />

        {/* DESCRIPTION */}
        <section className="space-y-4 py-1">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Description
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Detailed explanation of the concern or issue
            </p>
          </div>

          <div className="space-y-3">
            <Textarea
              rows={4}
              value={formData.description}
              onChange={updateField("description")}
              placeholder="Describe the situation, concern, or issue that needs advocacy..."
              className="text-base resize-none"
            />
          </div>
        </section>

        <hr className="border-border/40" />

        {/* ACTION ITEMS */}
        <section className="space-y-4 py-1">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Action Items
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Recommended steps to address this advocacy need
            </p>
          </div>

          <div className="space-y-3">
            {/* Existing Action Items */}
            {actionItems.length > 0 && (
              <div className="space-y-2">
                {actionItems.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 p-3 border rounded-md bg-muted/30"
                  >
                    <span className="text-primary mt-1">•</span>
                    <span className="flex-1 text-sm">{item}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeActionItem(index)}
                      className="h-6 w-6 p-0 hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Add New Action Item */}
            <div className="flex gap-2">
              <Input
                value={newActionItem}
                onChange={(e) => setNewActionItem(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addActionItem();
                  }
                }}
                placeholder="Enter a new action item and press Enter or click Add"
                className="text-base"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={addActionItem}
                disabled={!newActionItem.trim()}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
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
                disabled={isDeleting}
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
              onClick={() => navigate(config.routes.advocacyLab)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={
                isSaving ||
                !formData.category ||
                !formData.title ||
                !formData.description ||
                actionItems.length === 0
              }
            >
              {isSaving ? "Saving..." : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {isNew ? "Create Insight" : "Save Changes"}
                </>
              )}
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
              Delete Advocacy Insight
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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
