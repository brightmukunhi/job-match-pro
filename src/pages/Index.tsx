import { Link } from "react-router-dom";
import { Briefcase, Upload, BarChart3, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/AppLayout";

const features = [
  {
    icon: Briefcase,
    title: "Job Profile Manager",
    description: "Define departments, positions, and scoring criteria dynamically — no more hardcoded profiles.",
    link: "/profiles",
    cta: "Manage Profiles",
  },
  {
    icon: Upload,
    title: "CV Upload & Processing",
    description: "Upload PDF/DOCX resumes, extract candidate info automatically, and store for ranking.",
    link: "/upload",
    cta: "Upload CVs",
  },
  {
    icon: BarChart3,
    title: "Rankings Dashboard",
    description: "Score candidates against positions using a 7-point rubric. Export results to Excel.",
    link: "/rankings",
    cta: "View Rankings",
  },
];

export default function Index() {
  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-3 pt-8 pb-4">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">CV Auto-Ranker</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            A dynamic recruitment tool that scores and ranks candidates against configurable job profiles
            using a 7-point rubric: Qualification (3) + Skills (2) + Certification (1) + Attachment (1).
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {features.map(f => (
            <Card key={f.link} className="flex flex-col">
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">{f.title}</CardTitle>
                <CardDescription>{f.description}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto">
                <Link to={f.link}>
                  <Button variant="outline" className="w-full gap-2">
                    {f.cta} <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <h2 className="font-semibold mb-2">7-Point Scoring Rubric</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="rounded-md bg-background p-3 border">
                <div className="font-medium">Qualification</div>
                <div className="text-muted-foreground">0–3 points</div>
                <div className="text-xs mt-1">Degree=3, Diploma=2, Certificate=1</div>
              </div>
              <div className="rounded-md bg-background p-3 border">
                <div className="font-medium">Skills Match</div>
                <div className="text-muted-foreground">0–2 points</div>
                <div className="text-xs mt-1">Keyword coverage & must-haves</div>
              </div>
              <div className="rounded-md bg-background p-3 border">
                <div className="font-medium">Certification</div>
                <div className="text-muted-foreground">0–1 point</div>
                <div className="text-xs mt-1">Relevant professional certs</div>
              </div>
              <div className="rounded-md bg-background p-3 border">
                <div className="font-medium">Attachment</div>
                <div className="text-muted-foreground">0–1 point</div>
                <div className="text-xs mt-1">≥12 months experience</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
