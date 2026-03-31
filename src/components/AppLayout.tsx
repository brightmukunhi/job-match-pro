import { Link, useLocation } from "react-router-dom";
import { Briefcase, Upload, BarChart3, Home, LogOut, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

const navItems = [
  { to: "/", label: "Home", icon: Home },
  { to: "/profiles", label: "Job Profiles", icon: Briefcase },
  { to: "/upload", label: "Upload CVs", icon: Upload },
  { to: "/rankings", label: "Rankings", icon: BarChart3 },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [dark, setDark] = useState(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark") ||
        window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <header className="sticky top-0 z-50 border-b border-border/50 glass">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="h-9 w-9 rounded-xl gradient-primary flex items-center justify-center transition-transform group-hover:scale-105 glow">
                <Briefcase className="h-4.5 w-4.5 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-lg tracking-tight">CV Auto-Ranker</span>
            </Link>
            <nav className="hidden md:flex items-center gap-1 ml-2">
              {navItems.map(item => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                    location.pathname === item.to
                      ? "gradient-primary text-primary-foreground shadow-md shadow-primary/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setDark(!dark)} className="rounded-lg">
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            {user && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground hidden sm:block truncate max-w-[150px]">{user.email}</span>
                <Button variant="ghost" size="icon" onClick={signOut} className="rounded-lg text-muted-foreground hover:text-destructive">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile nav */}
        <div className="md:hidden border-t border-border/50 px-4 py-2 flex gap-1 overflow-x-auto">
          {navItems.map(item => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all",
                location.pathname === item.to
                  ? "gradient-primary text-primary-foreground"
                  : "text-muted-foreground bg-secondary/50"
              )}
            >
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
            </Link>
          ))}
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
