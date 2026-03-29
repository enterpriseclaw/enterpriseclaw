import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider.tsx";
import { getIEPService } from "@/domain/iep/iep.service.ts";
import type { IEP, CreateIEPData } from "@/domain/iep/types.ts";
import { getChildService } from "@/domain/child/child.service.ts";
import type { Child } from "@/domain/child/types.ts";
import { PageHeader } from "@/app/ui/PageHeader.tsx";
import { LoadingState } from "@/app/ui/LoadingState.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select.tsx";
import { useNotification } from "@/hooks/useNotification.tsx";
import { logger } from "@/lib/logger.ts";
import { config } from "@/lib/config.ts";

export function IEPEditPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === "new";
  const navigate = useNavigate();
  const { accessToken } = useAuth();
  const { showSuccess, showError } = useNotification();

  const [children, setChildren] = useState<Child[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CreateIEPData>({
    childId: "",
    startDate: "",
    endDate: "",
    goals: [],
    accommodations: [],
    services: [],
    notes: "",
  });

  useEffect(() => {
    if (!accessToken) return;

    const load = async () => {
      try {
        const childService = getChildService();
        const kids = await childService.getAll(accessToken);
        setChildren(kids);

        if (!isNew && id) {
          const service = getIEPService();
          const iep = await service.getById(id);
          setForm({
            childId: iep.childId,
            startDate: iep.startDate.slice(0, 10),
            endDate: iep.endDate.slice(0, 10),
            goals: iep.goals || [],
            accommodations: iep.accommodations || [],
            services: iep.services || [],
            notes: iep.notes || "",
          });
        } else if (kids[0]) {
          setForm((prev) => ({ ...prev, childId: prev.childId || kids[0].id }));
        }
      } catch (error) {
        logger.error("Error loading IEP form", { error });
        showError("Failed to load IEP");
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [accessToken, id, isNew, showError]);

  const handleArrayChange = (field: "goals" | "accommodations" | "services", value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean),
    }));
  };

  const handleSubmit = async () => {
    if (!accessToken) return;
    if (!form.childId || !form.startDate || !form.endDate) {
      showError("Please fill required fields");
      return;
    }

    setSaving(true);
    try {
      const service = getIEPService();
      if (isNew) {
        await service.create(form);
        showSuccess("IEP created");
      } else if (id) {
        await service.update(id, form);
        showSuccess("IEP updated");
      }
      navigate(config.routes.iepList);
    } catch (error) {
      logger.error("Save IEP failed", { error });
      showError("Failed to save IEP");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <LoadingState message="Loading IEP..." />;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        title={isNew ? "New IEP" : "Edit IEP"}
        description="Store key IEP metadata and link to analyses"
      />

      <Card>
        <CardHeader>
          <CardTitle>IEP Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Child</Label>
              <Select value={form.childId} onValueChange={(v) => setForm((p) => ({ ...p, childId: v }))}>
                <SelectTrigger>
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
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Goals (comma separated)</Label>
              <Input
                value={form.goals.join(", ")}
                onChange={(e) => handleArrayChange("goals", e.target.value)}
                placeholder="Goal IDs or names"
              />
            </div>
            <div className="space-y-2">
              <Label>Accommodations (comma separated)</Label>
              <Input
                value={form.accommodations.join(", ")}
                onChange={(e) => handleArrayChange("accommodations", e.target.value)}
                placeholder="Accommodation names"
              />
            </div>
            <div className="space-y-2">
              <Label>Services (comma separated)</Label>
              <Input
                value={form.services.join(", ")}
                onChange={(e) => handleArrayChange("services", e.target.value)}
                placeholder="Service names"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={form.notes || ""}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              rows={4}
              placeholder="Key highlights, concerns, or meeting notes"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => navigate(config.routes.iepList)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? "Saving..." : "Save IEP"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
