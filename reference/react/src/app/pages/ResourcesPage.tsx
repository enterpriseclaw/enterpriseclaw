import { PageHeader } from "@/app/ui/PageHeader";
import {
  ArrowRight,
  Bookmark,
  BookOpen,
  ExternalLink,
  Gavel,
  MessageCircle,
  School,
  Search,
  ShieldAlert,
  Users,
  Video,
} from "lucide-react";

export function ResourcesPage() {
  const resourceCategories = [
    {
      title: "Advocacy Organizations",
      icon: Users,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
      links: [
        { name: "COPAA", desc: "Council of Parent Attorneys and Advocates for special education rights.", url: "https://www.copaa.org" },
        { name: "Wrightslaw", desc: "The leading resource for special education law and advocacy.", url: "https://www.wrightslaw.com" },
        { name: "NDSS", desc: "National Down Syndrome Society advocacy and support resources.", url: "https://www.ndss.org" },
        { name: "Autism Speaks", desc: "Advocacy, support, and resource guides for ASD families.", url: "https://www.autismspeaks.org" },
      ],
    },
    {
      title: "Legal & Rights",
      icon: Gavel,
      color: "text-rose-600",
      bg: "bg-rose-50",
      links: [
        { name: "IDEA Official Site", desc: "Official gov portal for the Individuals with Disabilities Education Act.", url: "https://sites.ed.gov/idea/" },
        { name: "OCR Protections", desc: "Office for Civil Rights guidance on Section 504 and Title II.", url: "https://www2.ed.gov/about/offices/list/ocr/index.html" },
        { name: "CADRE", desc: "The Center for Appropriate Dispute Resolution in Special Education.", url: "https://www.cadreworks.org" },
        { name: "National Disability Rights Network", desc: "Protection and Advocacy (P&A) systems for each state.", url: "https://www.ndrn.org" },
      ],
    },
    {
      title: "Educational Support",
      icon: School,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      links: [
        { name: "Understood.org", desc: "Resources for learning and thinking differences.", url: "https://www.understood.org" },
        { name: "Reading Rockets", desc: "Evidence-based information about teaching kids to read.", url: "https://www.readingrockets.org" },
        { name: "PACER Center", desc: "Champions for children with disabilities and their families.", url: "https://www.pacer.org" },
        { name: "National Center on UDL", desc: "Universal Design for Learning (UDL) framework and tools.", url: "https://www.cast.org" },
      ],
    },
  ];

  return (
    <div className="space-y-10 p-4 md:p-6 pb-20">
      <PageHeader
        title="Support & Resources"
        description="Connecting you with the organizations, legal experts, and educational frameworks you need."
      />

      <div className="relative rounded-[32px] md:rounded-[40px] p-8 md:p-10 text-slate-900 dark:text-white overflow-hidden shadow-2xl bg-gradient-to-br from-slate-100 via-indigo-50 to-indigo-100 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 blur-[80px] rounded-full -mr-20 -mt-20" />
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/60 dark:bg-white/10 backdrop-blur-md border border-white/40 dark:border-white/10 text-[10px] font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-300">
            <BookOpen className="w-3 h-3" /> Advocacy Knowledge Base
          </div>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight">Support & Resources</h2>
          <p className="text-slate-700 dark:text-indigo-100/70 text-base md:text-lg leading-relaxed">
            Connecting you with the organizations, legal experts, and educational frameworks needed to secure the best outcomes for your child.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icon: ShieldAlert, title: "Your IDEA Rights", tag: "Must Read", color: "bg-amber-500", url: "https://sites.ed.gov/idea/parents-families/" },
          { icon: MessageCircle, title: "Meeting Scripts", tag: "Advocacy", color: "bg-blue-500", url: "https://www.wrightslaw.com/info/advo.index.htm" },
          { icon: Video, title: "Webinar Series", tag: "Training", color: "bg-purple-500", url: "https://www.copaa.org/page/webinars" },
        ].map((item, i) => (
          <a
            key={i}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-card text-card-foreground p-6 rounded-3xl border border-border shadow-sm hover:shadow-md transition-all group cursor-pointer block"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-muted rounded-2xl group-hover:bg-indigo-50 dark:group-hover:bg-slate-800 transition-colors">
                <item.icon className="w-6 h-6 text-muted-foreground group-hover:text-indigo-600" />
              </div>
              <span className={`px-2 py-1 ${item.color} text-white text-[10px] font-black uppercase tracking-widest rounded-lg`}>
                {item.tag}
              </span>
            </div>
            <h3 className="font-black text-slate-900 dark:text-white text-lg group-hover:text-indigo-600 transition-colors">{item.title}</h3>
            <p className="text-muted-foreground text-xs mt-1 font-bold flex items-center gap-1">
              Explore Guide <ArrowRight className="w-3 h-3" />
            </p>
          </a>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {resourceCategories.map((category, idx) => (
          <div key={idx} className="space-y-6">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${category.bg} ${category.color} dark:bg-slate-800 dark:text-white`}>
                <category.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{category.title}</h3>
            </div>

            <div className="space-y-4">
              {category.links.map((link, lIdx) => (
                <a
                  key={lIdx}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-card text-card-foreground p-6 rounded-[32px] border border-border shadow-sm hover:border-indigo-100 dark:hover:border-indigo-400/40 hover:shadow-xl hover:-translate-y-1 transition-all group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-black text-slate-900 dark:text-white group-hover:text-indigo-600">{link.name}</h4>
                    <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-indigo-400" />
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed font-medium">{link.desc}</p>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-muted rounded-[32px] md:rounded-[40px] p-8 md:p-10 border border-border flex flex-col md:flex-row items-center gap-8">
        <div className="bg-card p-4 rounded-3xl shadow-lg shadow-indigo-100 dark:shadow-indigo-900/40 rotate-3">
          <Bookmark className="w-10 h-10 text-indigo-600" />
        </div>
        <div className="flex-1 text-center md:text-left space-y-2">
          <h3 className="text-2xl font-black text-slate-900 dark:text-white">Need local help?</h3>
          <p className="text-muted-foreground font-medium max-w-xl">
            Every state has a Parent Training and Information Center (PTI) funded by the Department of Education to help you navigate your specific state's laws.
          </p>
        </div>
        <a
          href="https://www.parentcenterhub.org/find-your-center/"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-2 shrink-0 cursor-pointer"
        >
          Find Your State PTI <Search className="w-5 h-5" />
        </a>
      </div>
    </div>
  );
}
