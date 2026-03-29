import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/app/providers/AuthProvider";
import { getComplianceService } from "@/domain/compliance/compliance.service";
import { getChildService } from "@/domain/child/child.service";
import type { Child } from "@/domain/child/types";
import { useNotification } from "@/hooks/useNotification";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingState } from "@/app/ui/LoadingState";
import { ArrowLeft, Save } from "lucide-react";
import { logger } from "@/lib/logger";
import { config } from "@/lib/config";

/* ---------------------- CONSTANTS ---------------------- */

const SERVICE_TEMPLATES = [
  { label: "Speech Therapy - 30 min", serviceType: "Speech Therapy", minutes: 30 },
  { label: "Occupational Therapy - 30 min", serviceType: "Occupational Therapy", minutes: 30 },
  { label: "Physical Therapy - 30 min", serviceType: "Physical Therapy", minutes: 30 },
  { label: "Counseling - 30 min", serviceType: "Counseling", minutes: 30 },
  { label: "Resource Room - 60 min", serviceType: "Resource Room", minutes: 60 },
  { label: "Extended School Year (ESY)", serviceType: "ESY", minutes: 60 },
  { label: "Custom Service", serviceType: "", minutes: 30 },
];

const STATUS_OPTIONS = [
  { value: "scheduled", label: "Scheduled" },
  { value: "provided", label: "Provided" },
  { value: "missed", label: "Missed" },
  { value: "cancelled", label: "Cancelled" },
];

/* ---------------------- REUSABLE FIELD ---------------------- */

const FieldRow = ({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) => (
  <div className="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-x-4 gap-y-1 items-center">
    <Label className="md:text-right text-sm">
      {label}
      {required && <span className="text-destructive ml-1">*</span>}
    </Label>
    {children}
  </div>
);

/* ---------------------- COMPONENT ---------------------- */

export function ComplianceEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, accessToken } = useAuth();
  const { showSuccess, showError } = useNotification();

  const [children, setChildren] = useState<Child[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    childId: "",
    serviceDate: new Date().toISOString().split("T")[0],
    serviceType: "",
    serviceProvider: "",
    status: "scheduled",
    minutesProvided: 0,
    minutesRequired: 30,
    notes: "",
    issueReported: false,
  });

  const isNew = !id;

  useEffect(() => {
    if (!user || !accessToken) return;

    const loadData = async () => {
      try {
        const childService = getChildService();
        const childrenData = await childService.getAll(accessToken);
        setChildren(childrenData);

        if (isNew) {
          setFormData((p) => ({ ...p, childId: childrenData[0]?.id || "" }));
        } else if (id) {
          const complianceService = getComplianceService();
          const item = await complianceService.getById(accessToken, id);

          setFormData({
            childId: item.childId,
            serviceDate: item.serviceDate,
            serviceType: item.serviceType,
            serviceProvider: item.serviceProvider || "",
            status: item.status,
            minutesProvided: item.minutesProvided || 0,
            minutesRequired: item.minutesRequired || 30,
            notes: item.notes || "",
            issueReported: item.issueReported || false,
          });
        }

        logger.debug("Compliance edit loaded", { id, isNew });
      } catch (error) {
        showError("Could not load compliance data");
        logger.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [id, isNew, user, accessToken]);

  const applyTemplate = (tpl: typeof SERVICE_TEMPLATES[number]) => {
    setFormData((p) => ({
      ...p,
      serviceType: tpl.serviceType,
      minutesRequired: tpl.minutes,
    }));
  };

  const handleSave = async () => {
    if (!formData.childId || !formData.serviceType.trim()) {
      showError("Required fields missing");
      return;
    }

    setIsSaving(true);
    try {
      const service = getComplianceService();
      const payload = { ...formData };

      if (isNew) {
        await service.create(accessToken!, { userId: user!.id, ...payload });
        showSuccess("Service log added");
      } else {
        await service.update(accessToken!, id!, payload);
        showSuccess("Service log updated");
      }

      navigate(config.routes.compliance);
    } catch (e) {
      showError("Failed to save service log");
      logger.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <LoadingState message="Loading..." />;

  return (
    <div className="max-w-4xl mx-auto px-2 py-1">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Button variant="ghost" size="icon">
          <ArrowLeft className="h-2 w-2" />
        </Button>
        <div>
          <h1 className="text-lg font-semibold leading-tight">
            Edit Service Log
          </h1>
          <p className="text-xs text-muted-foreground leading-tight">
            Track service delivery and compliance
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-1 pt-1">
          <CardTitle className="text-sm">Service Details</CardTitle>
        </CardHeader>

        <CardContent className="space-y-2">

          <FieldRow label="Child" required>
            <Select value={formData.childId} onValueChange={(v) => setFormData(p => ({ ...p, childId: v }))}>
              <SelectTrigger className="h-2">
                <SelectValue placeholder="Select child" />
              </SelectTrigger>
              <SelectContent>
                {children.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>

          <FieldRow label="Template">
            <Select onValueChange={(i) => applyTemplate(SERVICE_TEMPLATES[+i])}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select template" />
              </SelectTrigger>
              <SelectContent>
                {SERVICE_TEMPLATES.map((t, i) => (
                  <SelectItem key={i} value={i.toString()}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>

          <FieldRow label="Service Type" required>
            <Input className="h-9" value={formData.serviceType}
              onChange={(e) => setFormData(p => ({ ...p, serviceType: e.target.value }))} />
          </FieldRow>

          <FieldRow label="Date" required>
            <Input type="date" className="h-9" value={formData.serviceDate}
              onChange={(e) => setFormData(p => ({ ...p, serviceDate: e.target.value }))} />
          </FieldRow>

          <FieldRow label="Provider">
            <Input className="h-9" value={formData.serviceProvider}
              onChange={(e) => setFormData(p => ({ ...p, serviceProvider: e.target.value }))} />
          </FieldRow>

          <FieldRow label="Status">
            <Select value={formData.status} onValueChange={(v) => setFormData(p => ({ ...p, status: v }))}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(s => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>

          <FieldRow label="Minutes Required">
            <Input type="number" className="h-9"
              value={formData.minutesRequired}
              onChange={(e) => setFormData(p => ({ ...p, minutesRequired: +e.target.value || 0 }))} />
          </FieldRow>

          <FieldRow label="Minutes Provided">
            <Input type="number" className="h-9"
              value={formData.minutesProvided}
              onChange={(e) => setFormData(p => ({ ...p, minutesProvided: +e.target.value || 0 }))} />
          </FieldRow>

          <FieldRow label="Notes">
            <Textarea rows={3} className="resize-none"
              value={formData.notes}
              onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))} />
          </FieldRow>

          <div className="flex gap-3 pt-3">
            <Button className="flex-1" onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : isNew ? "Add" : "Save"}
            </Button>
            <Button variant="outline" className="flex-1"
              onClick={() => navigate(config.routes.compliance)}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
