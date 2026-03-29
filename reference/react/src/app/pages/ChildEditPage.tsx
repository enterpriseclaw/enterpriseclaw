import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { useAuth } from "@/app/providers/AuthProvider";
import { getChildService } from "@/domain/child/child.service";
import { config } from "@/lib/config";
import type { Child } from "@/domain/child/types";
import { useNotification } from "@/hooks/useNotification";
import { LoadingState } from "@/app/ui/LoadingState";
import { PageHeader } from "@/app/ui/PageHeader";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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
  User,
  GraduationCap,
  Shield,
  Stethoscope,
  Trash2,
  AlertTriangle,
  X,
} from "lucide-react";

import { logger } from "@/lib/logger";

/* ------------------------------------------------------------------ */
/* CONSTANTS */
/* ------------------------------------------------------------------ */

const DISABILITY_OPTIONS = [
  "Autism Spectrum Disorder",
  "ADHD",
  "Dyslexia",
  "Speech/Language Impairment",
  "Dysgraphia",
  "Dyscalculia",
  "Emotional Disturbance",
  "Visual Impairment",
  "Hearing Impairment",
  "Intellectual Disability",
  "Specific Learning Disability",
  "Other Health Impairment",
];

const GRADE_OPTIONS = [
  "Pre-K",
  "Kindergarten",
  "1st",
  "2nd",
  "3rd",
  "4th",
  "5th",
  "6th",
  "7th",
  "8th",
  "9th",
  "10th",
  "11th",
  "12th",
];

const ACCOMMODATION_SUGGESTIONS = [
  "Extended time on tests (1.5x)",
  "Preferential seating",
  "Visual schedules",
  "Sensory breaks",
  "Reduced homework",
  "Oral testing option",
  "Small group instruction",
  "Noise-canceling headphones",
];

const SERVICE_SUGGESTIONS = [
  "Speech therapy 2x/week",
  "Occupational therapy",
  "Physical therapy",
  "Counseling services",
  "Behavior intervention support",
  "Social skills group",
];

/* ------------------------------------------------------------------ */
/* COMPONENT */
/* ------------------------------------------------------------------ */

export function ChildEditPage() {
  const { id } = useParams<{ id: string }>();
  const isNewChild = id === "new";

  const { user, accessToken } = useAuth();
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const [child, setChild] = useState<Child | null>(null);

  /* ---------------- FORM STATE ---------------- */

  const [formData, setFormData] = useState({
    name: "",
    age: "",
    grade: "",
    disabilities: [] as string[],
    accommodations: "",
    services: "",
  });

  /* ---------------- UI STATE ---------------- */

  const [disabilityQuery, setDisabilityQuery] = useState("");
  const [gradeQuery, setGradeQuery] = useState("");
  const [showGradeDropdown, setShowGradeDropdown] = useState(false);

  const [expandedSection, setExpandedSection] = useState<string | null>("core");
  const [showAccommodationDrawer, setShowAccommodationDrawer] = useState(false);
  const [showServiceDrawer, setShowServiceDrawer] = useState(false);
  const [showAdvancedAccommodations, setShowAdvancedAccommodations] = useState(false);
  const [showAdvancedServices, setShowAdvancedServices] = useState(false);
  
  const [selectedAccommodations, setSelectedAccommodations] = useState<string[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  /* ---------------- HELPERS ---------------- */

  const updateField =
    (key: keyof typeof formData) =>
    (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) =>
      setFormData(prev => ({
        ...prev,
        [key]: e.target.value,
      }));

  const filteredDisabilities = DISABILITY_OPTIONS.filter(
    d =>
      d.toLowerCase().includes(disabilityQuery.toLowerCase()) &&
      !formData.disabilities.includes(d)
  );

  const filteredGrades = GRADE_OPTIONS.filter(g =>
    g.toLowerCase().includes(gradeQuery.toLowerCase())
  );

  const toggleAccommodation = (acc: string) => {
    setSelectedAccommodations(prev => {
      const newSelected = prev.includes(acc)
        ? prev.filter(a => a !== acc)
        : [...prev, acc];
      
      // Sync with textarea
      const items = newSelected.map(a => `• ${a}`).join('\n');
      setFormData(p => ({ ...p, accommodations: items }));
      return newSelected;
    });
  };

  const toggleService = (svc: string) => {
    setSelectedServices(prev => {
      const newSelected = prev.includes(svc)
        ? prev.filter(s => s !== svc)
        : [...prev, svc];
      
      // Sync with textarea
      const items = newSelected.map(s => `• ${s}`).join('\n');
      setFormData(p => ({ ...p, services: items }));
      return newSelected;
    });
  };

  const getSectionStatus = (section: string) => {
    switch (section) {
      case 'core':
        return formData.name && formData.age && formData.grade ? '✔' : '';
      case 'disabilities':
        return formData.disabilities.length > 0 ? `✔ ${formData.disabilities.length}` : '';
      case 'accommodations':
        return selectedAccommodations.length > 0 ? `✔ ${selectedAccommodations.length}` : '';
      case 'services':
        return selectedServices.length > 0 ? `✔ ${selectedServices.length}` : '';
      default:
        return '';
    }
  };

  /* ------------------------------------------------------------------ */
  /* LOAD CHILD */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    if (!user || !accessToken) return;

    const load = async () => {
      if (isNewChild) {
        setIsLoading(false);
        return;
      }

      try {
        const service = getChildService();
        const list = await service.getAll(accessToken);
        const found = list.find(c => c.id === id);

        if (!found) {
          showError("Child not found");
          navigate(config.routes.childProfile);
          return;
        }

        setChild(found);
        setFormData({
          name: found.name,
          age: String(found.age),
          grade: found.grade,
          disabilities: found.disabilities,
          accommodations: found.accommodations || "",
          services: found.services || "",
        });

        logger.info("Loaded child", { id });
      } catch (e) {
        logger.error("Load error", { e });
        showError("Failed to load child");
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [id, user, accessToken]);

  /* ------------------------------------------------------------------ */
  /* SAVE */
  /* ------------------------------------------------------------------ */

  const handleSave = async () => {
    if (!user || !accessToken) return;

    if (!formData.name || !formData.age || !formData.grade) {
      showError("Please fill all required fields");
      return;
    }

    setIsSaving(true);
    try {
      const service = getChildService();

      if (isNewChild) {
        await service.create(accessToken, {
          name: formData.name,
          age: +formData.age,
          grade: formData.grade,
          disabilities: formData.disabilities,
          accommodationsSummary: formData.accommodations,
          servicesSummary: formData.services,
        });
        showSuccess("Child profile created");
      } else {
        await service.update(accessToken, id!, {
          name: formData.name,
          age: +formData.age,
          grade: formData.grade,
          disabilities: formData.disabilities,
          accommodationsSummary: formData.accommodations,
          servicesSummary: formData.services,
        });
        showSuccess("Changes saved");
      }

      navigate(config.routes.childProfile);
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
    if (!id || !accessToken) return;

    setIsDeleting(true);
    try {
      const service = getChildService();
      await service.delete(accessToken, id);
      showSuccess("Child deleted");
      navigate(config.routes.childProfile);
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
      
        {/*<div className="max-w-4xl mx-auto flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigate(config.routes.childProfile)}
          >
            <ArrowLeft className="h-2 w-2 mr-1" />
           
          </Button>*/}
          <h1 className="text-xl font-semibold">
            {isNewChild ? "Add Child Profile" : "Edit Child Profile"}
          </h1>
        
      

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto px-6 pb-32 max-w-6xl mx-auto w-full">
        {/* CORE INFORMATION */}
        <section className="space-y-4 py-4">
          {/* Header */}
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <User className="h-5 w-5" />
              Core Information
            </h2>
            {/*<p className="text-sm text-muted-foreground mt-1">
              Basic personal and academic details
            </p>*/}
          </div>

          {/* Name */}
          <div className="grid grid-cols-[90px_1fr] items-center gap-3">
            <Label className="text-right text-sm">
              Name<span className="text-destructive ml-1">*</span>
            </Label>
            <Input
              value={formData.name}
              onChange={updateField("name")}
              className="text-base"
            />
          </div>

          {/* Age + Grade */}
          <div className="grid grid-cols-[90px_80px_90px_110px] items-center gap-3">

            <Label className="text-right text-sm">
              Age<span className="text-destructive ml-1">*</span>
            </Label>
            <Input
              type="number"
              value={formData.age}
              onChange={updateField("age")}
              className="text-base w-20"
            />

            <Label className="text-right text-sm">
              Grade<span className="text-destructive ml-1">*</span>
            </Label>

            <div className="relative">
              <Input
                value={formData.grade}
                onChange={e => {
                  updateField("grade")(e);
                  setGradeQuery(e.target.value);
                  setShowGradeDropdown(true);
                }}
                onBlur={() =>
                  setTimeout(() => setShowGradeDropdown(false), 150)
                }
                className="text-base w-20"
              />

              {showGradeDropdown && filteredGrades.length > 0 && (
                <div className="absolute z-10 w-full border rounded bg-background shadow-lg mt-1">
                  {filteredGrades.map(g => (
                    <button
                      key={g}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                      onMouseDown={() => {
                        setFormData(p => ({ ...p, grade: g }));
                        setGradeQuery("");
                      }}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>




        <hr className="border-border/40" />

        {/* DISABILITIES */}
        <section className="space-y-0.1 py-0.1">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Disabilities & Conditions
            </h2>
            <p className="text-sm text-muted-foreground mt-1">Select all that apply</p>
          </div>

          <div className="space-y-3">
            <div className="relative">
              <div className="border rounded-md p-2 min-h-[44px] flex flex-wrap gap-1.5 cursor-text"
                onClick={() => document.getElementById('disability-search')?.focus()}
              >
                {formData.disabilities.map(d => (
                  <span
                    key={d}
                    className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-1 text-sm"
                  >
                    {d}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-destructive"
                      onClick={() =>
                        setFormData(p => ({
                          ...p,
                          disabilities: p.disabilities.filter(x => x !== d),
                        }))
                      }
                    />
                  </span>
                ))}
                <Input
                  id="disability-search"
                  placeholder={formData.disabilities.length === 0 ? "Search conditions..." : ""}
                  value={disabilityQuery}
                  onChange={e => setDisabilityQuery(e.target.value)}
                  className="border-0 shadow-none focus-visible:ring-0 p-0 h-7 flex-1 min-w-[200px] text-base"
                />
              </div>

              {disabilityQuery && filteredDisabilities.length > 0 && (
                <div className="absolute z-10 w-full border rounded-md bg-background shadow-lg mt-1 max-h-[200px] overflow-y-auto">
                  {filteredDisabilities.map(d => (
                    <button
                      key={d}
                      className="block w-full px-3 py-2 text-left hover:bg-muted text-sm"
                      onMouseDown={() => {
                        setFormData(p => ({
                          ...p,
                          disabilities: [...p.disabilities, d],
                        }));
                        setDisabilityQuery("");
                      }}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <hr className="border-border/40" />

        {/* ACCOMMODATIONS */}
        <section className="space-y-0.1 py-0.1">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Accommodations
            </h2>
            <p className="text-sm text-muted-foreground mt-1">Supports the school should provide</p>
          </div>

          <div className="space-y-1">
            <Textarea
              rows={3}
              value={formData.accommodations}
              onChange={updateField("accommodations")}
              placeholder="Enter accommodations (one per line)"
              className="text-base resize-none"
            />

            <div className="relative">
              {!showAccommodationDrawer ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAccommodationDrawer(true)}
                  className="text-sm"
                >
                  Add from suggestions ▾
                </Button>
              ) : (
                <div className="border rounded-md p-3 space-y-2 bg-muted/30">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Common accommodations</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => setShowAccommodationDrawer(false)}
                    >
                      ×
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ACCOMMODATION_SUGGESTIONS.slice(0, showAdvancedAccommodations ? undefined : 4).map(a => (
                      <Button
                        key={a}
                        size="sm"
                        variant={selectedAccommodations.includes(a) ? "default" : "outline"}
                        className="text-sm h-8"
                        onClick={() => toggleAccommodation(a)}
                      >
                        {selectedAccommodations.includes(a) ? '✓' : '+'} {a}
                      </Button>
                    ))}
                  </div>
                  {!showAdvancedAccommodations && ACCOMMODATION_SUGGESTIONS.length > 4 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full text-sm"
                      onClick={() => setShowAdvancedAccommodations(true)}
                    >
                      Show more options
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        <hr className="border-border/40" />

        {/* SERVICES */}
        <section className="space-y-4 py-8">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Stethoscope className="h-5 w-5" />
              Related Services
            </h2>
            <p className="text-sm text-muted-foreground mt-1">Therapy and support services</p>
          </div>

          <div className="space-y-3">
            <Textarea
              rows={3}
              value={formData.services}
              onChange={updateField("services")}
              placeholder="Enter services (one per line)"
              className="text-base resize-none"
            />

            <div className="relative">
              {!showServiceDrawer ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowServiceDrawer(true)}
                  className="text-sm"
                >
                  + Add from suggestions ▾
                </Button>
              ) : (
                <div className="border rounded-md p-3 space-y-2 bg-muted/30">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Common services</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => setShowServiceDrawer(false)}
                    >
                      ×
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {SERVICE_SUGGESTIONS.map(s => (
                      <Button
                        key={s}
                        size="sm"
                        variant={selectedServices.includes(s) ? "default" : "outline"}
                        className="text-sm h-8"
                        onClick={() => toggleService(s)}
                      >
                        {selectedServices.includes(s) ? '✓' : '+'} {s}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* STICKY ACTION BAR */}
      <div className="sticky bottom-0 border-t bg-background/95 backdrop-blur shadow-lg">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {!isNewChild && (
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
              onClick={() => navigate(config.routes.childProfile)}
            >
              Cancel
            </Button>
            <Button 
              size="sm" 
              onClick={handleSave} 
              disabled={isSaving || !formData.name || !formData.age || !formData.grade}
            >
              {isSaving ? 'Saving...' : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {isNewChild ? "Create Profile" : "Save Changes"}
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
              Delete Child
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
