import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import { getBehaviorService } from "@/domain/behavior/behavior.service";
import { getChildService } from "@/domain/child/child.service";
import { config } from "@/lib/config";
import type { BehaviorEntry, CreateBehaviorData } from "@/domain/behavior/types";
import type { Child } from "@/domain/child/types";
import { useNotification } from "@/hooks/useNotification";
import { LoadingState } from "@/app/ui/LoadingState";
import { PageHeader } from "@/app/ui/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ArrowLeft, Save, MapPin, Clock, FileText, AlertTriangle, Trash2, Activity } from "lucide-react";
import { logger } from "@/lib/logger";

const LOCATION_OPTIONS = [
  "Classroom",
  "Hallway",
  "Cafeteria",
  "Playground/Recess",
  "Gym",
  "Bathroom",
  "Library",
  "Bus",
  "Therapy Room",
  "Other",
];

const ANTECEDENT_SUGGESTIONS = [
  "Given worksheet/assignment",
  "Transition requested",
  "Peer interaction/conflict",
  "Denied preferred item/activity",
  "Asked to wait",
  "Loud noise/sensory trigger",
  "Change in routine",
  "Academic demand increased",
];

const BEHAVIOR_SUGGESTIONS = [
  "Refused work/task",
  "Left seat/area",
  "Verbal outburst/yelling",
  "Physical aggression",
  "Self-injury",
  "Throwing objects",
  "Elopement/running",
  "Crying/emotional distress",
  "Property destruction",
];

const CONSEQUENCE_SUGGESTIONS = [
  "Teacher redirected verbally",
  "Task removed/modified",
  "Break provided",
  "Ignored/minimal attention",
  "Peer moved/separated",
  "Sent to office",
  "Parent contacted",
  "Completed task later",
];

const getTodayISODate = () => new Date().toISOString().split("T")[0] ?? "";
const getNowHHmm = () => new Date().toTimeString().slice(0, 5);

export function BehaviorEditPage() {
  const { id } = useParams<{ id: string }>();
  const { user, accessToken } = useAuth();
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [behavior, setBehavior] = useState<BehaviorEntry | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  
  const [formData, setFormData] = useState<CreateBehaviorData>({
    childId: "",
    date: getTodayISODate(), // Today
    time: getNowHHmm(), // Now HH:mm
    location: "",
    antecedent: "",
    behavior: "",
    consequence: "",
    notes: "",
  });

  const isNew = id === "new";

  useEffect(() => {
    if (!user || !accessToken) return;

    const loadData = async () => {
      try {
        const childService = getChildService();
        const childrenData = await childService.getAll(accessToken);
        setChildren(childrenData);

        if (isNew) {
          // Pre-select first child if available
          const firstChild = childrenData.at(0);
          if (firstChild) {
            setFormData(prev => ({ ...prev, childId: firstChild.id }));
          }
          setIsLoading(false);
          return;
        }

        const service = getBehaviorService();
        const behaviorData = await service.getById(accessToken, id!);
        setBehavior(behaviorData);
        setFormData({
          childId: behaviorData.childId,
          date: behaviorData.date ?? getTodayISODate(),
          time: behaviorData.time ?? getNowHHmm(),
          location: behaviorData.location ?? "",
          antecedent: behaviorData.antecedent ?? "",
          behavior: behaviorData.behavior ?? "",
          consequence: behaviorData.consequence ?? "",
          notes: behaviorData.notes || "",
        });
        
        logger.debug("Behavior loaded for editing", { behaviorId: id });
      } catch (error) {
        logger.error("Error loading behavior", { error });
        showError("Error", "Failed to load behavior entry");
        navigate(config.routes.behaviorAbc);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [id, user, accessToken, isNew, navigate, showError]);

  const handleSave = async () => {
    if (!user || !accessToken) return;

    // Validation
    if (!formData.childId) {
      showError("Validation Error", "Please select a child");
      return;
    }
    if (!formData.date) {
      showError("Validation Error", "Date is required");
      return;
    }
    if (!formData.time) {
      showError("Validation Error", "Time is required");
      return;
    }
    if (!formData.location) {
      showError("Validation Error", "Location is required");
      return;
    }
    if (!formData.antecedent.trim()) {
      showError("Validation Error", "Antecedent is required");
      return;
    }
    if (!formData.behavior.trim()) {
      showError("Validation Error", "Behavior is required");
      return;
    }
    if (!formData.consequence.trim()) {
      showError("Validation Error", "Consequence is required");
      return;
    }

    setIsSaving(true);
    try {
      const service = getBehaviorService();
      
      if (isNew) {
        const newEntry = await service.create(accessToken, formData);
        showSuccess("Behavior Logged", "Behavior entry has been saved successfully");
        logger.info("Behavior entry created", { behaviorId: newEntry.id });
        navigate(config.routes.behaviorAbc);
      } else {
        const updated = await service.update(accessToken, id!, formData);
        setBehavior(updated);
        showSuccess("Changes Saved", "Behavior entry has been updated successfully");
        logger.info("Behavior entry updated", { behaviorId: id });
        navigate(config.routes.behaviorAbc);
      }
    } catch (error) {
      showError("Save Failed", "Could not save behavior entry");
      logger.error("Error saving behavior", { error });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!behavior || !id || !accessToken) return;

    setShowDeleteDialog(false);
    setIsDeleting(true);
    try {
      const service = getBehaviorService();
      await service.delete(accessToken, id);
      showSuccess("Behavior entry deleted successfully");
      logger.info("Behavior deleted", { behaviorId: id });
      navigate(config.routes.behaviorAbc);
    } catch (error) {
      logger.error("Error deleting behavior", { behaviorId: id, error });
      showError("Failed to delete behavior entry");
    } finally {
      setIsDeleting(false);
    }
  };

  const addAntecedent = (text: string) => {
    setFormData(prev => ({
      ...prev,
      antecedent: prev.antecedent 
        ? `${prev.antecedent}\n${text}` 
        : `Before the behavior, ${text.toLowerCase()}.`
    }));
  };

  const addBehavior = (text: string) => {
    setFormData(prev => ({
      ...prev,
      behavior: prev.behavior 
        ? `${prev.behavior}\n${text}` 
        : `The child ${text.toLowerCase()}.`
    }));
  };

  const addConsequence = (text: string) => {
    setFormData(prev => ({
      ...prev,
      consequence: prev.consequence 
        ? `${prev.consequence}\n${text}` 
        : `Following the behavior, ${text.toLowerCase()}.`
    }));
  };

  if (isLoading) {
    return <LoadingState message="Loading behavior entry..." />;
  }

  const selectedChild = children.find(c => c.id === formData.childId);

  return (
    <div className="h-full flex flex-col">
      {/* HEADER */}
        
          <h1 className="text-xl font-semibold">
            {isNew ? "Log Behavior" : "Edit Behavior Entry"}
          </h1>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto px-6 pb-32 max-w-6xl mx-auto w-full">
          
          {/* CONTEXT */}
          <section className="space-y-4 py-1">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Context
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                When and where did this behavior occur?
              </p>
            </div>

            <div className="space-y-1">
              <div className="grid grid-cols-[90px_1fr] items-center gap-3">
                <Label className="text-right text-sm">
                  Child<span className="text-destructive ml-1">*</span>
                </Label>
                <Select 
                  value={formData.childId} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, childId: value }))}
                  disabled={!isNew}
                >
                  <SelectTrigger id="child" className="text-base">
                    <SelectValue placeholder="Select a child" />
                  </SelectTrigger>
                  <SelectContent>
                    {children.map((child) => (
                      <SelectItem key={child.id} value={child.id}>
                        {child.name} (Age {child.age}, Grade {child.grade})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-[90px_100px_90px_1fr] items-center gap-3">
                <Label className="text-right text-sm">
                  Date<span className="text-destructive ml-1">*</span>
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  max={getTodayISODate()}
                  className="text-base"
                />
                
                <Label className="text-right text-sm">
                  Time<span className="text-destructive ml-1">*</span>
                </Label>
                <Input
                  id="time"
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                  className="text-base"
                />
              </div>

              <div className="grid grid-cols-[90px_1fr] items-center gap-3">
                <Label className="text-right text-sm">
                  Location<span className="text-destructive ml-1">*</span>
                </Label>
                <Select 
                  value={formData.location} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, location: value }))}
                >
                  <SelectTrigger id="location" className="text-base">
                    <SelectValue placeholder="Where did this happen?" />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCATION_OPTIONS.map((loc) => (
                      <SelectItem key={loc} value={loc}>
                        {loc}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
        </section>

        <hr className="border-border/40" />

          {/* ANTECEDENT */}
          <section className="space-y-4 py-1">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5" />
                A - Antecedent
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                What happened immediately before the behavior?
              </p>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-[90px_1fr] items-center gap-3">
                <Label className="text-right text-sm">Add phrase</Label>
                <Select
                  onValueChange={(value) => addAntecedent(value)}
                >
                  <SelectTrigger className="text-base">
                    <SelectValue placeholder="Insert antecedent phrase" />
                  </SelectTrigger>
                  <SelectContent>
                    {ANTECEDENT_SUGGESTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Textarea */}
              <div className="space-y-2">
                <Label htmlFor="antecedent">Description *</Label>
                <Textarea
                  id="antecedent"
                  value={formData.antecedent}
                  onChange={(e) => setFormData(prev => ({ ...prev, antecedent: e.target.value }))}
                  placeholder="Before the behavior, the child was asked to complete an academic task."
                  rows={4}
                  className="resize-none font-mono text-sm"
                />
              </div>
            </div>
        </section>

        <hr className="border-border/40" />

          {/* BEHAVIOR */}
          <section className="space-y-4 py-1">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5" />
                B - Behavior
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                What exactly did the child do?
              </p>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-[90px_1fr] items-center gap-3">
                <Label className="text-right text-sm">Add phrase</Label>
                <Select
                  onValueChange={(value) => addBehavior(value)}
                >
                  <SelectTrigger className="text-base">
                    <SelectValue placeholder="Insert behavior phrase" />
                  </SelectTrigger>
                  <SelectContent>
                    {BEHAVIOR_SUGGESTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Textarea */}
              <div className="space-y-2">
                <Label htmlFor="behavior">Description *</Label>
                <Textarea
                  id="behavior"
                  value={formData.behavior}
                  onChange={(e) => setFormData(prev => ({ ...prev, behavior: e.target.value }))}
                  placeholder="The child refused to engage with the assigned task."
                  rows={4}
                  className="resize-none font-mono text-sm"
                />
              </div>
            </div>
        </section>

        <hr className="border-border/40" />

          {/* CONSEQUENCE */}
          <section className="space-y-4 py-1">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5" />
                C - Consequence
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                What happened immediately after the behavior?
              </p>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-[90px_1fr] items-center gap-3">
                <Label className="text-right text-sm">Add phrase</Label>
                <Select
                  onValueChange={(value) => addConsequence(value)}
                >
                  <SelectTrigger className="text-base">
                    <SelectValue placeholder="Insert consequence phrase" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONSEQUENCE_SUGGESTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Textarea */}
              <div className="space-y-2">
                <Label htmlFor="consequence">Description *</Label>
                <Textarea
                  id="consequence"
                  value={formData.consequence}
                  onChange={(e) => setFormData(prev => ({ ...prev, consequence: e.target.value }))}
                  placeholder="Following the behavior, the child was given a short break."
                  rows={4}
                  className="resize-none font-mono text-sm"
                />
              </div>
            </div>
        </section>

        <hr className="border-border/40" />

          {/* NOTES */}
          <section className="space-y-4 py-1">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Additional Notes
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Optional observations, context, or follow-up information
              </p>
            </div>

            <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional context, patterns observed, or recommendations..."
                rows={3}
                className="resize-none"
              />
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
              onClick={() => navigate(config.routes.behaviorAbc)}
              disabled={isSaving || isDeleting}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving || isDeleting}
            >
              {isSaving ? "Saving..." : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {isNew ? "Log Behavior" : "Save Changes"}
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
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Behavior Entry
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
