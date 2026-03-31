import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { extractTextFromFile } from "@/lib/cv-parser";
import { extractCandidateFromText } from "@/lib/scoring";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, CheckCircle2, XCircle, Loader2, CloudUpload, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface ParsedCandidate {
  file_name: string;
  name: string;
  surname: string;
  email: string;
  phone: string;
  age: string;
  gender: string;
  experience_months: number;
  qualifications: string[];
  status: "pending" | "parsing" | "done" | "error";
  error?: string;
}

export default function UploadCVs() {
  const [candidates, setCandidates] = useState<ParsedCandidate[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [saved, setSaved] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileList = Array.from(files).filter(f => {
      const ext = f.name.split(".").pop()?.toLowerCase();
      return ext === "pdf" || ext === "docx";
    });

    if (fileList.length === 0) {
      toast.error("Please select PDF or DOCX files");
      return;
    }

    setProcessing(true);
    setSaved(false);
    setProgress(0);

    const results: ParsedCandidate[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      setCandidates(prev => [...prev.filter(c => c.file_name !== file.name), {
        file_name: file.name, name: "", surname: "", email: "", phone: "",
        age: "", gender: "", experience_months: 0, qualifications: [], status: "parsing"
      }]);

      try {
        const rawText = await extractTextFromFile(file);
        const candidate = extractCandidateFromText(rawText, file.name);
        const parsed: ParsedCandidate = {
          ...candidate,
          qualifications: candidate.qualifications,
          status: "done",
        };
        results.push(parsed);
        setCandidates(prev => prev.map(c => c.file_name === file.name ? parsed : c));
      } catch (err: any) {
        const errCandidate: ParsedCandidate = {
          file_name: file.name, name: "", surname: "", email: "", phone: "",
          age: "", gender: "", experience_months: 0, qualifications: [],
          status: "error", error: err.message,
        };
        results.push(errCandidate);
        setCandidates(prev => prev.map(c => c.file_name === file.name ? errCandidate : c));
      }

      setProgress(((i + 1) / fileList.length) * 100);
    }

    setProcessing(false);
  }, []);

  const saveToDatabase = async () => {
    const toSave = candidates.filter(c => c.status === "done");
    if (toSave.length === 0) { toast.error("No successfully parsed candidates to save"); return; }

    const rows = toSave.map(c => ({
      file_name: c.file_name,
      name: c.name,
      surname: c.surname,
      email: c.email,
      phone: c.phone,
      age: c.age,
      gender: c.gender,
      experience_months: c.experience_months,
      qualifications: c.qualifications,
    }));

    const { error } = await supabase.from("candidates").insert(rows);
    if (error) { toast.error(error.message); return; }
    toast.success(`${toSave.length} candidate(s) saved to database`);
    setSaved(true);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const doneCount = candidates.filter(c => c.status === "done").length;
  const errorCount = candidates.filter(c => c.status === "error").length;

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="animate-fade-in">
          <h1 className="text-2xl font-display font-bold">Upload CVs</h1>
          <p className="text-muted-foreground text-sm">Upload PDF/DOCX resumes for automatic parsing and scoring</p>
        </div>

        {/* Drop zone */}
        <Card
          className={`border-2 border-dashed cursor-pointer transition-all duration-300 animate-fade-in-delay-1 ${
            dragActive
              ? "border-primary bg-primary/5 scale-[1.01]"
              : "border-border/50 hover:border-primary/40 hover:bg-primary/[0.02]"
          }`}
          onDragOver={e => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => document.getElementById("cv-upload")?.click()}
        >
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="h-16 w-16 rounded-2xl gradient-primary flex items-center justify-center mb-4 glow">
              <CloudUpload className="h-8 w-8 text-primary-foreground" />
            </div>
            <p className="font-display font-semibold text-lg">Drop CV files here or click to browse</p>
            <p className="text-sm text-muted-foreground mt-1">Supports PDF and DOCX • Multiple files allowed</p>
            <input
              id="cv-upload"
              type="file"
              accept=".pdf,.docx"
              multiple
              className="hidden"
              onChange={e => handleFiles(e.target.files)}
            />
          </CardContent>
        </Card>

        {processing && (
          <div className="space-y-2 animate-fade-in">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" /> Processing files...
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {candidates.length > 0 && (
          <>
            {/* Summary */}
            <div className="flex gap-3 animate-fade-in">
              <Badge variant="secondary" className="gap-1.5 py-1 px-3">
                <Sparkles className="h-3 w-3" /> {candidates.length} total
              </Badge>
              {doneCount > 0 && (
                <Badge className="gap-1.5 py-1 px-3 bg-success text-success-foreground">
                  <CheckCircle2 className="h-3 w-3" /> {doneCount} parsed
                </Badge>
              )}
              {errorCount > 0 && (
                <Badge variant="destructive" className="gap-1.5 py-1 px-3">
                  <XCircle className="h-3 w-3" /> {errorCount} failed
                </Badge>
              )}
            </div>

            <Card className="border-border/50 overflow-hidden animate-fade-in-delay-1">
              <CardHeader className="pb-3 bg-secondary/30">
                <CardTitle className="text-base font-display">Parsed Candidates</CardTitle>
              </CardHeader>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Status</TableHead>
                      <TableHead>File</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead className="text-center">Exp (mo)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {candidates.map(c => (
                      <TableRow key={c.file_name}>
                        <TableCell>
                          {c.status === "done" && <CheckCircle2 className="h-4 w-4 text-success" />}
                          {c.status === "error" && <XCircle className="h-4 w-4 text-destructive" />}
                          {c.status === "parsing" && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                        </TableCell>
                        <TableCell className="font-mono text-xs max-w-[200px] truncate">
                          <div className="flex items-center gap-1.5"><FileText className="h-3 w-3 text-muted-foreground" />{c.file_name}</div>
                        </TableCell>
                        <TableCell className="font-medium">{c.name} {c.surname}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{c.email}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{c.phone}</TableCell>
                        <TableCell className="text-center">{c.experience_months}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>

            <div className="flex gap-2 animate-fade-in-delay-2">
              <Button onClick={saveToDatabase} disabled={saved || doneCount === 0} className="gradient-primary text-primary-foreground gap-2 glow">
                {saved ? "Saved ✓" : "Save to Database"}
              </Button>
              <Button variant="outline" onClick={() => { setCandidates([]); setSaved(false); }}>Clear All</Button>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
