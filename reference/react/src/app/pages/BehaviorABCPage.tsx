import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import { getBehaviorService } from "@/domain/behavior/behavior.service";
import { getChildService } from "@/domain/child/child.service";
import type { BehaviorEntry } from "@/domain/behavior/types";
import { PageHeader } from "@/app/ui/PageHeader";
import { LoadingState } from "@/app/ui/LoadingState";
import { EmptyState } from "@/app/ui/EmptyState";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Activity, Plus, Edit, Trash2, AlertTriangle } from "lucide-react";
import { logger } from "@/lib/logger";
import { config } from "@/lib/config";
import { useNotification } from "@/hooks/useNotification";

export function BehaviorABCPage() {
  const navigate = useNavigate();
  const { user, accessToken } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [behaviors, setBehaviors] = useState<BehaviorEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !accessToken) return;

    const loadBehaviors = async () => {
      try {
        const childService = getChildService();
        const children = await childService.getAll(accessToken);
        
        if (children.length > 0 && children[0]) {
          const behaviorService = getBehaviorService();
          const data = await behaviorService.getAllByChild(accessToken, children[0].id);
          setBehaviors(data);
          logger.debug("Behavior entries loaded", { count: data.length });
        }
      } catch (error) {
        logger.error("Error loading behaviors", { error });
        showError("Failed to Load", "Could not load behavior entries");
      } finally {
        setIsLoading(false);
      }
    };

    loadBehaviors();
  }, [user, accessToken, showError]);

  const handleDelete = async () => {
    if (!deleteId || !accessToken) return;
    
    try {
      const service = getBehaviorService();
      await service.delete(accessToken, deleteId);
      setBehaviors(prev => prev.filter(b => b.id !== deleteId));
      showSuccess("Behavior entry deleted successfully");
      logger.info("Behavior deleted", { id: deleteId });
    } catch (error) {
      logger.error("Error deleting behavior", { error });
      showError("Failed to delete behavior entry");
    } finally {
      setDeleteId(null);
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading behavior log..." />;
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="Behavior ABC Log"
        description="Track antecedents, behaviors, and consequences"
        action={
          <Button onClick={() => navigate(config.routes.behaviorAbcNew)}>
            <Plus className="mr-2 h-4 w-4" />
            Log Entry
          </Button>
        }
      />

      {behaviors.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No behavior entries"
          description="Start tracking behavior patterns with ABC logs"
          action={
            <Button onClick={() => navigate(config.routes.behaviorAbcNew)}>
              <Plus className="mr-2 h-4 w-4" />
              Log Entry
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {behaviors.map((behavior) => (
            <Card key={behavior.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">
                      {new Date(behavior.date).toLocaleDateString()} at {behavior.time}
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigate(config.routes.behaviorAbcEdit(behavior.id))}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(behavior.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
                    <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                      Antecedent (What happened before?)
                    </h4>
                    <p className="text-sm">{behavior.antecedent}</p>
                  </div>
                  <div className="space-y-2 p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900">
                    <h4 className="text-sm font-semibold text-orange-700 dark:text-orange-300">
                      Behavior (What did they do?)
                    </h4>
                    <p className="text-sm">{behavior.behavior}</p>
                  </div>
                  <div className="space-y-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
                    <h4 className="text-sm font-semibold text-green-700 dark:text-green-300">
                      Consequence (What happened after?)
                    </h4>
                    <p className="text-sm">{behavior.consequence}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Delete Behavior Entry
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this behavior entry.
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
