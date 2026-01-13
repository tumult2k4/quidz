import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, FileText, Image, Video, File, Eye, CheckCircle, Clock, XCircle, Star, Plus, Filter, User } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

type SkillStatus = "in_pruefung" | "integrationsrelevant" | "validiert" | "abgelehnt";
type SkillCategory = "handwerk" | "digital" | "sozial" | "kreativ" | "sonstiges";

interface Skill {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: SkillCategory;
  proof_text: string | null;
  proof_file_url: string | null;
  status: SkillStatus;
  is_integration_relevant: boolean;
  coach_comment: string | null;
  competence_level: string | null;
  created_at: string;
  user_profile?: {
    full_name: string | null;
    email: string;
  } | null;
}

interface Task {
  id: string;
  title: string;
  status: string | null;
  due_date: string | null;
}

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
}

const categoryLabels: Record<string, string> = {
  handwerk: "Handwerk",
  digital: "Digital",
  sozial: "Sozial",
  kreativ: "Kreativ",
  sonstiges: "Sonstiges",
};

const statusLabels: Record<string, string> = {
  in_pruefung: "In Prüfung",
  integrationsrelevant: "Integrationsrelevant",
  validiert: "Validiert",
  abgelehnt: "Abgelehnt",
};

const statusIcons: Record<string, React.ReactNode> = {
  in_pruefung: <Clock className="w-4 h-4" />,
  integrationsrelevant: <Star className="w-4 h-4" />,
  validiert: <CheckCircle className="w-4 h-4" />,
  abgelehnt: <XCircle className="w-4 h-4" />,
};

const statusColors: Record<string, string> = {
  in_pruefung: "bg-yellow-100 text-yellow-800",
  integrationsrelevant: "bg-purple-100 text-purple-800",
  validiert: "bg-green-100 text-green-800",
  abgelehnt: "bg-red-100 text-red-800",
};

const AdminSkills = () => {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("all");
  
  // Edit form
  const [editForm, setEditForm] = useState<{
    status: SkillStatus;
    is_integration_relevant: boolean;
    coach_comment: string;
    competence_level: string;
  }>({
    status: "in_pruefung",
    is_integration_relevant: false,
    coach_comment: "",
    competence_level: "",
  });
  
  // New task form
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    goal: "",
    due_date: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    
    // Fetch all skills
    const { data: skillsData, error: skillsError } = await supabase
      .from("skills")
      .select("*")
      .order("created_at", { ascending: false });

    if (skillsError) {
      toast.error("Fehler beim Laden der Skills");
      console.error(skillsError);
    }

    // Fetch all profiles for filter and to map to skills
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .order("full_name");
    
    setProfiles(profilesData || []);
    
    // Map profiles to skills
    if (skillsData && profilesData) {
      const profileMap = new Map(profilesData.map(p => [p.id, p]));
      const skillsWithProfiles = skillsData.map(skill => ({
        ...skill,
        user_profile: profileMap.get(skill.user_id) || null,
      }));
      setSkills(skillsWithProfiles as Skill[]);
    } else {
      setSkills(skillsData as Skill[] || []);
    }
    
    setIsLoading(false);
  };

  const fetchUserTasks = async (userId: string) => {
    const { data, error } = await supabase
      .from("tasks")
      .select("id, title, status, due_date")
      .eq("assigned_to", userId)
      .order("created_at", { ascending: false });

    if (!error) {
      setTasks(data || []);
    }
  };

  const openDetailDialog = async (skill: Skill) => {
    setSelectedSkill(skill);
    setEditForm({
      status: skill.status,
      is_integration_relevant: skill.is_integration_relevant,
      coach_comment: skill.coach_comment || "",
      competence_level: skill.competence_level || "",
    });
    await fetchUserTasks(skill.user_id);
    setDetailDialogOpen(true);
  };

  const handleUpdateSkill = async () => {
    if (!selectedSkill) return;
    setIsSubmitting(true);

    const { error } = await supabase
      .from("skills")
      .update({
        status: editForm.status,
        is_integration_relevant: editForm.is_integration_relevant,
        coach_comment: editForm.coach_comment || null,
        competence_level: editForm.competence_level || null,
      })
      .eq("id", selectedSkill.id);

    if (error) {
      toast.error("Fehler beim Aktualisieren des Skills");
    } else {
      toast.success("Skill aktualisiert");
      setDetailDialogOpen(false);
      fetchData();
    }
    setIsSubmitting(false);
  };

  const handleCreateTask = async () => {
    if (!selectedSkill) return;
    setIsSubmitting(true);

    try {
      // Create the task
      const { data: taskData, error: taskError } = await supabase
        .from("tasks")
        .insert({
          title: taskForm.title,
          description: `${taskForm.description}\n\nZiel: ${taskForm.goal}\n\n(Abgeleitet vom Skill: ${selectedSkill.title})`,
          assigned_to: selectedSkill.user_id,
          due_date: taskForm.due_date || null,
          status: "open",
          priority: "medium",
        })
        .select()
        .single();

      if (taskError) throw taskError;

      // Link task to skill
      const { error: linkError } = await supabase
        .from("skill_tasks")
        .insert({
          skill_id: selectedSkill.id,
          task_id: taskData.id,
        });

      if (linkError) throw linkError;

      toast.success("Aufgabe erstellt und mit Skill verknüpft");
      setTaskDialogOpen(false);
      setTaskForm({ title: "", description: "", goal: "", due_date: "" });
      fetchUserTasks(selectedSkill.user_id);
    } catch (error: any) {
      toast.error("Fehler beim Erstellen der Aufgabe: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const linkExistingTask = async (taskId: string) => {
    if (!selectedSkill) return;

    const { error } = await supabase
      .from("skill_tasks")
      .insert({
        skill_id: selectedSkill.id,
        task_id: taskId,
      });

    if (error) {
      if (error.code === "23505") {
        toast.error("Diese Aufgabe ist bereits mit dem Skill verknüpft");
      } else {
        toast.error("Fehler beim Verknüpfen der Aufgabe");
      }
    } else {
      toast.success("Aufgabe mit Skill verknüpft");
    }
  };

  const getFileIcon = (url: string | null) => {
    if (!url) return null;
    const ext = url.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return <Image className="w-4 h-4" />;
    if (['mp4', 'webm', 'mov'].includes(ext || '')) return <Video className="w-4 h-4" />;
    if (['pdf', 'doc', 'docx'].includes(ext || '')) return <FileText className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  const filteredSkills = skills.filter((skill) => {
    if (statusFilter !== "all" && skill.status !== statusFilter) return false;
    if (categoryFilter !== "all" && skill.category !== categoryFilter) return false;
    if (userFilter !== "all" && skill.user_id !== userFilter) return false;
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Skills-Übersicht</h1>
          <p className="text-muted-foreground">Alle vorgeschlagenen Skills der Teilnehmer</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filter:</span>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Status</SelectItem>
                {Object.entries(statusLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Kategorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Kategorien</SelectItem>
                {Object.entries(categoryLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Teilnehmer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Teilnehmer</SelectItem>
                {profiles
                  .filter((profile) => profile.id && profile.id.trim() !== "")
                  .map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.full_name || profile.email}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Skills List */}
      {filteredSkills.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Keine Skills gefunden.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSkills.map((skill) => (
            <Card key={skill.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => openDetailDialog(skill)}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-2">
                  <CardTitle className="text-lg line-clamp-2">{skill.title}</CardTitle>
                  <Badge variant="secondary" className="shrink-0">
                    {categoryLabels[skill.category] || skill.category}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={`${statusColors[skill.status]} flex items-center gap-1`}>
                    {statusIcons[skill.status]}
                    {statusLabels[skill.status] || skill.status}
                  </Badge>
                  {skill.is_integration_relevant && (
                    <Badge variant="outline" className="text-purple-600 border-purple-300">
                      <Star className="w-3 h-3 mr-1" />
                      Relevant
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {skill.description}
                </p>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <User className="w-4 h-4" />
                  <span>{skill.user_profile?.full_name || skill.user_profile?.email || "Unbekannt"}</span>
                </div>
                
                {skill.proof_file_url && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    {getFileIcon(skill.proof_file_url)}
                    <span>Nachweis vorhanden</span>
                  </div>
                )}
                
                <span className="text-xs text-muted-foreground">
                  {format(new Date(skill.created_at), "dd. MMM yyyy", { locale: de })}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Skill Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedSkill && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedSkill.title}
                </DialogTitle>
                <DialogDescription className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {selectedSkill.user_profile?.full_name || selectedSkill.user_profile?.email || "Unbekannt"}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Current Status */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary">
                    {categoryLabels[selectedSkill.category]}
                  </Badge>
                  <Badge className={`${statusColors[selectedSkill.status]} flex items-center gap-1`}>
                    {statusIcons[selectedSkill.status]}
                    {statusLabels[selectedSkill.status]}
                  </Badge>
                  {selectedSkill.is_integration_relevant && (
                    <Badge variant="outline" className="text-purple-600 border-purple-300">
                      <Star className="w-3 h-3 mr-1" />
                      Integrationsrelevant
                    </Badge>
                  )}
                </div>

                {/* Description */}
                <div>
                  <h4 className="font-medium mb-2">Beschreibung</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedSkill.description}
                  </p>
                </div>

                {/* Proofs */}
                {selectedSkill.proof_text && (
                  <div>
                    <h4 className="font-medium mb-2">Nachweis (Text)</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {selectedSkill.proof_text}
                    </p>
                  </div>
                )}

                {selectedSkill.proof_file_url && (
                  <div>
                    <h4 className="font-medium mb-2">Nachweis (Datei)</h4>
                    <a
                      href={selectedSkill.proof_file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      {getFileIcon(selectedSkill.proof_file_url)}
                      Datei ansehen
                    </a>
                  </div>
                )}

                {/* Edit Section */}
                <div className="border-t pt-6 space-y-4">
                  <h4 className="font-medium">Skill prüfen & kennzeichnen</h4>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select
                        value={editForm.status}
                        onValueChange={(value) => setEditForm({ ...editForm, status: value as SkillStatus })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusLabels).map(([key, label]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Kompetenzstufe</Label>
                      <Select
                        value={editForm.competence_level}
                        onValueChange={(value) => setEditForm({ ...editForm, competence_level: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Stufe auswählen" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Keine Angabe</SelectItem>
                          <SelectItem value="Grundlagen">Grundlagen</SelectItem>
                          <SelectItem value="Fortgeschritten">Fortgeschritten</SelectItem>
                          <SelectItem value="Experte">Experte</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="integration-relevant"
                      checked={editForm.is_integration_relevant}
                      onCheckedChange={(checked) => setEditForm({ ...editForm, is_integration_relevant: checked })}
                    />
                    <Label htmlFor="integration-relevant">Relevant für berufliche Integration</Label>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Kommentar</Label>
                    <Textarea
                      value={editForm.coach_comment}
                      onChange={(e) => setEditForm({ ...editForm, coach_comment: e.target.value })}
                      placeholder="Warum ist dieser Skill relevant? In welchem beruflichen Kontext?"
                      rows={3}
                    />
                  </div>
                  
                  <Button onClick={handleUpdateSkill} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Änderungen speichern
                  </Button>
                </div>

                {/* Task Section */}
                <div className="border-t pt-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Aufgaben aus Skill ableiten</h4>
                    <Button variant="outline" size="sm" onClick={() => setTaskDialogOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Neue Aufgabe erstellen
                    </Button>
                  </div>
                  
                  {tasks.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Bestehende Aufgaben des Teilnehmers:</p>
                      <div className="max-h-48 overflow-y-auto space-y-2">
                        {tasks.map((task) => (
                          <div
                            key={task.id}
                            className="flex items-center justify-between p-3 bg-muted rounded-lg"
                          >
                            <div>
                              <p className="font-medium text-sm">{task.title}</p>
                              {task.due_date && (
                                <p className="text-xs text-muted-foreground">
                                  Fällig: {format(new Date(task.due_date), "dd. MMM yyyy", { locale: de })}
                                </p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => linkExistingTask(task.id)}
                            >
                              Verknüpfen
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  Erstellt am {format(new Date(selectedSkill.created_at), "dd. MMMM yyyy", { locale: de })}
                </p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Task Dialog */}
      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aufgabe aus Skill erstellen</DialogTitle>
            <DialogDescription>
              Diese Aufgabe wird automatisch mit dem Skill verknüpft und dem Teilnehmer zugewiesen.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Titel *</Label>
              <Input
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                placeholder="Aufgabentitel"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Beschreibung</Label>
              <Textarea
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                placeholder="Was soll gemacht werden?"
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Ziel</Label>
              <Input
                value={taskForm.goal}
                onChange={(e) => setTaskForm({ ...taskForm, goal: e.target.value })}
                placeholder="z.B. Vertiefung, Transfer, Dokumentation"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Fälligkeitsdatum</Label>
              <Input
                type="date"
                value={taskForm.due_date}
                onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setTaskDialogOpen(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleCreateTask} disabled={isSubmitting || !taskForm.title}>
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Aufgabe erstellen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSkills;
