import { useState, type FormEvent } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { logger } from "@/lib/logger";
import { config } from "@/lib/config";
import logo from "@/logo.png";
import {
  AtSign,
  KeyRound,
  LogIn,
  Eye,
  EyeOff,
} from "lucide-react";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login({ email, password });
      navigate(
        searchParams.get("next") || config.routes.dashboard,
        { replace: true }
      );
    } catch (error) {
      logger.error("Login failed", { error });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      const result = await loginWithGoogle();
      const nextPath = searchParams.get("next") || config.routes.dashboard;
      navigate(nextPath, { replace: true });

      logger.info("Google sign-in completed", { nextPath, requiresSetup: result.requiresSetup });
    } catch (error) {
      logger.error("Google sign-in failed", { error });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <Card className="w-full max-w-md rounded-[32px] bg-white text-slate-900 shadow-2xl">

        {/* HEADER */}
        <CardHeader className="pt-5 pb-1 text-center">
          <div className="mx-auto mb-4 flex h-[52px] w-[52px] items-center justify-center">
            <img src={logo} alt="AskIEP Logo" className="h-[52px] w-[52px] object-contain" />
          </div>

          <CardTitle className="text-[26px] font-semibold text-slate-800">
            AskIEP Login
          </CardTitle>

          <p className="mt-1 text-[15px] text-slate-500">
            Access your secure advocacy records
          </p>
        </CardHeader>

        {/* CONTENT */}
        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* EMAIL */}
            <div className="space-y-2">
              <Label className="text-xs tracking-wider text-slate-500">
                EMAIL
              </Label>
              <div className="relative">
                <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <Input
                  type="email"
                  placeholder="jane@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading || isGoogleLoading}
                  className="pl-9 h-12 rounded-2xl bg-slate-100 border-none
                             !text-slate-900 caret-slate-900
                             placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* PASSWORD */}
            <div className="space-y-2">
              <Label className="text-xs tracking-wider text-slate-500">
                PASSWORD
              </Label>

              <div className="relative">
                {/* Left icon */}
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />

                {/* Input */}
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading || isGoogleLoading}
                  className="pl-9 pr-10 h-12 rounded-2xl bg-slate-100 border-none
                             !text-slate-900 caret-slate-900"
                />

                {/* Show / Hide button */}
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  disabled={isLoading || isGoogleLoading}
                  className="absolute right-3 top-1/2 -translate-y-1/2
                             text-slate-400 hover:text-slate-600
                             focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
            </div>

            {/* DEV MODE */}
            {config.isDevelopment && (
              <div className="rounded-2xl bg-slate-900 p-3 text-xs text-slate-300">
                <p className="mb-1 font-medium text-slate-200">
                  Dev Mode – Test Accounts
                </p>
                <ul className="space-y-1">
                  <li>parent@askiep.com</li>
                  <li>advocate@askiep.com</li>
                  <li>teacher@askiep.com</li>
                  <li>admin@askiep.com</li>
                <li className="italic">Password: Demo123</li>
              </ul>
            </div>
            )}

            <Button
              type="button"
              variant="outline"
              disabled={isLoading || isGoogleLoading}
              onClick={handleGoogleLogin}
              className="w-full h-12 rounded-2xl border-slate-200 bg-white text-slate-800"
            >
              <LogIn className="size-4" />
              {isGoogleLoading ? "Connecting to Google..." : "Continue with Google"}
            </Button>

            {/* SUBMIT BUTTON */}
            <Button
              type="submit"
              disabled={isLoading || isGoogleLoading}
              className="w-full h-14 rounded-2xl bg-[#5B5AF7]
                         hover:bg-[#4A49E8] text-white text-base
                         shadow-[0_10px_28px_rgba(91,90,247,0.45)]
                         flex items-center justify-center gap-2"
            >
              <LogIn className="size-4" />
              {isLoading ? "Authenticating..." : "Authenticate"}
            </Button>

            {/* REGISTER */}
            {/* <div className="text-center text-sm text-slate-500">
              Don&apos;t have an account?{" "}
              <Link to="/register" className="text-[#5B5AF7] hover:underline">
                Register
              </Link>
            </div> */}

          </form>
        </CardContent>
      </Card>
    </div>
  );
}
