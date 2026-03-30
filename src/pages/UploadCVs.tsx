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
import { Upload, FileText, CheckCircle2, XCircle, Loader2 } from "lucide-react";
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

    // Re-extract full candidate data to get raw_text
    // For now we save what we have
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
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Upload CVs</h1>
          <p className="text-muted-foreground text-sm">Upload PDF/DOCX resumes for automatic parsing and scoring</p>
        </div>

        {/* Drop zone */}
        <Card
          className="border-dashed border-2 cursor-pointer hover:border-primary/50 transition-colors"
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => document.getElementById("cv-upload")?.click()}
        >
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Upload className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm font-medium">Drop CV files here or click to browse</p>
            <p className="text-xs text-muted-foreground mt-1">Supports PDF and DOCX • Multiple files allowed</p>
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
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Processing files...
            </div>
            <Progress value={progress} />
          </div>
        )}

        {candidates.length > 0 && (
          <>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Parsed Candidates ({candidates.filter(c => c.status === "done").length}/{candidates.length})</CardTitle>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>File</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Exp (mo)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {candidates.map(c => (
                    <TableRow key={c.file_name}>
                      <TableCell>
                        {c.status === "done" && <CheckCircle2 className="h-4 w-4 text-primary" />}
                        {c.status === "error" && <XCircle className="h-4 w-4 text-destructive" />}
                        {c.status === "parsing" && <Loader2 className="h-4 w-4 animate-spin" />}
                      </TableCell>
                      <TableCell className="font-mono text-xs max-w-[200px] truncate">
                        <div className="flex items-center gap-1"><FileText className="h-3 w-3" />{c.file_name}</div>
                      </TableCell>
                      <TableCell>{c.name} {c.surname}</TableCell>
                      <TableCell className="text-xs">{c.email}</TableCell>
                      <TableCell className="text-xs">{c.phone}</TableCell>
                      <TableCell>{c.experience_months}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>

            <div className="flex gap-2">
              <Button onClick={saveToDatabase} disabled={saved || candidates.filter(c => c.status === "done").length === 0}>
                {saved ? "Saved ✓" : "Save to Database"}
              </Button>
              <Button variant="outline" onClick={() => { setCandidates([]); setSaved(false); }}>Clear</Button>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
