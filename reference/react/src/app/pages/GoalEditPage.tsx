import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../providers/AuthProvider";
import { getGoalsService } from "../../domain/goals/goals.service";
import { getChildService } from "../../domain/child/child.service";
import type { Goal } from "../../domain/goals/types";
import type { Child } from "../../domain/child/types";
import { PageHeader } from "../ui/PageHeader";
import { Card } from "../../components/ui/card";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Button } from "../../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../../components/ui/alert-dialog";
import { ArrowLeft, Save, Trash2, Target, TrendingUp, Clock, AlertTriangle } from "lucide-react";
import { config } from "../../lib/config";
import { useNotification } from "../../hooks/useNotification";

const GOAL_AREAS = [
  "Reading",
  "Math",
  "Writing",
  "Communication",
  "Social Skills",
  "Social Emotional",
  "Behavior",
  "Self-Help",
  "Motor Skills",
  "Adaptive Skills",
  "Speech & Language",
  "Occupational Therapy",
  "Physical Therapy",
  "Self-Care & Independent Living",
  "Vocational",
  "Transition",
  "Other",
];

const TIMELINES = [
  "3 months",
  "6 months",
  "9 months",
  "1 year",
  "By next IEP",
];

const SKILL_FOCUS_BY_AREA: Record<string, string[]> = {
  Reading: ["Decoding", "Fluency", "Comprehension", "Phonics", "Sight Words"],
  Math: ["Number Sense", "Computation", "Problem Solving", "Geometry", "Measurement"],
  Writing: ["Handwriting", "Spelling", "Sentence Structure", "Paragraph Writing", "Essay Writing"],
  Communication: ["Expressive Language", "Receptive Language", "Articulation", "Pragmatics", "AAC Use"],
  "Social Skills": ["Turn-Taking", "Sharing", "Peer Interaction", "Conflict Resolution", "Emotions"],
  "Social Emotional": ["Emotional Regulation", "Self-Awareness", "Empathy", "Relationship Skills", "Responsible Decision-Making"],
  Behavior: ["Self-Regulation", "Following Directions", "Staying on Task", "Transitions", "Coping Skills"],
  "Self-Help": ["Toileting", "Feeding", "Dressing", "Hygiene", "Independence"],
  "Motor Skills": ["Fine Motor", "Gross Motor", "Balance", "Coordination", "Handwriting"],
  "Adaptive Skills": ["Daily Living", "Community Skills", "Safety", "Money Management", "Time Management"],
  "Speech & Language": ["Articulation", "Expressive Language", "Receptive Language", "Pragmatics", "Fluency", "Voice", "AAC"],
  "Occupational Therapy": ["Fine Motor", "Sensory Processing", "Self-Care", "Visual Motor", "Handwriting"],
  "Physical Therapy": ["Gross Motor", "Balance", "Gait", "Strength", "Mobility"],
  "Self-Care & Independent Living": ["Personal Hygiene", "Meal Preparation", "Money Management", "Transportation", "Time Management"],
  Vocational: ["Job Skills", "Work Behavior", "Career Exploration", "Workplace Communication", "Task Completion"],
  Transition: ["Post-Secondary Education", "Employment", "Independent Living", "Community Participation", "Self-Advocacy"],
  Other: [],
};

const BASELINE_TEMPLATES = [
  "with appropriate adult support,",
  "with visual supports,",
  "in 3 out of 5 trials,",
  "with 40% accuracy,",
  "at grade-level expectations,",
];

const TARGET_TEMPLATES = [
  "independently",
  "with minimal prompting",
  "with 80% accuracy",
  "in 4 out of 5 trials",
  "at grade-level performance",
];

export function GoalEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, accessToken } = useAuth();
  const { showSuccess, showError } = useNotification();

  const isNew = id === "new";

  const [children, setChildren] = useState<Child[]>([]);
  const [childId, setChildId] = useState("");
  const [goalArea, setGoalArea] = useState("");
  const [skillFocus, setSkillFocus] = useState("");
  const [baselineText, setBaselineText] = useState("");
  const [targetText, setTargetText] = useState("");
  const [timeline, setTimeline] = useState("");
  const [goalStatement, setGoalStatement] = useState("");
  const [notes, setNotes] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    loadChildren();
    if (!isNew && id) {
      loadGoal(id);
    }
  }, [id, isNew, accessToken]);

  // Auto-generate goal statement when fields change
  useEffect(() => {
    if (childId && goalArea && skillFocus && baselineText && targetText && timeline) {
      const child = children.find((c) => c.id === childId);
      const childName = child ? child.name : "the student";
      
      const statement = `Given ${baselineText}, ${childName} will ${skillFocus} at ${targetText} in ${timeline.toLowerCase()} as measured by ${goalArea.toLowerCase()} assessments.`;
      setGoalStatement(statement);
    }
  }, [childId, goalArea, skillFocus, baselineText, targetText, timeline, children]);

  async function loadChildren() {
    if (!user || !accessToken) return;
    const service = getChildService();
    const data = await service.getAll(accessToken);
    setChildren(data);
    if (data.length > 0 && !childId && data[0]) {
      setChildId(data[0].id);
    }
  }

  async function loadGoal(goalId: string) {
    if (!accessToken) return;
    const service = getGoalsService();
    const goal = await service.getById(accessToken, goalId);
    setChildId(goal.childId);
    setGoalStatement(goal.goalStatement || goal.description || "");
    
    // Try to parse structured data from notes
    const notes = goal.notes || "";
    const parseField = (field: string) => {
      const match = notes.match(new RegExp(`${field}:\\s*(.+?)(?:\\n|$)`, 'i'));
      return match ? match[1].trim() : "";
    };
    
    const goalArea = parseField("Goal Area");
    const skillFocus = parseField("Skill Focus");
    const baseline = parseField("Baseline");
    const target = parseField("Target");
    const timeline = parseField("Timeline");
    
    setGoalArea(goalArea || goal.area || goal.goalArea || "");
    setSkillFocus(skillFocus || goal.skillFocus || "");
    setBaselineText(baseline || goal.baselineText || "");
    setTargetText(target || goal.targetText || "");
    setTimeline(timeline || goal.timeline || goal.duration || "");
    
    // Extract additional notes (everything after "Additional Notes:")
    const additionalNotesMatch = notes.match(/Additional Notes:\s*([\s\S]*)/i);
    setNotes(additionalNotesMatch ? additionalNotesMatch[1].trim() : "");
  }

  async function handleSave() {
    if (!accessToken || !childId || !goalStatement) {
      showError("Please fill in child and goal statement");
      return;
    }

    setIsSaving(true);
    try {
      const service = getGoalsService();

      // Map frontend fields to API schema
      const categoryMap: Record<string, string> = {
        "Reading": "reading",
        "Math": "math",
        "Writing": "writing",
        "Communication": "communication",
        "Social Skills": "social",
        "Social Emotional": "social_emotional",
        "Behavior": "behavior",
        "Self-Help": "adaptive",
        "Motor Skills": "motor",
        "Adaptive Skills": "adaptive",
        "Speech & Language": "speech_language",
        "Occupational Therapy": "occupational_therapy",
        "Physical Therapy": "physical_therapy",
        "Self-Care & Independent Living": "self_care_independent_living",
        "Vocational": "vocational",
        "Transition": "transition",
        "Other": "other",
      };

      // Build comprehensive notes with all the detailed fields
      const detailedNotes = `Goal Area: ${goalArea}
Skill Focus: ${skillFocus}
Baseline: ${baselineText}
Target: ${targetText}
Timeline: ${timeline}

${notes ? `Additional Notes:\n${notes}` : ''}`.trim();

      const data = {
        childId,
        goalText: goalStatement,
        category: categoryMap[goalArea] || "other",
        notes: detailedNotes,
      } as any; // API schema differs from frontend types

      console.log("Attempting to save goal with data:", data);

      if (isNew) {
        await service.create(accessToken, data);
        showSuccess("Goal created successfully");
      } else if (id) {
        await service.update(accessToken, id, data);
        showSuccess("Goal updated successfully");
      }

      navigate(config.routes.goalProgress);
    } catch (error) {
      console.error("Error saving goal:", error);
      console.error("Full error:", JSON.stringify(error, null, 2));
      showError(error instanceof Error ? error.message : "Failed to save goal");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!isNew && id && accessToken) {
      const service = getGoalsService();
      await service.delete(accessToken, id);
      showSuccess("Goal deleted successfully");
      navigate(config.routes.goalProgress);
    }
  }

  function addBaselineTemplate(template: string) {
    setBaselineText((prev) => (prev ? `${template} ${prev}` : template));
  }

  function addTargetTemplate(template: string) {
    setTargetText((prev) => (prev ? `${template} ${prev}` : template));
  }

  const skillOptions = goalArea ? SKILL_FOCUS_BY_AREA[goalArea] || [] : [];

  return (
    <div className="h-full flex flex-col">
      {/* HEADER */}
      
          <h1 className="text-xl font-semibold">
            {isNew ? "New IEP Goal" : "Edit IEP Goal"}
          </h1>


      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto px-6 pb-32 max-w-6xl mx-auto w-full">
          {/* GOAL SETUP */}
          <section className="space-y-4 py-4">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Target className="h-5 w-5" />
                Goal Setup
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

              <div className="grid grid-cols-[90px_200px_90px_1fr] items-center gap-3">
                <Label className="text-right text-sm">
                  Goal Area
                </Label>
                <Select value={goalArea} onValueChange={(value) => { setGoalArea(value); setSkillFocus(""); }}>
                  <SelectTrigger id="goalArea" className="text-base">
                    <SelectValue placeholder="Select area" />
                  </SelectTrigger>
                  <SelectContent>
                    {GOAL_AREAS.map((area) => (
                      <SelectItem key={area} value={area}>
                        {area}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Label className="text-right text-sm">
                  Skill Focus
                </Label>
                {skillOptions.length > 0 ? (
                  <Select value={skillFocus} onValueChange={setSkillFocus} disabled={!goalArea}>
                    <SelectTrigger id="skillFocus" className="text-base">
                      <SelectValue placeholder="Select skill" />
                    </SelectTrigger>
                    <SelectContent>
                      {skillOptions.map((skill) => (
                        <SelectItem key={skill} value={skill}>
                          {skill}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="skillFocus"
                    value={skillFocus}
                    onChange={(e) => setSkillFocus(e.target.value)}
                    placeholder="Enter skill focus"
                    disabled={!goalArea}
                    className="text-base"
                  />
                )}
              </div>

              <div className="grid grid-cols-[90px_1fr] items-center gap-3">
                <Label className="text-right text-sm">
                  Timeline
                </Label>
                <Select value={timeline} onValueChange={setTimeline}>
                  <SelectTrigger id="timeline" className="text-base">
                    <SelectValue placeholder="Select timeline" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMELINES.map((t) => (
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

          {/* BASELINE */}
          <section className="space-y-4 py-4">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Current Performance (Baseline)
              </h2>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-[90px_1fr] items-center gap-3">
                <Label className="text-right text-sm">Add phrase</Label>

                <Select
                  onValueChange={(value) =>
                    setBaselineText(prev => (prev ? `${prev} ${value}` : value))
                  }
                >
                  <SelectTrigger className="text-base">
                    <SelectValue placeholder="Insert baseline phrase" />
                  </SelectTrigger>
                  <SelectContent>
                    {BASELINE_TEMPLATES.map(t => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>


              <Label htmlFor="baseline">
                Baseline
              </Label>
              <Textarea
                id="baseline"
                value={baselineText}
                onChange={(e) => setBaselineText(e.target.value)}
                placeholder="e.g., appropriate adult support, visual supports, the student reads at 45 words per minute with 70% accuracy"
                rows={3}
              />
              <p className="text-xs text-muted-foreground">Describe current performance level</p>
            </div>
        </section>

        <hr className="border-border/40" />

          {/* TARGET */}
          <section className="space-y-4 py-4">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Target className="h-5 w-5" />
                Target Performance
              </h2>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-[90px_1fr] items-center gap-3">
                <Label className="text-right text-sm">Add phrase</Label>

                <Select
                  onValueChange={(value) =>
                    setTargetText(prev => (prev ? `${prev} ${value}` : value))
                  }
                >
                  <SelectTrigger className="text-base">
                    <SelectValue placeholder="Insert target phrase" />
                  </SelectTrigger>
                  <SelectContent>
                    {TARGET_TEMPLATES.map(t => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>


              <Label htmlFor="target">
                Target
              </Label>
              <Textarea
                id="target"
                value={targetText}
                onChange={(e) => setTargetText(e.target.value)}
                placeholder="e.g., 90 words per minute with 95% accuracy independently"
                rows={3}
              />
              <p className="text-xs text-muted-foreground">Describe expected performance level</p>
            </div>
        </section>

        <hr className="border-border/40" />

          {/* GOAL STATEMENT */}
          <section className="space-y-4 py-4">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Clock className="h-5 w-5" />
                IEP Goal Statement
              </h2>
            </div>

            <div className="space-y-2">
              <Label htmlFor="goalStatement">
                Goal Statement <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="goalStatement"
                value={goalStatement}
                onChange={(e) => setGoalStatement(e.target.value)}
                placeholder="Auto-generated from fields above (editable)"
                rows={4}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Auto-generated based on your inputs. You can edit this directly if needed.
              </p>
            </div>
        </section>

        <hr className="border-border/40" />

          {/* NOTES */}
          <section className="space-y-4 py-8">
            <div>
              <h2 className="text-lg font-semibold">Additional Notes</h2>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional context, strategies, or observations..."
                rows={3}
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
              onClick={() => navigate(config.routes.goalProgress)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : isNew ? "Create Goal" : "Save Changes"}
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
              Delete Goal
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
