import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import { getDashboardService } from "@/domain/dashboard/dashboard.service";
import { getIEPService } from "@/domain/iep/iep.service";
import type { DashboardSummary } from "@/domain/dashboard/types";
import type { DocumentListItem } from "@/domain/iep/types";
import { PageHeader } from "@/app/ui/PageHeader";
import { LoadingState } from "@/app/ui/LoadingState";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity,
  AlertTriangle,
  BarChart4,
  ChevronRight,
  ExternalLink,
  FileSearch,
  FileText,
  MessageSquare,
  PenTool,
  Quote,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { logger } from "@/lib/logger";
import { config } from "@/lib/config";

export function DashboardPage() {
  const { user, accessToken } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recentDocs, setRecentDocs] = useState<DocumentListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || !accessToken) return;

    const loadData = async () => {
      try {
        const dashboardService = getDashboardService();
        const iepService = getIEPService();
        
        const [summaryData, docsData] = await Promise.all([
          dashboardService.getSummary(accessToken),
          iepService.getAll().catch(() => [])
        ]);
        
        setSummary(summaryData);
        // Get last 5 documents, sorted by upload date
        const sortedDocs = (docsData as DocumentListItem[])
          .filter(doc => doc.uploadDate)
          .sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime())
          .slice(0, 5);
        setRecentDocs(sortedDocs);
        
        logger.debug("Dashboard data loaded");
      } catch (error) {
        logger.error("Error loading dashboard data", { error });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user, accessToken]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      uploaded: 'secondary',
      processing: 'default',
      analyzed: 'default',
      failed: 'destructive'
    };
    return <Badge variant={variants[status] || 'secondary'} className="text-xs">{status}</Badge>;
  };

  if (isLoading) {
    return <LoadingState message="Loading dashboard..." />;
  }

  const complianceRate = summary?.complianceHealth || 0;
  const goalMastery = summary?.goalMasteryAvg || 0;
  const contactCount = summary?.statistics?.recentContactsCount || summary?.recentContactsCount || 0;

  return (
    <div className="space-y-10 p-4 md:p-6 pb-12">
      <PageHeader
        title={`Welcome back, ${user?.displayName || "there"}!`}
        description="Manage your child's IEP and stay informed about their progress"
      />

      <section className="relative overflow-hidden rounded-[32px] md:rounded-[40px] bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white p-8 md:p-12 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-indigo-500/30 blur-[110px] rounded-full" />
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-blue-500/20 blur-[90px] rounded-full" />

        <div className="relative z-10 max-w-2xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-bold uppercase tracking-widest text-indigo-200">
            <Sparkles className="w-3.5 h-3.5" /> Advocacy Hub Active
          </div>
          <div className="space-y-4">
            <h2 className="text-4xl md:text-5xl font-black leading-tight">
              Empowering <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-blue-200">{user?.displayName || "your"}</span> advocacy.
            </h2>
            <p className="text-indigo-100/80 text-lg leading-relaxed">
              You are your child's best advocate. AskIEP gives you the tools, data, and confidence to ensure they thrive.
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            <Button
              asChild
              size="lg"
              className="bg-white text-slate-900 px-8 py-4 rounded-2xl font-black hover:bg-indigo-50 transition-all flex items-center gap-2 shadow-lg hover:scale-[1.02] active:scale-95"
            >
              <Link to="/iep/analyse">
                <FileSearch className="w-5 h-5 text-indigo-600" />
                Analyze New IEP
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/20 text-white px-8 py-4 rounded-2xl font-black hover:bg-white/5 transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-95"
            >
              <Link to="/advocacy-lab">
                <MessageSquare className="w-5 h-5" />
                Advocacy Lab
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <Card className="bg-card text-card-foreground p-8 rounded-[28px] border border-border shadow-sm space-y-6">
          <h4 className="font-black text-sm uppercase tracking-widest flex items-center gap-2 text-muted-foreground">
            <ShieldCheck className="w-4 h-4 text-emerald-500" /> Compliance Health
          </h4>
          <div className="flex flex-col items-center">
            <div className="relative w-40 h-40">
              <svg className="w-full h-full" viewBox="0 0 100 100">
                <circle className="text-muted" strokeWidth="10" stroke="currentColor" fill="transparent" r="40" cx="50" cy="50" />
                <circle
                  className="text-indigo-600 transition-all duration-1000 ease-out"
                  strokeWidth="10"
                  strokeDasharray={`${complianceRate * 2.51}, 251.2`}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="transparent"
                  r="40"
                  cx="50"
                  cy="50"
                  transform="rotate(-90 50 50)"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black leading-none">{complianceRate}%</span>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">Delivery</span>
              </div>
            </div>
            <p className="mt-4 text-sm font-medium text-muted-foreground text-center">
              {complianceRate > 80 ? "Service delivery is within optimal IDEA bounds." : "Service delivery gap detected. Documentation required."}
            </p>
          </div>
        </Card>

        <Card className="bg-card text-card-foreground p-8 rounded-[28px] border border-border shadow-sm space-y-6">
          <h4 className="font-black text-sm uppercase tracking-widest flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="w-4 h-4 text-blue-500" /> Goal Mastery
          </h4>
          <div className="space-y-4 pt-2">
            {[{ label: "Mastered", count: summary?.statistics?.totalGoals ? Math.round((summary?.goalMasteryAvg || 0) / 3) : 0, color: "bg-emerald-500" },
              { label: "Progressing", count: summary?.statistics?.goalsInProgress || 0, color: "bg-indigo-500" },
              { label: "Emerging", count: Math.max((summary?.statistics?.totalGoals || 0) - (summary?.statistics?.goalsInProgress || 0), 0), color: "bg-amber-500" }].map((item, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-black uppercase tracking-wider">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="text-card-foreground">{item.count} Goals</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.color} transition-all duration-700`}
                    style={{ width: `${summary?.statistics?.totalGoals ? Math.min((item.count / (summary?.statistics?.totalGoals || 1)) * 100, 100) : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <Button onClick={() => navigate(config.routes.goalProgress)} className="w-full py-3 bg-muted text-foreground rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-muted/80 transition-colors">
            View Progress Roadmap
          </Button>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-[28px] p-8 text-white relative overflow-hidden shadow-xl shadow-indigo-100 dark:shadow-indigo-900/40">
          <Quote className="absolute -top-4 -left-4 w-24 h-24 text-white/10" />
          <h4 className="relative z-10 text-xs font-black uppercase tracking-widest text-indigo-200 mb-4">Advocacy Wisdom</h4>
          <p className="relative z-10 text-lg font-medium leading-relaxed italic mb-8">
            "{summary?.advocacyQuote || "Never doubt that a small group of thoughtful, committed citizens can change the world. - Margaret Mead"}"
          </p>
          <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between">
            <span className="text-[10px] font-bold opacity-60">Daily Insight</span>
            <Sparkles className="w-4 h-4 text-indigo-300" />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-black text-foreground tracking-tight">Advocacy Toolbox</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button
              id="dashboard-card-goals"
              onClick={() => navigate(config.routes.goalProgress)}
              className="group relative bg-card text-card-foreground p-8 rounded-[28px] border border-border shadow-sm hover:shadow-xl hover:border-indigo-100 dark:hover:border-indigo-400/40 transition-all text-left overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 transition-opacity group-hover:opacity-20">
                <TrendingUp className="w-24 h-24 text-indigo-900 dark:text-white" />
              </div>
              <div className="w-12 h-12 bg-indigo-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-6 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-black mb-2">Goal Tracker</h4>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                Record real-world data points to prove whether progress is being made.
              </p>
              <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
                Log New Data <ChevronRight className="w-4 h-4" />
              </div>
            </button>

            <button
              id="dashboard-card-behavior"
              onClick={() => navigate(config.routes.contactLog)}
              className="group relative bg-card text-card-foreground p-8 rounded-[28px] border border-border shadow-sm hover:shadow-xl hover:border-purple-100 dark:hover:border-indigo-400/40 transition-all text-left overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 transition-opacity group-hover:opacity-20">
                <Activity className="w-24 h-24 text-purple-900 dark:text-white" />
              </div>
              <div className="w-12 h-12 bg-purple-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-6 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <Activity className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-black mb-2">Contact Log</h4>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                Keep a defensible paper trail of every call, email, and meeting.
              </p>
              <div className="flex items-center gap-2 text-purple-600 font-bold text-sm">
                Secure Log Entry <ChevronRight className="w-4 h-4" />
              </div>
            </button>

            <button
              id="dashboard-card-letters"
              onClick={() => navigate(config.routes.letterWriter)}
              className="group relative bg-card text-card-foreground p-8 rounded-[28px] border border-border shadow-sm hover:shadow-xl hover:border-amber-100 dark:hover:border-indigo-400/40 transition-all text-left overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 transition-opacity group-hover:opacity-20">
                <PenTool className="w-24 h-24 text-amber-900 dark:text-white" />
              </div>
              <div className="w-12 h-12 bg-amber-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-6 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                <PenTool className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-black mb-2">Letter Writer</h4>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                Generate formal, legally-sound letters for requests and disputes instantly.
              </p>
              <div className="flex items-center gap-2 text-amber-600 font-bold text-sm">
                Draft New Letter <ChevronRight className="w-4 h-4" />
              </div>
            </button>

            <button
              id="dashboard-card-comms"
              onClick={() => navigate(config.routes.iepAnalyzer)}
              className="group relative bg-card text-card-foreground p-8 rounded-[28px] border border-border shadow-sm hover:shadow-xl hover:border-blue-100 dark:hover:border-indigo-400/40 transition-all text-left overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 transition-opacity group-hover:opacity-20">
                <BarChart4 className="w-24 h-24 text-blue-900 dark:text-white" />
              </div>
              <div className="w-12 h-12 bg-blue-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-6 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <BarChart4 className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-black mb-2">IEP Analyzer</h4>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                Upload and analyze IEPs to surface compliance gaps and recommendations.
              </p>
              <div className="flex items-center gap-2 text-blue-600 font-bold text-sm">
                Start Analysis <ChevronRight className="w-4 h-4" />
              </div>
            </button>
          </div>
        </div>

        <div className="space-y-8">
          <Card className="bg-indigo-50 dark:bg-slate-900 rounded-[28px] p-8 border border-indigo-100 dark:border-border shadow-sm">
            <h4 className="font-black text-indigo-900 dark:text-white mb-4">Quick Resources</h4>
            <div className="space-y-2">
              {[{ label: "IDEA Rights Guide", url: "https://sites.ed.gov/idea/parents-families/" },
                { label: "Drafting Parent Concerns", url: "https://www.wrightslaw.com/info/parent.letter.request.htm" }].map((item, idx) => (
                <a
                  key={idx}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between text-sm font-bold text-indigo-700 dark:text-indigo-300 hover:text-indigo-900 dark:hover:text-white transition-colors py-2 border-b border-indigo-100 dark:border-border last:border-0"
                >
                  {item.label} <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-card text-card-foreground rounded-[28px] border border-border p-6 shadow-sm">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Recent IEP Documents
            </CardTitle>
            <CardDescription>Your latest uploaded documents</CardDescription>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {recentDocs.length > 0 ? (
              <div className="space-y-3">
                {recentDocs.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between text-sm border-b border-border pb-2 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{doc.originalFileName || doc.fileName || 'Untitled'}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(doc.uploadDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      {getStatusBadge(doc.status)}
                    </div>
                  </div>
                ))}
                <Button
                  className="w-full mt-3"
                  variant="outline"
                  onClick={() => navigate(config.routes.iepList)}
                >
                  View All Documents
                </Button>
              </div>
            ) : (
              <div className="text-center py-6">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground mb-4">No documents uploaded yet</p>
                <Button onClick={() => navigate(config.routes.iepAnalyzer)}>
                  <FileSearch className="mr-2 h-4 w-4" />
                  Upload First Document
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card text-card-foreground rounded-[28px] border border-border p-6 shadow-sm">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Compliance Snapshot
            </CardTitle>
            <CardDescription>System health and communications</CardDescription>
          </CardHeader>
          <CardContent className="px-0 pb-0 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Communications</span>
              <span className="font-bold">{summary?.statistics?.totalCommunications || 0}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Pending Follow Ups</span>
              <span className="font-bold">{summary?.statistics?.pendingFollowUps || 0}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Recent Contacts</span>
              <span className="font-bold">{contactCount}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
