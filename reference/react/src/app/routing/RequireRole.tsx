import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import { hasAccess, getAccessibleRoutes } from "@/domain/auth/roles";
import type { Role } from "@/domain/auth/roles";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldX, ArrowLeft, Home, Lock } from "lucide-react";
import { config } from "@/lib/config";

interface RequireRoleProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

export function RequireRole({ children, allowedRoles }: RequireRoleProps) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Check access: either by allowedRoles prop or by path-based access
  const hasAccessToRoute = allowedRoles 
    ? user && allowedRoles.includes(user.role)
    : user && hasAccess(user.role, location.pathname);

  if (!hasAccessToRoute) {
    const accessibleRoutes = user ? getAccessibleRoutes(user.role) : [];
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full shadow-2xl border-none bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
          <CardHeader className="text-center space-y-6 pt-12 pb-8">
            {/* Icon with gradient background */}
            <div className="mx-auto relative">
              <div className="absolute inset-0 bg-gradient-to-br from-red-500 to-orange-600 rounded-full blur-2xl opacity-20 animate-pulse"></div>
              <div className="relative rounded-full bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-950 dark:to-orange-950 p-6 w-fit mx-auto border-4 border-red-200 dark:border-red-900">
                <ShieldX className="h-16 w-16 text-red-600 dark:text-red-400" strokeWidth={1.5} />
              </div>
            </div>

            {/* Title and description */}
            <div className="space-y-3">
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                Access Denied
              </CardTitle>
              <CardDescription className="text-base text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                You don't have the necessary permissions to access this page. This area is restricted to specific user roles.
              </CardDescription>
            </div>

            {/* Additional context */}
            <div className="flex items-start gap-3 max-w-md mx-auto bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-4">
              <Lock className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-left">
                <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                  Current Role: <span className="font-semibold">{user?.role || 'Unknown'}</span>
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  Contact your administrator if you believe you should have access to this page.
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 pb-12">
            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <Button
                size="lg"
                onClick={() => navigate(-1)}
                variant="outline"
                className="w-full sm:w-auto gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Go Back
              </Button>
              <Button
                size="lg"
                onClick={() => navigate(config.routes.dashboard)}
                className="w-full sm:w-auto gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                <Home className="h-4 w-4" />
                Return to Dashboard
              </Button>
            </div>

            {/* Available sections hint */}
            {accessibleRoutes.length > 0 && (
              <div className="text-center pt-4">
                <p className="text-xs text-muted-foreground">
                  You have access to {accessibleRoutes.length} section{accessibleRoutes.length !== 1 ? 's' : ''} in the application
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
