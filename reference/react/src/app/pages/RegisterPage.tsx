import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import { useNotification } from "@/hooks/useNotification";
import { ROLES, type Role } from "@/domain/auth/roles";
import { config } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff } from "lucide-react";
import { logger } from "@/lib/logger";
import { isPasswordValid, PASSWORD_MIN_LENGTH, PASSWORD_POLICY_MESSAGE } from "@/lib/passwordPolicy";

export function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>(ROLES.ADVOCATE);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const { register } = useAuth();
  const { showSuccess, showError } = useNotification();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!agreedToTerms) {
      showError("Please accept the Terms & Privacy Policy to continue");
      return;
    }

    if (password !== confirmPassword) {
      showError("Passwords don't match", "Please make sure both passwords match");
      logger.warn("Password mismatch");
      return;
    }

    // Validate password requirements
    if (!isPasswordValid(password)) {
      showError("Weak password", PASSWORD_POLICY_MESSAGE);
      return;
    }

    setIsLoading(true);

    try {
      let endpointOverride: string | undefined;
      if (role === ROLES.PARENT) endpointOverride = config.api.endpoints.auth.registerParent;
      if (role === ROLES.ADVOCATE) endpointOverride = config.api.endpoints.auth.registerAdvocate;
      if (role === ROLES.TEACHER_THERAPIST) endpointOverride = config.api.endpoints.auth.registerTeacher;

      await register({ email, password, displayName: name, role, endpointOverride });
      logger.info("Registration successful", { email });
      navigate(config.routes.login, { replace: true });
    } catch (error) {
      logger.error("Registration failed", { email, error });
      // Error notification handled in AuthProvider
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create an Account</CardTitle>
          <CardDescription>
            Register to access IEP tools and resources. Your account will be reviewed by an administrator.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">I am a</Label>
              <Select value={role} onValueChange={(value) => setRole(value as Role)} disabled={isLoading}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ROLES.ADVOCATE}>Advocate</SelectItem>
                  <SelectItem value={ROLES.TEACHER_THERAPIST}>Teacher/Therapist</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Parents, Admins, and Support staff cannot self-register. Please contact an administrator.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  minLength={PASSWORD_MIN_LENGTH}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="font-medium">Password must:</p>
                <ul className="list-disc list-inside space-y-0.5 ml-1">
                  <li>Be at least {PASSWORD_MIN_LENGTH} characters long</li>
                  <li>Include at least one uppercase letter</li>
                  <li>Include at least one lowercase letter</li>
                  <li>Include at least one number</li>
                </ul>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading || !agreedToTerms}>
              {isLoading ? "Creating account..." : "Register"}
            </Button>

            {/* Terms & Privacy consent */}
            <div className="flex items-start gap-2">
              <Checkbox
                id="terms"
                checked={agreedToTerms}
                onCheckedChange={(v) => setAgreedToTerms(v === true)}
                disabled={isLoading}
                className="mt-0.5"
              />
              <label htmlFor="terms" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                I agree to the{" "}
                <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-2 hover:underline">
                  Terms of Service
                </a>{" "}and{" "}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-2 hover:underline">
                  Privacy Policy
                </a>.
                AI-generated outputs are informational only and not legal advice.
              </label>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
