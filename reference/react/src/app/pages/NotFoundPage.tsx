import { EmptyState } from "@/app/ui/EmptyState";
import { FileQuestion } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <EmptyState
        icon={FileQuestion}
        title="Page Not Found"
        description="The page you're looking for doesn't exist."
        action={
          <Button asChild>
            <Link to="/dashboard">Back to Dashboard</Link>
          </Button>
        }
      />
    </div>
  );
}
