import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Loader2, FileText, Image, Video, File, Trash2, Eye, CheckCircle, Clock, XCircle, Star } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface Skill {
  id: string;
  title: string;
  description: string;
  category: string;
  proof_text: string | null;
  proof_file_url: string | null;
  status: string;
  is_integration_relevant: boolean;
  coach_comment: string | null;
  competence_level: string | null;
  created_at: string;
}

interface SkillTask {
  id: string;
  task_id: string;
  tasks: {
    id: string;
    title: string;
    status: string;
    due_date: string | null;
  };
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

const Skills = () => {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [skillTasks, setSkillTasks] = useState<SkillTask[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "sonstiges",
    proof_text: "",
  });

  useEffect(() => {
    fetchSkills();
  }, []);

  const fetchSkills = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("skills")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Fehler beim Laden der Skills");
      console.error(error);
    } else {
      setSkills(data || []);
    }
    setIsLoading(false);
  };

  const fetchSkillTasks = async (skillId: string) => {
    const { data, error } = await supabase
      .from("skill_tasks")
      .select(`
        id,
        task_id,
        tasks (
          id,
          title,
          status,
          due_date
        )
      `)
      .eq("skill_id", skillId);

    if (error) {
      console.error(error);
    } else {
      setSkillTasks(data as unknown as SkillTask[] || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nicht angemeldet");

      let proofFileUrl = null;
      
      if (proofFile) {
        const fileExt = proofFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError, data: uploadData } = await supabase.storage
          .from("skill-proofs")
          .upload(fileName, proofFile);

        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from("skill-proofs")
          .getPublicUrl(fileName);
        
        proofFileUrl = publicUrl;
      }

      const { error } = await supabase
        .from("skills")
        .insert({
          user_id: user.id,
          title: formData.title,
          description: formData.description,
          category: formData.category as "handwerk" | "digital" | "sozial" | "kreativ" | "sonstiges",
          proof_text: formData.proof_text || null,
          proof_file_url: proofFileUrl,
        });

      if (error) throw error;

      toast.success("Skill erfolgreich vorgeschlagen!");
      setDialogOpen(false);
      setFormData({ title: "", description: "", category: "sonstiges", proof_text: "" });
      setProofFile(null);
      fetchSkills();
    } catch (error: any) {
      toast.error("Fehler beim Erstellen des Skills: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSkill = async (skillId: string) => {
    if (!confirm("Möchtest du diesen Skill wirklich löschen?")) return;

    const { error } = await supabase
      .from("skills")
      .delete()
      .eq("id", skillId);

    if (error) {
      toast.error("Fehler beim Löschen des Skills");
    } else {
      toast.success("Skill gelöscht");
      fetchSkills();
    }
  };

  const openDetailDialog = async (skill: Skill) => {
    setSelectedSkill(skill);
    await fetchSkillTasks(skill.id);
    setDetailDialogOpen(true);
  };

  const getFileIcon = (url: string | null) => {
    if (!url) return null;
    const ext = url.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return <Image className="w-4 h-4" />;
    if (['mp4', 'webm', 'mov'].includes(ext || '')) return <Video className="w-4 h-4" />;
    if (['pdf', 'doc', 'docx'].includes(ext || '')) return <FileText className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

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
          <h1 className="text-3xl font-bold">Meine Skills</h1>
          <p className="text-muted-foreground">Verwalte und teile deine Fähigkeiten</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Skill vorschlagen
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Neuen Skill vorschlagen</DialogTitle>
              <DialogDescription>
                Beschreibe einen Skill, den du beherrschst
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Skill-Titel *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="z.B. Vollkornbrot mit Sauerteig backen"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Beschreibung *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Was kannst du konkret? Unter welchen Bedingungen?"
                  rows={4}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="category">Kategorie</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="proof_text">Nachweis (optional)</Label>
                <Textarea
                  id="proof_text"
                  value={formData.proof_text}
                  onChange={(e) => setFormData({ ...formData, proof_text: e.target.value })}
                  placeholder="Beschreibe deinen Nachweis oder Erfahrung..."
                  rows={2}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="proof_file">Datei hochladen (optional)</Label>
                <Input
                  id="proof_file"
                  type="file"
                  onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                  accept="image/*,video/*,.pdf,.doc,.docx"
                />
                <p className="text-xs text-muted-foreground">
                  Unterstützte Formate: Bilder, Videos, PDF, Word
                </p>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Abbrechen
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Skill vorschlagen
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {skills.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Du hast noch keine Skills eingereicht. Klicke auf "Skill vorschlagen" um zu beginnen.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {skills.map((skill) => (
            <Card key={skill.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-2">
                  <CardTitle className="text-lg line-clamp-2">{skill.title}</CardTitle>
                  <Badge variant="secondary" className="shrink-0">
                    {categoryLabels[skill.category] || skill.category}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`${statusColors[skill.status]} flex items-center gap-1`}>
                    {statusIcons[skill.status]}
                    {statusLabels[skill.status] || skill.status}
                  </Badge>
                  {skill.is_integration_relevant && (
                    <Badge variant="outline" className="text-purple-600 border-purple-300">
                      <Star className="w-3 h-3 mr-1" />
                      Integrationsrelevant
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                  {skill.description}
                </p>
                
                {skill.proof_file_url && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    {getFileIcon(skill.proof_file_url)}
                    <span>Nachweis vorhanden</span>
                  </div>
                )}
                
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(skill.created_at), "dd. MMM yyyy", { locale: de })}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDetailDialog(skill)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    {skill.status === "in_pruefung" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteSkill(skill.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Skill Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          {selectedSkill && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedSkill.title}
                  <Badge variant="secondary">
                    {categoryLabels[selectedSkill.category]}
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  Skill-Details und zugehörige Aufgaben
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6">
                <div className="flex items-center gap-2">
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
                  {selectedSkill.competence_level && (
                    <Badge variant="outline">
                      {selectedSkill.competence_level}
                    </Badge>
                  )}
                </div>

                <div>
                  <h4 className="font-medium mb-2">Beschreibung</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedSkill.description}
                  </p>
                </div>

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

                {selectedSkill.coach_comment && (
                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Coach-Kommentar</h4>
                    <p className="text-sm whitespace-pre-wrap">
                      {selectedSkill.coach_comment}
                    </p>
                  </div>
                )}

                {skillTasks.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Zugehörige Aufgaben</h4>
                    <div className="space-y-2">
                      {skillTasks.map((st) => (
                        <div
                          key={st.id}
                          className="flex items-center justify-between p-3 bg-muted rounded-lg"
                        >
                          <div>
                            <p className="font-medium">{st.tasks.title}</p>
                            {st.tasks.due_date && (
                              <p className="text-xs text-muted-foreground">
                                Fällig: {format(new Date(st.tasks.due_date), "dd. MMM yyyy", { locale: de })}
                              </p>
                            )}
                          </div>
                          <Badge variant={st.tasks.status === "done" ? "default" : "secondary"}>
                            {st.tasks.status === "done" ? "Erledigt" : st.tasks.status === "in_progress" ? "In Bearbeitung" : "Offen"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Erstellt am {format(new Date(selectedSkill.created_at), "dd. MMMM yyyy", { locale: de })}
                </p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Skills;
