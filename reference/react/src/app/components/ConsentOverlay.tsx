import { useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { logger } from "@/lib/logger";

export function ConsentOverlay() {
  const { user, submitConsent, completeSetup, logout } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [acceptedAiNotice, setAcceptedAiNotice] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const termsVersion = "2.0";
  const privacyVersion = "2.0";
  const aiNoticeVersion = "2.0";
  const effectiveDate = useMemo(() => new Date().toLocaleDateString(), []);

  const termsText = useMemo(
    () =>
      [
        "Terms of Service Acknowledgment",
        "",
        "Effective Date: " + effectiveDate,
        "Version: " + termsVersion,
        "",
        "1. Purpose",
        "This Parent Consent & Data Release Agreement (“Agreement”) explains how your child’s Individualized Education Program (IEP) data and related educational records will be collected, stored, protected, and used within this application. You must review and accept this Agreement during your first login before uploading any data or reports.",
        "",
        "2. Parent / Guardian Acknowledgment",
        "• You are the parent or legal guardian of the child whose information will be uploaded.",
        "• You have the legal authority to provide consent for the collection and use of your child’s educational records.",
        "• You voluntarily choose to upload IEP-related documents, evaluations, assessments, and reports into this application.",
        "",
        "3. Scope of Data Collected",
        "• Individualized Education Program (IEP) documents",
        "• Psychoeducational evaluations",
        "• Progress reports and assessments",
        "• Therapy, accommodation, or support plans",
        "This data is used only to support IEP insights, organization, and related features within the application.",
        "",
        "4. Data Breach Notice Commitment",
        "If AskIEP confirms a breach that affects your personal or educational data, AskIEP will notify impacted users without undue delay and no later than 72 hours after confirmation, unless a shorter timeline is required by law. Notifications will include what happened, data involved, mitigation steps, and support contacts.",
        "",
        "5. Audit & Recordkeeping",
        "For compliance and security purposes, the system records your user identifier, date/time of consent, IP address, application version, and consent version.",
        "",
        "6. Contact Information",
        "Support Email: io@askiep.com",
        "Organization Name: AskIEP",
      ].join("\n"),
    [termsVersion, effectiveDate]
  );

  const privacyText = useMemo(
    () =>
      [
        "Privacy Policy Acknowledgment",
        "",
        "Effective Date: " + effectiveDate,
        "Version: " + privacyVersion,
        "",
        "Data Protection Measures",
        "• Encryption in transit (TLS) and at rest",
        "• Role-based access controls and authentication safeguards",
        "• Child-level data isolation between accounts",
        "• Monitoring, audit logging, and security alerting",
        "• Controlled operational access on least-privilege basis",
        "",
        "Your Rights",
        "• Access and review your uploaded data",
        "• Request corrections",
        "• Request deletion where legally permitted",
        "• Withdraw consent (feature access may be limited)",
      ].join("\n"),
    [privacyVersion, effectiveDate]
  );

  const aiNoticeText = useMemo(
    () =>
      [
        "AI Output Notice",
        "",
        "Version: " + aiNoticeVersion,
        "AI-generated summaries, recommendations, and legal prompts are informational only.",
        "They are not legal advice, do not create an attorney-client relationship, and should not be the sole basis for legal or educational decisions.",
        "You should verify important conclusions with qualified professionals.",
      ].join("\n"),
    [aiNoticeVersion]
  );

  const handleAccept = async () => {
    if (!acceptedTerms || !acceptedPrivacy || !acceptedAiNotice) {
      return;
    }

    setIsSubmitting(true);
    try {
      await submitConsent({
        consentType: "terms_of_service",
        consentText: termsText,
        consentVersion: termsVersion,
      });
      await submitConsent({
        consentType: "privacy_policy",
        consentText: privacyText,
        consentVersion: privacyVersion,
      });
      await submitConsent({
        consentType: "ai_analysis",
        consentText: aiNoticeText,
        consentVersion: aiNoticeVersion,
      });
      completeSetup();
      if (location.pathname === "/consent" || location.pathname === "/") {
        navigate("/dashboard", { replace: true });
      }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-3xl rounded-3xl shadow-2xl bg-white text-slate-900">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-slate-800">Parent Consent Required</CardTitle>
          <p className="text-sm text-slate-500">
            Please review and accept the consent agreement to continue using AskIEP.
          </p>
          <p className="text-xs text-slate-400">
            Effective Date: {effectiveDate} · Version: {termsVersion} · User: {user?.email ?? "unknown"}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 max-h-[320px] overflow-auto text-sm leading-relaxed text-slate-700">
            {termsText.split("\n").map((line, idx) => (
              <p key={idx} className="mb-2 last:mb-0">
                {line}
              </p>
            ))}
            <hr className="my-4 border-slate-200" />
            {privacyText.split("\n").map((line, idx) => (
              <p key={`privacy-${idx}`} className="mb-2 last:mb-0">
                {line}
              </p>
            ))}
            <hr className="my-4 border-slate-200" />
            {aiNoticeText.split("\n").map((line, idx) => (
              <p key={`ai-${idx}`} className="mb-2 last:mb-0">
                {line}
              </p>
            ))}
          </div>
          <div className="space-y-3 rounded-xl border border-slate-200 p-3">
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <Checkbox checked={acceptedTerms} onCheckedChange={(checked) => setAcceptedTerms(Boolean(checked))} />
              <span>I acknowledge and accept the Terms of Service.</span>
            </label>
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <Checkbox checked={acceptedPrivacy} onCheckedChange={(checked) => setAcceptedPrivacy(Boolean(checked))} />
              <span>I acknowledge and accept the Privacy Policy and data protection terms.</span>
            </label>
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <Checkbox checked={acceptedAiNotice} onCheckedChange={(checked) => setAcceptedAiNotice(Boolean(checked))} />
              <span>I understand AI outputs are informational only and not legal advice.</span>
            </label>
          </div>
          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" onClick={handleDecline} disabled={isSubmitting}>
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
