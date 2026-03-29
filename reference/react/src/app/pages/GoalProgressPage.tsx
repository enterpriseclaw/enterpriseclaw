import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import { getGoalsService } from "@/domain/goals/goals.service";
import { getChildService } from "@/domain/child/child.service";
import type { Goal } from "@/domain/goals/types";
import type { Child } from "@/domain/child/types";
import { PageHeader } from "@/app/ui/PageHeader";
import { LoadingState } from "@/app/ui/LoadingState";
import { EmptyState } from "@/app/ui/EmptyState";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/http";
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
import { Target, Plus, Edit, Trash2, AlertTriangle, TrendingUp } from "lucide-react";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";
import { config } from "@/lib/config";
import { useNotification } from "@/hooks/useNotification";

export function GoalProgressPage() {
  const navigate = useNavigate();
  const { user, accessToken } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [progressGoal, setProgressGoal] = useState<Goal | null>(null);
  const [newProgress, setNewProgress] = useState<number>(0);

  useEffect(() => {
    if (!user || !accessToken) return;

    const loadChildren = async () => {
      setIsLoading(true);
      try {
        const childService = getChildService();
        const fetchedChildren = await childService.getAll(accessToken);
        setChildren(fetchedChildren);

        if (fetchedChildren.length > 0) {
          setSelectedChildId((prev) => prev ?? fetchedChildren[0].id);
        }
      } catch (error) {
        logger.error("Error loading children", { error });
        setChildren([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadChildren();
  }, [user, accessToken]);

  useEffect(() => {
    const loadGoals = async () => {
      if (!accessToken || !selectedChildId) return;
      setIsLoading(true);
      try {
        const goalService = getGoalsService();
        const allGoals = await goalService.getAllByChild(accessToken, selectedChildId);
        setGoals(allGoals);
        logger.debug("Goals loaded", { count: allGoals.length, childId: selectedChildId });
      } catch (error) {
        logger.error("Error loading goals", { error, childId: selectedChildId });
        setGoals([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadGoals();
  }, [accessToken, selectedChildId]);

  const handleDelete = async () => {
    if (!deleteId || !accessToken) return;
    
    try {
      const service = getGoalsService();
      await service.delete(accessToken, deleteId);
      setGoals(prev => prev.filter(g => g.id !== deleteId));
      showSuccess("Goal deleted successfully");
      logger.info("Goal deleted", { id: deleteId });
    } catch (error) {
      logger.error("Error deleting goal", { error });
      showError("Failed to delete goal");
    } finally {
      setDeleteId(null);
    }
  };

  const handleUpdateProgress = async () => {
    if (!progressGoal || !accessToken) return;
    
    try {
      const service = getGoalsService();
      const url = `${config.api.endpoints.goals.update.replace(":id", progressGoal.id)}/progress`;
      
      await apiRequest(url, {
        method: "PATCH",
        token: accessToken,
        body: {
          progressPercentage: newProgress,
          status: newProgress >= 100 ? 'achieved' : newProgress > 0 ? 'in_progress' : 'not_started',
        },
      });
      
      // Update local state
      setGoals(prev => prev.map(g => 
        g.id === progressGoal.id 
          ? { ...g, current: newProgress } 
          : g
      ));
      
      showSuccess("Progress updated successfully");
      logger.info("Progress updated", { id: progressGoal.id, progress: newProgress });
    } catch (error) {
      logger.error("Error updating progress", { error });
      showError("Failed to update progress");
    } finally {
      setProgressGoal(null);
      setNewProgress(0);
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading goal progress..." />;
  }

  const getStatusBadge = (progress: number) => {
    if (progress >= 70) {
      return <span className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-950 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:text-green-200">On Track</span>;
    } else if (progress >= 40) {
      return <span className="inline-flex items-center rounded-full bg-yellow-100 dark:bg-yellow-950 px-2.5 py-0.5 text-xs font-medium text-yellow-800 dark:text-yellow-200">Needs Attention</span>;
    } else {
      return <span className="inline-flex items-center rounded-full bg-red-100 dark:bg-red-950 px-2.5 py-0.5 text-xs font-medium text-red-800 dark:text-red-200">At Risk</span>;
    }
  };

  const selectedChild = children.find((child) => child.id === selectedChildId) || null;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="Goal Progress"
        description="Track and monitor your child's IEP goals"
        action={
          <div className="flex flex-wrap items-center gap-3">
            {children.length > 1 && (
              <Select value={selectedChildId ?? undefined} onValueChange={(value) => setSelectedChildId(value)}>
                <SelectTrigger className="min-w-[180px] bg-card text-card-foreground border-border" size="sm">
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
            )}
            <Button onClick={() => navigate(config.routes.goalProgressNew)} disabled={!selectedChildId}>
              <Plus className="mr-2 h-4 w-4" />
              Add Goal
            </Button>
          </div>
        }
      />

      {children.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Add a child to start"
          description="Create a child profile to begin tracking goals."
          action={
            <Button onClick={() => navigate(config.routes.childProfileNew)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Child
            </Button>
          }
        />
      ) : goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No goals found"
          description={`Add goals to start tracking progress${selectedChild ? ` for ${selectedChild.name}` : ""}.`}
          action={
            <Button onClick={() => navigate(config.routes.goalProgressNew)} disabled={!selectedChildId}>
              <Plus className="mr-2 h-4 w-4" />
              Add Goal
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {goals.map((goal) => (
            <Card key={goal.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <CardTitle className="text-base">{goal.area || 'Goal'}</CardTitle>
                    <CardDescription>{goal.description}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(goal.current || 0)}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setProgressGoal(goal);
                        setNewProgress(goal.current || 0);
                      }}
                      title="Update Progress"
                    >
                      <TrendingUp className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigate(config.routes.goalProgressEdit(goal.id))}
                      title="Edit Goal"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(goal.id);
                      }}
                      title="Delete Goal"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progress: {goal.current || 0}%</span>
                    <span className="text-muted-foreground">Target: {goal.target || 100}%</span>
                  </div>
                  <Progress value={goal.current || 0} className="h-3" />
                </div>
                <div className="grid grid-cols-3 gap-4 pt-2 border-t">
                  <div>
                    <p className="text-xs text-muted-foreground">Baseline</p>
                    <p className="text-sm font-medium">{goal.baseline || 0}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Current</p>
                    <p className="text-sm font-medium">{goal.current || 0}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Target</p>
                    <p className="text-sm font-medium">{goal.target || 100}%</p>
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
              Delete Goal
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this goal.
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

      <AlertDialog open={!!progressGoal} onOpenChange={() => setProgressGoal(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Update Progress
            </AlertDialogTitle>
            <AlertDialogDescription>
              Update the progress percentage for this goal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="progress">Progress Percentage (%)</Label>
              <Input
                id="progress"
                type="number"
                min="0"
                max="100"
                value={newProgress}
                onChange={(e) => setNewProgress(Number(e.target.value))}
                placeholder="Enter progress (0-100)"
              />
            </div>
            <div className="space-y-2">
              <Label>Preview</Label>
              <Progress value={newProgress} className="h-3" />
              <p className="text-sm text-muted-foreground">{newProgress}% complete</p>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUpdateProgress}>
              Update Progress
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
