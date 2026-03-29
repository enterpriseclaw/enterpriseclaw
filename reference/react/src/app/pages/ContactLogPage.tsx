import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import { getContactService } from "@/domain/contact/contact.service";
import type { ContactEntry } from "@/domain/contact/types";
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
import { MessageSquare, Plus, Mail, Phone, Calendar, Edit, Trash2, AlertTriangle } from "lucide-react";
import { logger } from "@/lib/logger";
import { config } from "@/lib/config";
import { useNotification } from "@/hooks/useNotification";

export function ContactLogPage() {
  const navigate = useNavigate();
  const { user, accessToken } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [contacts, setContacts] = useState<ContactEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !accessToken) return;

    const loadContacts = async () => {
      try {
        const service = getContactService();
        const data = await service.getAll(accessToken);
        setContacts(data);
        logger.debug("Contacts loaded", { count: data.length });
      } catch (error) {
        logger.error("Error loading contacts", { error });
        showError("Failed to Load", "Could not load contact log");
      } finally {
        setIsLoading(false);
      }
    };

    loadContacts();
  }, [user, accessToken, showError]);

  const handleDelete = async () => {
    if (!deleteId || !accessToken) return;
    
    try {
      const service = getContactService();
      await service.delete(accessToken, deleteId);
      setContacts(prev => prev.filter(c => c.id !== deleteId));
      showSuccess("Contact deleted successfully");
      logger.info("Contact deleted", { id: deleteId });
    } catch (error) {
      logger.error("Error deleting contact", { error });
      showError("Failed to delete contact");
    } finally {
      setDeleteId(null);
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading contact log..." />;
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "Email":
        return <Mail className="h-4 w-4" />;
      case "Phone Call":
        return <Phone className="h-4 w-4" />;
      case "Meeting":
        return <Calendar className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="Contact Log"
        description="Track all communications with the school"
        action={
          <Button onClick={() => navigate(config.routes.contactLogNew)}>
            <Plus className="mr-2 h-4 w-4" />
            Log Contact
          </Button>
        }
      />

      {contacts.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No contacts logged"
          description="Start documenting your communications with the school"
          action={
            <Button onClick={() => navigate(config.routes.contactLogNew)}>
              <Plus className="mr-2 h-4 w-4" />
              Log Contact
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground mb-2">
            Showing {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
          </div>
          {contacts.map((contact) => (
            <Card key={contact.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-1">{getTypeIcon(contact.type)}</div>
                    <div className="flex-1">
                      <CardTitle className="text-base">{contact.subject}</CardTitle>
                      <CardDescription className="mt-1">
                        {contact.contactPerson} • {new Date(contact.date).toLocaleDateString()}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                      {contact.type}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigate(config.routes.contactLogEdit(contact.id))}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(contact.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-4">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{contact.notes}</p>
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
              Delete Contact Log
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this contact entry.
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
