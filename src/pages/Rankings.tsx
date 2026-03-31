import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { scoreAgainstProfile, findBestFitProfile, type PositionProfile, type CandidateData, type ScoringResult } from "@/lib/scoring";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { BarChart3, Download, Play, Loader2, Trophy, Users } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface RankedCandidate {
  candidate: CandidateData;
  result: ScoringResult;
  profileName: string;
  departmentName: string;
}

export default function Rankings() {
  const [profiles, setProfiles] = useState<(PositionProfile & { department_name?: string })[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [candidates, setCandidates] = useState<CandidateData[]>([]);
  const [rankings, setRankings] = useState<RankedCandidate[]>([]);
  const [mode, setMode] = useState<string>("auto");
  const [selectedProfile, setSelectedProfile] = useState<string>("");
  const [selectedDept, setSelectedDept] = useState<string>("all");
  const [running, setRunning] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [{ data: depts }, { data: profs }, { data: cands }] = await Promise.all([
        supabase.from("departments").select("*").order("name"),
        supabase.from("position_profiles").select("*").order("name"),
        supabase.from("candidates").select("*").order("created_at", { ascending: false }),
      ]);
      setDepartments(depts || []);
      const profilesWithDept = (profs || []).map(p => ({
        ...p,
        department_name: (depts || []).find(d => d.id === p.department_id)?.name || "Unknown",
      }));
      setProfiles(profilesWithDept);
      setCandidates((cands || []).map(c => ({
        id: c.id, file_name: c.file_name, name: c.name, surname: c.surname,
        age: c.age, gender: c.gender, email: c.email, phone: c.phone,
        qualifications: c.qualifications, certifications: c.certifications,
        skills_extracted: c.skills_extracted, experience_months: c.experience_months,
        raw_text: c.raw_text,
      })));
    };
    load();
  }, []);

  const runScoring = async () => {
    if (candidates.length === 0) { toast.error("No candidates uploaded yet"); return; }
    setRunning(true);
    const results: RankedCandidate[] = [];
    let profilesToScore = profiles;
    if (mode === "position" && selectedProfile) {
      profilesToScore = profiles.filter(p => p.id === selectedProfile);
    } else if (mode === "department" && selectedDept !== "all") {
      profilesToScore = profiles.filter(p => p.department_id === selectedDept);
    }
    if (profilesToScore.length === 0) { toast.error("No profiles selected"); setRunning(false); return; }

    for (const candidate of candidates) {
      if (mode === "auto") {
        const best = findBestFitProfile(candidate, profilesToScore);
        if (best) {
          const profile = profiles.find(p => p.id === best.position_profile_id);
          results.push({ candidate, result: best, profileName: profile?.name || "Unknown", departmentName: profile?.department_name || "Unknown" });
        }
      } else {
        for (const profile of profilesToScore) {
          const result = scoreAgainstProfile(candidate, profile);
          results.push({ candidate, result, profileName: profile.name, departmentName: profile.department_name || "Unknown" });
        }
      }
    }

    results.sort((a, b) => b.result.total_score - a.result.total_score);
    setRankings(results);

    const dbRows = results.map(r => ({
      candidate_id: r.candidate.id!, position_profile_id: r.result.position_profile_id,
      qualification_points: r.result.qualification_points, skills_points: r.result.skills_points,
      certification_points: r.result.certification_points, attachment_points: r.result.attachment_points,
      total_score: r.result.total_score, skills_matched: r.result.skills_matched,
      certs_matched: r.result.certs_matched, must_haves_missing: r.result.must_haves_missing,
      notes: r.result.notes,
    }));

    if (dbRows.length > 0) {
      const { error } = await supabase.from("ranking_results").insert(dbRows);
      if (error) console.error("Error saving results:", error);
    }

    setRunning(false);
    toast.success(`Scored ${results.length} candidate-position pairs`);
  };

  const exportToExcel = () => {
    if (rankings.length === 0) { toast.error("No rankings to export"); return; }
    const data = rankings.map((r, i) => ({
      Rank: i + 1, Name: `${r.candidate.name} ${r.candidate.surname}`.trim(),
      Email: r.candidate.email, Phone: r.candidate.phone,
      Department: r.departmentName, Position: r.profileName,
      "Total (7)": r.result.total_score, "Qual (3)": r.result.qualification_points,
      "Skills (2)": r.result.skills_points, "Cert (1)": r.result.certification_points,
      "Attach (1)": r.result.attachment_points, "Skills Matched": r.result.skills_matched,
      "Must-Haves Missing": r.result.must_haves_missing, "Certs Matched": r.result.certs_matched,
      Notes: r.result.notes, File: r.candidate.file_name,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "All Ranked");

    const grouped = new Map<string, typeof data>();
    for (const row of data) {
      const key = `${row.Department} - ${row.Position}`.slice(0, 31);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(row);
    }
    for (const [sheetName, rows] of grouped) {
      rows.sort((a, b) => b["Total (7)"] - a["Total (7)"]);
      rows.forEach((r, i) => r.Rank = i + 1);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), sheetName);
    }

    XLSX.writeFile(wb, `cv_rankings_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success("Excel file downloaded");
  };

  const positionGroups = new Map<string, RankedCandidate[]>();
  for (const r of rankings) {
    if (!positionGroups.has(r.profileName)) positionGroups.set(r.profileName, []);
    positionGroups.get(r.profileName)!.push(r);
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between animate-fade-in">
          <div>
            <h1 className="text-2xl font-display font-bold">Rankings</h1>
            <p className="text-muted-foreground text-sm">Score candidates against position profiles</p>
          </div>
          <Button variant="outline" onClick={exportToExcel} disabled={rankings.length === 0} className="gap-1.5">
            <Download className="h-4 w-4" /> Export Excel
          </Button>
        </div>

        {/* Controls */}
        <Card className="border-border/50 animate-fade-in-delay-1">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Scoring Mode</Label>
                <Select value={mode} onValueChange={setMode}>
                  <SelectTrigger className="w-[220px] bg-secondary/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto-detect best fit</SelectItem>
                    <SelectItem value="department">By department</SelectItem>
                    <SelectItem value="position">By specific position</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {mode === "department" && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Department</Label>
                  <Select value={selectedDept} onValueChange={setSelectedDept}>
                    <SelectTrigger className="w-[220px] bg-secondary/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {mode === "position" && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Position</Label>
                  <Select value={selectedProfile} onValueChange={setSelectedProfile}>
                    <SelectTrigger className="w-[280px] bg-secondary/50"><SelectValue placeholder="Select position" /></SelectTrigger>
                    <SelectContent>
                      {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button onClick={runScoring} disabled={running} className="gradient-primary text-primary-foreground gap-2 glow">
                {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Run Scoring ({candidates.length} candidates)
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {rankings.length > 0 && (
          <div className="animate-fade-in-delay-2">
            <div className="flex items-center gap-3 mb-4">
              <Badge className="gap-1.5 py-1.5 px-3 bg-success text-success-foreground">
                <Trophy className="h-3.5 w-3.5" /> {rankings.length} results
              </Badge>
              <Badge variant="secondary" className="gap-1.5 py-1.5 px-3">
                <Users className="h-3.5 w-3.5" /> {new Set(rankings.map(r => r.candidate.id)).size} candidates
              </Badge>
            </div>
            <Tabs defaultValue="all">
              <TabsList className="flex-wrap h-auto gap-1 bg-secondary/50 p-1">
                <TabsTrigger value="all">All Ranked ({rankings.length})</TabsTrigger>
                {[...positionGroups.entries()].map(([name, items]) => (
                  <TabsTrigger key={name} value={name}>{name.slice(0, 25)} ({items.length})</TabsTrigger>
                ))}
              </TabsList>
              <TabsContent value="all"><RankingTable items={rankings} /></TabsContent>
              {[...positionGroups.entries()].map(([name, items]) => (
                <TabsContent key={name} value={name}>
                  <RankingTable items={items.sort((a, b) => b.result.total_score - a.result.total_score)} />
                </TabsContent>
              ))}
            </Tabs>
          </div>
        )}

        {rankings.length === 0 && !running && (
          <Card className="border-border/50 border-dashed animate-fade-in-delay-2">
            <CardContent className="flex flex-col items-center py-16">
              <div className="h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
                <BarChart3 className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="font-display font-medium text-lg mb-1">No rankings yet</p>
              <p className="text-muted-foreground text-sm">Upload CVs and run scoring to see rankings here</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}

function RankingTable({ items }: { items: RankedCandidate[] }) {
  return (
    <Card className="mt-3 border-border/50 overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/30">
              <TableHead className="w-12">#</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Position</TableHead>
              <TableHead className="text-center">Total /7</TableHead>
              <TableHead className="text-center">Q /3</TableHead>
              <TableHead className="text-center">S /2</TableHead>
              <TableHead className="text-center">C /1</TableHead>
              <TableHead className="text-center">A /1</TableHead>
              <TableHead>Skills Matched</TableHead>
              <TableHead>Missing</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((r, i) => (
              <TableRow key={`${r.candidate.id}-${r.result.position_profile_id}-${i}`} className="group">
                <TableCell>
                  <div className={`h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                    i === 0 ? "gradient-primary text-primary-foreground" : i < 3 ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
                  }`}>
                    {i + 1}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{r.candidate.name} {r.candidate.surname}</div>
                  <div className="text-xs text-muted-foreground">{r.candidate.email}</div>
                </TableCell>
                <TableCell><Badge variant="outline" className="text-xs">{r.profileName}</Badge></TableCell>
                <TableCell className="text-center">
                  <Badge className={`font-bold ${
                    r.result.total_score >= 5 ? "bg-success text-success-foreground" :
                    r.result.total_score >= 3 ? "bg-primary text-primary-foreground" :
                    "bg-secondary text-secondary-foreground"
                  }`}>
                    {r.result.total_score}
                  </Badge>
                </TableCell>
                <TableCell className="text-center text-sm">{r.result.qualification_points}</TableCell>
                <TableCell className="text-center text-sm">{r.result.skills_points}</TableCell>
                <TableCell className="text-center text-sm">{r.result.certification_points}</TableCell>
                <TableCell className="text-center text-sm">{r.result.attachment_points}</TableCell>
                <TableCell className="text-xs max-w-[200px] truncate text-muted-foreground">{r.result.skills_matched}</TableCell>
                <TableCell className="text-xs max-w-[150px] truncate text-destructive">{r.result.must_haves_missing}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
