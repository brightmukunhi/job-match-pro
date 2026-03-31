import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { TagInput } from "@/components/TagInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Building2, Briefcase } from "lucide-react";
import { toast } from "sonner";

interface Department { id: string; name: string; }
interface Profile {
  id: string; department_id: string; name: string; key: string;
  relevant_fields: string[]; must_have_keywords: string[];
  skill_keywords: string[]; certification_keywords: string[];
}

const emptyForm = {
  name: "", key: "", department_id: "",
  relevant_fields: [] as string[], must_have_keywords: [] as string[],
  skill_keywords: [] as string[], certification_keywords: [] as string[],
};

export default function Profiles() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");
  const [filterDept, setFilterDept] = useState<string>("all");

  const load = async () => {
    const [{ data: d }, { data: p }] = await Promise.all([
      supabase.from("departments").select("*").order("name"),
      supabase.from("position_profiles").select("*").order("name"),
    ]);
    setDepartments(d || []);
    setProfiles(p || []);
  };

  useEffect(() => { load(); }, []);

  const addDepartment = async () => {
    if (!newDeptName.trim()) return;
    const { error } = await supabase.from("departments").insert({ name: newDeptName.trim() });
    if (error) { toast.error(error.message); return; }
    setNewDeptName("");
    toast.success("Department created");
    load();
  };

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (p: Profile) => {
    setEditingId(p.id);
    setForm({ name: p.name, key: p.key, department_id: p.department_id, relevant_fields: p.relevant_fields, must_have_keywords: p.must_have_keywords, skill_keywords: p.skill_keywords, certification_keywords: p.certification_keywords });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.name || !form.key || !form.department_id) { toast.error("Name, key, and department are required"); return; }
    if (editingId) {
      const { error } = await supabase.from("position_profiles").update(form).eq("id", editingId);
      if (error) { toast.error(error.message); return; }
      toast.success("Profile updated");
    } else {
      const { error } = await supabase.from("position_profiles").insert(form);
      if (error) { toast.error(error.message); return; }
      toast.success("Profile created");
    }
    setDialogOpen(false);
    load();
  };

  const deleteProfile = async (id: string) => {
    const { error } = await supabase.from("position_profiles").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Profile deleted");
    load();
  };

  const filtered = filterDept === "all" ? profiles : profiles.filter(p => p.department_id === filterDept);
  const getDeptName = (id: string) => departments.find(d => d.id === id)?.name || "Unknown";

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between animate-fade-in">
          <div>
            <h1 className="text-2xl font-display font-bold">Job Profiles</h1>
            <p className="text-muted-foreground text-sm">Manage departments and position profiles dynamically</p>
          </div>
          <div className="flex gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Building2 className="h-4 w-4" /> Department
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle className="font-display">Add Department</DialogTitle></DialogHeader>
                <div className="flex gap-2">
                  <Input value={newDeptName} onChange={e => setNewDeptName(e.target.value)} placeholder="Department name" className="bg-secondary/50" />
                  <Button onClick={addDepartment} className="gradient-primary text-primary-foreground">Add</Button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {departments.map(d => <Badge key={d.id} variant="outline" className="py-1">{d.name}</Badge>)}
                </div>
              </DialogContent>
            </Dialog>
            <Button onClick={openCreate} size="sm" className="gradient-primary text-primary-foreground gap-1.5 glow">
              <Plus className="h-4 w-4" /> Position Profile
            </Button>
          </div>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-3 animate-fade-in-delay-1">
          <Label className="text-sm font-medium">Filter:</Label>
          <Select value={filterDept} onValueChange={setFilterDept}>
            <SelectTrigger className="w-[220px] bg-card border-border/50"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Badge variant="secondary" className="ml-auto">{filtered.length} profiles</Badge>
        </div>

        {/* Profile Table */}
        <Card className="border-border/50 overflow-hidden animate-fade-in-delay-2">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/30">
                  <TableHead>Position</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead className="text-center">Skills</TableHead>
                  <TableHead className="text-center">Must-Haves</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(p => (
                  <TableRow key={p.id} className="group">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{p.name}</span>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-xs py-0.5">{getDeptName(p.department_id)}</Badge></TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{p.key}</TableCell>
                    <TableCell className="text-center"><Badge variant="secondary" className="text-xs">{p.skill_keywords.length}</Badge></TableCell>
                    <TableCell className="text-center"><Badge variant="secondary" className="text-xs">{p.must_have_keywords.length}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(p)} className="h-8 w-8"><Pencil className="h-3.5 w-3.5" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle className="font-display">Delete "{p.name}"?</AlertDialogTitle>
                              <AlertDialogDescription>This will also delete all ranking results for this position.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteProfile(p.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                      <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p>No profiles found</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display">{editingId ? "Edit" : "Create"} Position Profile</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Position Name</Label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Space Operations Technician" className="bg-secondary/50" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Key (unique slug)</Label>
                  <Input value={form.key} onChange={e => setForm(f => ({ ...f, key: e.target.value }))} placeholder="e.g. space_ops_tech" className="bg-secondary/50 font-mono text-sm" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Department</Label>
                <Select value={form.department_id} onValueChange={v => setForm(f => ({ ...f, department_id: v }))}>
                  <SelectTrigger className="bg-secondary/50"><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>
                    {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Relevant Fields</Label>
                <TagInput value={form.relevant_fields} onChange={v => setForm(f => ({ ...f, relevant_fields: v }))} placeholder="e.g. electronics, telecommunications..." />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Must-Have Keywords</Label>
                <TagInput value={form.must_have_keywords} onChange={v => setForm(f => ({ ...f, must_have_keywords: v }))} placeholder="e.g. rf, telemetry, linux..." />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Skill Keywords</Label>
                <TagInput value={form.skill_keywords} onChange={v => setForm(f => ({ ...f, skill_keywords: v }))} placeholder="e.g. python, oscilloscope, soldering..." />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Certification Keywords</Label>
                <TagInput value={form.certification_keywords} onChange={v => setForm(f => ({ ...f, certification_keywords: v }))} placeholder="e.g. ccna, first aid, safety..." />
              </div>
              <Button onClick={save} className="w-full gradient-primary text-primary-foreground font-medium glow">
                {editingId ? "Update" : "Create"} Profile
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
