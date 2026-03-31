import { Link } from "react-router-dom";
import { Briefcase, Upload, BarChart3, ArrowRight, Zap, Shield, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/AppLayout";

const features = [
  {
    icon: Briefcase,
    title: "Job Profile Manager",
    description: "Define departments, positions, and scoring criteria dynamically — no more hardcoded profiles.",
    link: "/profiles",
    cta: "Manage Profiles",
    gradient: "from-primary/10 to-accent/10",
    iconBg: "gradient-primary",
  },
  {
    icon: Upload,
    title: "CV Upload & Processing",
    description: "Upload PDF/DOCX resumes, extract candidate info automatically, and store for ranking.",
    link: "/upload",
    cta: "Upload CVs",
    gradient: "from-accent/10 to-success/10",
    iconBg: "bg-accent",
  },
  {
    icon: BarChart3,
    title: "Rankings Dashboard",
    description: "Score candidates against positions using a 7-point rubric. Export results to Excel.",
    link: "/rankings",
    cta: "View Rankings",
    gradient: "from-success/10 to-primary/10",
    iconBg: "bg-success",
  },
];

const stats = [
  { icon: Zap, label: "Automated Scoring", value: "7-Point Rubric" },
  { icon: Shield, label: "Dynamic Profiles", value: "No Hardcoding" },
  { icon: TrendingUp, label: "Export Ready", value: "Excel / CSV" },
];

export default function Index() {
  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Hero */}
        <div className="text-center space-y-5 pt-8 pb-4 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-2">
            <Zap className="h-3.5 w-3.5" />
            Intelligent Recruitment Platform
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight leading-tight">
            Rank candidates with{" "}
            <span className="gradient-text">precision</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            A dynamic recruitment tool that scores and ranks candidates against configurable job profiles
            using a 7-point rubric: Qualification + Skills + Certification + Attachment.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link to="/upload">
              <Button size="lg" className="gradient-primary text-primary-foreground gap-2 glow h-12 px-6 font-medium">
                Get Started <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/profiles">
              <Button size="lg" variant="outline" className="h-12 px-6 font-medium">
                View Profiles
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 animate-fade-in-delay-1">
          {stats.map(s => (
            <div key={s.label} className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border/50">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <s.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-sm font-semibold">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Feature cards */}
        <div className="grid gap-5 md:grid-cols-3 animate-fade-in-delay-2">
          {features.map(f => (
            <Card key={f.link} className="group relative overflow-hidden border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5">
              <div className={`absolute inset-0 bg-gradient-to-br ${f.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
              <CardContent className="relative pt-6 pb-6 flex flex-col h-full">
                <div className={`h-12 w-12 rounded-xl ${f.iconBg} flex items-center justify-center mb-4 transition-transform group-hover:scale-110`}>
                  <f.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="font-display font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground mb-5 flex-1">{f.description}</p>
                <Link to={f.link}>
                  <Button variant="outline" className="w-full gap-2 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all">
                    {f.cta} <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Rubric */}
        <Card className="border-border/50 overflow-hidden animate-fade-in-delay-3">
          <CardContent className="pt-6">
            <h2 className="font-display font-semibold text-lg mb-4">7-Point Scoring Rubric</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Qualification", max: "3", desc: "Degree=3, Diploma=2, Cert=1", color: "bg-primary" },
                { label: "Skills Match", max: "2", desc: "Keyword coverage & must-haves", color: "bg-accent" },
                { label: "Certification", max: "1", desc: "Relevant professional certs", color: "bg-success" },
                { label: "Attachment", max: "1", desc: "≥12 months experience", color: "bg-primary" },
              ].map(r => (
                <div key={r.label} className="rounded-xl bg-secondary/50 p-4 border border-border/50">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`h-2 w-2 rounded-full ${r.color}`} />
                    <span className="font-medium text-sm">{r.label}</span>
                  </div>
                  <div className="text-2xl font-display font-bold mb-1">{r.max}</div>
                  <div className="text-xs text-muted-foreground">{r.desc}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
