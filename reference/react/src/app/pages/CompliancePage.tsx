import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import { getComplianceService } from "@/domain/compliance/compliance.service";
import type { ComplianceItem } from "@/domain/compliance/types";
import { PageHeader } from "@/app/ui/PageHeader";
import { LoadingState } from "@/app/ui/LoadingState";
import { EmptyState } from "@/app/ui/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { ClipboardCheck, Plus, Edit, Trash2, AlertTriangle, Clock, CheckCircle, XCircle, Calendar } from "lucide-react";
import { logger } from "@/lib/logger";
import { config } from "@/lib/config";
import { useNotification } from "@/hooks/useNotification";

export function CompliancePage() {
  const { user, accessToken } = useAuth();
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const [items, setItems] = useState<ComplianceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !accessToken) return;

    const loadCompliance = async () => {
      try {
        const service = getComplianceService();
        const data = await service.getAll(accessToken);
        setItems(data);
        logger.debug("Service logs loaded", { count: data.length });
      } catch (error) {
        logger.error("Error loading service logs", { error });
        showError("Failed to Load", "Could not load service logs");
      } finally {
        setIsLoading(false);
      }
    };

    loadCompliance();
  }, [user, accessToken, showError]);

  const handleDelete = async () => {
    if (!deleteId || !accessToken) return;
    
    try {
      const service = getComplianceService();
      await service.delete(accessToken, deleteId);
      setItems(prev => prev.filter(i => i.id !== deleteId));
      showSuccess("Service log deleted successfully");
      logger.info("Service log deleted", { id: deleteId });
    } catch (error) {
      logger.error("Error deleting service log", { error });
      showError("Failed to delete service log");
    } finally {
      setDeleteId(null);
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading service logs..." />;
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "provided":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "scheduled":
        return <Clock className="h-5 w-5 text-blue-600" />;
      case "missed":
        return <XCircle className="h-5 w-5 text-red-600" />;
      case "cancelled":
        return <AlertTriangle className="h-5 w-5 text-orange-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "provided":
        return <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200">Provided</Badge>;
      case "scheduled":
        return <Badge variant="default" className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200">Scheduled</Badge>;
      case "missed":
        return <Badge variant="destructive">Missed</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="border-orange-600 text-orange-600">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatMinutes = (minutes?: number) => {
    if (!minutes) return "0 min";
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Calculate summary metrics
  const totalProvided = items.filter(i => i.status === "provided").length;
  const totalMissed = items.filter(i => i.status === "missed").length;
  const totalScheduled = items.filter(i => i.status === "scheduled").length;
  const complianceRate = items.length > 0 
    ? Math.round((totalProvided / (totalProvided + totalMissed || 1)) * 100) 
    : 0;

  // Calculate total minutes
  const minutesProvided = items
    .filter(i => i.status === "provided")
    .reduce((sum, i) => sum + (i.minutesProvided || 0), 0);
  const minutesRequired = items.reduce((sum, i) => sum + (i.minutesRequired || 0), 0);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="Service Delivery Tracking"
        description="Monitor IEP service delivery and compliance"
        action={
          <Button onClick={() => navigate(config.routes.complianceNew)}>
            <Plus className="mr-2 h-4 w-4" />
            Log Service
          </Button>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No service logs yet"
          description="Start tracking IEP service delivery (therapy sessions, minutes provided, etc.)"
        />
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Services Provided</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{totalProvided}</div>
                <p className="text-xs text-muted-foreground mt-1">{formatMinutes(minutesProvided)} total</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Services Missed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{totalMissed}</div>
                <p className="text-xs text-muted-foreground mt-1">Needs makeup sessions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{totalScheduled}</div>
                <p className="text-xs text-muted-foreground mt-1">Scheduled sessions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Compliance Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{complianceRate}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {minutesProvided} of {minutesRequired} min
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Service Logs List */}
          <div className="space-y-3">
            {items.map((item) => {
              const minutesMatch = item.minutesProvided === item.minutesRequired;
              const showIssue = item.issueReported;

              return (
                <Card key={item.id} className={showIssue ? "border-l-4 border-l-orange-500" : ""}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        {getStatusIcon(item.status)}
                        <div className="flex-1 space-y-2">
                          {/* Header */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-base">{item.serviceType}</h3>
                            {getStatusBadge(item.status)}
                            {showIssue && (
                              <Badge variant="outline" className="border-orange-600 text-orange-600">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Issue Reported
                              </Badge>
                            )}
                          </div>

                          {/* Details */}
                          <div className="grid gap-2 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              <span>{new Date(item.serviceDate).toLocaleDateString()}</span>
                              {item.serviceProvider && (
                                <span className="text-xs">• Provider: {item.serviceProvider}</span>
                              )}
                            </div>

                            {/* Minutes Tracking */}
                            {item.status === "provided" && (
                              <div className="flex items-center gap-3">
                                <div className={`text-sm font-medium ${minutesMatch ? "text-green-600" : "text-orange-600"}`}>
                                  {formatMinutes(item.minutesProvided)} provided
                                </div>
                                <span className="text-muted-foreground">of</span>
                                <div className="text-sm font-medium text-muted-foreground">
                                  {formatMinutes(item.minutesRequired)} required
                                </div>
                                {!minutesMatch && (
                                  <Badge variant="outline" className="text-xs">
                                    {(item.minutesProvided || 0) < (item.minutesRequired || 0) ? "Under" : "Over"}
                                  </Badge>
                                )}
                              </div>
                            )}

                            {item.status === "scheduled" && (
                              <div className="text-sm text-muted-foreground">
                                Scheduled for {formatMinutes(item.minutesRequired)}
                              </div>
                            )}

                            {item.status === "missed" && item.resolutionStatus && (
                              <div className="text-sm">
                                <span className="text-muted-foreground">Resolution: </span>
                                <span className="font-medium">{item.resolutionStatus}</span>
                              </div>
                            )}

                            {item.notes && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {item.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigate(config.routes.complianceEdit(item.id))}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteId(item.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Delete Service Log
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this service delivery log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
