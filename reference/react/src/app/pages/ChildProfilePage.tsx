import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import { getChildService } from "@/domain/child/child.service";
import { config } from "@/lib/config";
import type { Child } from "@/domain/child/types";
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
import { User, Plus, Edit, GraduationCap, Shield, Heart, Trash2, AlertTriangle } from "lucide-react";
import { useNotification } from "@/hooks/useNotification";
import { logger } from "@/lib/logger";

export function ChildProfilePage() {
  const { user, accessToken } = useAuth();
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const [children, setChildren] = useState<Child[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; child: Child | null }>({ open: false, child: null });

  const handleDeleteClick = (child: Child) => {
    setDeleteDialog({ open: true, child });
  };

  const handleDeleteConfirm = async () => {
    const child = deleteDialog.child;
    if (!child || !accessToken) return;

    setDeletingId(child.id);
    setDeleteDialog({ open: false, child: null });
    
    try {
      const service = getChildService();
      await service.delete(accessToken, child.id);
      setChildren(prev => prev.filter(c => c.id !== child.id));
      showSuccess(`${child.name} deleted successfully.`);
      logger.info("Child deleted", { childId: child.id });
    } catch (error) {
      logger.error("Error deleting child", { childId: child.id, error });
      showError("Failed to delete child profile");
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    if (!user || !accessToken) return;

    const loadChildren = async () => {
      try {
        const service = getChildService();
        const data = await service.getAll(accessToken);
        setChildren(data);
        logger.debug("Children loaded", { count: data.length });
      } catch (error) {
        logger.error("Error loading children", { error });
      } finally {
        setIsLoading(false);
      }
    };

    loadChildren();
  }, [user]);

  if (isLoading) {
    return <LoadingState message="Loading child profiles..." />;
  }

  if (children.length === 0) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <EmptyState
          icon={User}
          title="No children added"
          description="Add your first child to start managing their IEP"
          action={
            <Button onClick={() => navigate(config.routes.childProfileNew)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Child
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="Child Profiles"
        description="Manage your children's IEP information and records"
        action={
          <Button onClick={() => navigate(config.routes.childProfileNew)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Child
          </Button>
        }
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {children.map((child) => (
          <Card key={child.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{child.name}</CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <GraduationCap className="h-3 w-3" />
                      Age {child.age} • Grade {child.grade}
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {child.disabilities && child.disabilities.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground uppercase font-semibold">
                    <Shield className="h-3 w-3" />
                    Disabilities
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {child.disabilities.slice(0, 3).map((disability, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium"
                      >
                        {disability}
                      </span>
                    ))}
                    {child.disabilities.length > 3 && (
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-muted text-muted-foreground text-xs font-medium">
                        +{child.disabilities.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {child.accommodations && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground uppercase font-semibold">
                    <Heart className="h-3 w-3" />
                    Accommodations
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {child.accommodations}
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate(config.routes.childProfileEdit(child.id))}
                  disabled={deletingId === child.id}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => handleDeleteClick(child)}
                  disabled={deletingId === child.id}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, child: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Child Profile
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left space-y-2">
              <p>
                Are you sure you want to delete <strong>{deleteDialog.child?.name}</strong>?
              </p>
              <p className="text-destructive">
                This will permanently delete all associated data including:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>All IEP goals</li>
                <li>Progress tracking entries</li>
                <li>Behavior observation records</li>
                <li>Contact logs</li>
              </ul>
              <p className="font-semibold">This action cannot be undone.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
