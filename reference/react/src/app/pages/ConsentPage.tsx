import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { logger } from "@/lib/logger";
import { config } from "@/lib/config";

export function ConsentPage() {
  const { user, requiresSetup, completeSetup, logout, submitConsent } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [acceptedAiNotice, setAcceptedAiNotice] = useState(false);

  useEffect(() => {
    if (!requiresSetup) {
      navigate(config.routes.dashboard, { replace: true });
    }
  }, [requiresSetup, navigate]);

  if (!requiresSetup) {
    return null;
  }

  const handleAccept = async () => {
    if (!acceptedTerms || !acceptedPrivacy || !acceptedAiNotice) {
      return;
    }

    setIsSubmitting(true);
    try {
      await submitConsent({
        consentType: "terms_of_service",
        consentText:
          "You acknowledge Terms of Service including data breach notification commitments and electronic consent logging.",
        consentVersion: "v2.0",
      });
      await submitConsent({
        consentType: "privacy_policy",
        consentText:
          "You acknowledge Privacy Policy terms including encryption, role-based access controls, and child-level access isolation.",
        consentVersion: "v2.0",
      });
      await submitConsent({
        consentType: "ai_analysis",
        consentText:
          "You acknowledge AI outputs are informational only and not legal advice.",
        consentVersion: "v2.0",
      });
      completeSetup();
      navigate(config.routes.dashboard, { replace: true });
      logger.info("Consent accepted", { userId: user?.id });
    } catch (error) {
      logger.error("Consent submission failed", { error });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecline = () => {
    logout();
    logger.info("Consent declined", { userId: user?.id });
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl rounded-3xl shadow-2xl bg-white text-slate-900">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-slate-800">Parent Consent Required</CardTitle>
          <p className="text-sm text-slate-500">
            Please review and accept the consent agreement to continue using AskIEP.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 max-h-[320px] overflow-auto text-sm leading-relaxed text-slate-700">
            <p className="mb-3 font-semibold text-slate-800">Consent Acknowledgment</p>
            <p className="mb-2">
              By accepting, you confirm you are the parent/guardian of the student whose information you provide,
              and you authorize AskIEP to process, store, and secure educational records and related documents for
              the purpose of assisting with IEP advocacy.
            </p>
            <p className="mb-2">
              Data is encrypted in transit and at rest. You may request access, correction, or deletion of data as
              permitted by applicable law. Your consent is recorded for audit purposes.
            </p>
            <p className="mb-2">
              If AskIEP confirms a breach affecting your data, impacted users are notified without undue delay and no
              later than 72 hours after confirmation unless law requires a shorter timeline.
            </p>
            <p>
              If you decline, you will be signed out and cannot proceed until consent is granted.
            </p>
          </div>
          <div className="space-y-3 rounded-xl border border-slate-200 p-3">
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <Checkbox checked={acceptedTerms} onCheckedChange={(checked) => setAcceptedTerms(Boolean(checked))} />
              <span>I accept the Terms of Service.</span>
            </label>
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <Checkbox checked={acceptedPrivacy} onCheckedChange={(checked) => setAcceptedPrivacy(Boolean(checked))} />
              <span>I accept the Privacy Policy.</span>
            </label>
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <Checkbox checked={acceptedAiNotice} onCheckedChange={(checked) => setAcceptedAiNotice(Boolean(checked))} />
              <span>I understand AI outputs are informational only, not legal advice.</span>
            </label>
          </div>
          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" onClick={handleDecline}>
              Decline
            </Button>
            <Button
              onClick={handleAccept}
              disabled={isSubmitting || !acceptedTerms || !acceptedPrivacy || !acceptedAiNotice}
              className="bg-[#5B5AF7] hover:bg-[#4A49E8]"
            >
              {isSubmitting ? "Recording..." : "Accept & Continue"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
