import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import { getLetterService } from "@/domain/letters/letter.service";
import type { Letter } from "@/domain/letters/types";
import { PageHeader } from "@/app/ui/PageHeader";
import { LoadingState } from "@/app/ui/LoadingState";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useNotification } from "@/hooks/useNotification";
import { Mail, Wand2, Copy, Check, Plus, Send, Trash2 } from "lucide-react";
import { logger } from "@/lib/logger";
import { config } from "@/lib/config";

export function LetterWriterPage() {
  const navigate = useNavigate();
  const { user, accessToken } = useAuth();
  const [letters, setLetters] = useState<Letter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [letterToDelete, setLetterToDelete] = useState<string | null>(null);
  const { showSuccess, showError } = useNotification();

  useEffect(() => {
    if (!user || !accessToken) return;

    loadLetters();
  }, [user, accessToken]);

  const loadLetters = async () => {
    try {
      const service = getLetterService();
      const data = await service.getAll(accessToken);
      setLetters(data);
      logger.debug("Letters loaded", { count: data.length });
    } catch (error) {
      logger.error("Error loading letters", { error });
      showError("Failed to load letters");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    showSuccess("Letter copied to clipboard");
  };

  const handleMarkAsSent = async (letterId: string) => {
    try {
      const service = getLetterService();
      const letter = letters.find(l => l.id === letterId);
      if (!letter) return;
      
      await service.update(accessToken, letterId, { status: "sent" });
      showSuccess("Letter marked as sent");
      logger.info("Letter marked as sent", { id: letterId });
      
      // Reload letters to get updated data
      loadLetters();
    } catch (error) {
      logger.error("Error marking letter as sent", { error });
      showError("Failed to mark letter as sent");
    }
  };

  const handleDelete = (letterId: string) => {
    setLetterToDelete(letterId);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!letterToDelete) return;
    
    try {
      const service = getLetterService();
      await service.delete(accessToken, letterToDelete);
      showSuccess("Letter deleted");
      logger.info("Letter deleted", { id: letterToDelete });
      
      // Remove from local state
      setLetters(letters.filter(l => l.id !== letterToDelete));
      setShowDeleteDialog(false);
      setLetterToDelete(null);
    } catch (error) {
      logger.error("Error deleting letter", { error });
      showError("Failed to delete letter");
      setShowDeleteDialog(false);
      setLetterToDelete(null);
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading letters..." />;
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="Letter Writer"
        description="Create and manage advocacy letters"
        action={
          <Button onClick={() => navigate(config.routes.letterWriterNew)}>
            <Plus className="mr-2 h-4 w-4" />
            New Letter
          </Button>
        }
      />

      {letters.length === 0 ? (
        <Card className="p-12 text-center">
          <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No letters yet</h3>
          <p className="text-muted-foreground mb-4">
            Start creating professional advocacy letters for your child's IEP
          </p>
          <Button onClick={() => navigate(config.routes.letterWriterNew)}>
            <Plus className="mr-2 h-4 w-4" />
            Create First Letter
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {letters.map((letter) => (
            <Card key={letter.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base">{letter.subject || letter.title || "Untitled Letter"}</CardTitle>
                    <CardDescription className="mt-1">
                      {letter.letterType} · To: {letter.recipient || "(No recipient)"}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      letter.status === "sent" 
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : letter.status === "draft"
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                    }`}>
                      {letter.status === "sent" ? "Sent" : letter.status === "draft" ? "Draft" : letter.status === "final" ? "Final" : letter.status}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                  {letter.content}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {letter.lastEdited ? new Date(letter.lastEdited).toLocaleDateString() : 
                       letter.createdAt ? new Date(letter.createdAt).toLocaleDateString() : 
                       "No date"}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(letter.id)}
                      className="h-7 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(letter.content)}
                    >
                      <Copy className="mr-1 h-3 w-3" />
                      Copy
                    </Button>
                    {letter.status === "draft" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMarkAsSent(letter.id)}
                      >
                        <Send className="mr-1 h-3 w-3" />
                        Mark as Sent
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() => navigate(config.routes.letterWriterEdit(letter.id))}
                    >
                      Edit
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Letter</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this letter? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowDeleteDialog(false);
              setLetterToDelete(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
