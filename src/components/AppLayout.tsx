import { Link, useLocation } from "react-router-dom";
import { Briefcase, Upload, BarChart3, Home } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Home", icon: Home },
  { to: "/profiles", label: "Job Profiles", icon: Briefcase },
  { to: "/upload", label: "Upload CVs", icon: Upload },
  { to: "/rankings", label: "Rankings", icon: BarChart3 },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-14 items-center gap-6 px-4">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg tracking-tight text-foreground">
            <Briefcase className="h-5 w-5 text-primary" />
            <span>CV Auto-Ranker</span>
          </Link>
          <nav className="flex items-center gap-1 ml-6">
            {navItems.map(item => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  location.pathname === item.to
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
