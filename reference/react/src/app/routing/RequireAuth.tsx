import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import { LoadingState } from "@/app/ui/LoadingState";
import { config } from "@/lib/config";

interface RequireAuthProps {
  children: React.ReactNode;
}

export function RequireAuth({ children }: RequireAuthProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingState message="Checking authentication..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to={`${config.routes.login}?next=${encodeURIComponent(location.pathname)}`} replace />;
  }

  return <>{children}</>;
}
