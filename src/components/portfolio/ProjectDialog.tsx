import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Upload, X, Link2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

interface Project {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  image_url: string | null;
  project_url: string | null;
  featured: boolean;
  published: boolean;
}

interface Skill {
  id: string;
  title: string;
  category: string;
  status: string;
}

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
  onSuccess: () => void;
}

const skillCategoryLabels: Record<string, string> = {
  fachkompetenz: "Fachkompetenz",
  methodenkompetenz: "Methodenkompetenz",
  sozialkompetenz: "Sozialkompetenz",
  selbstkompetenz: "Selbstkompetenz",
  sonstiges: "Sonstiges",
};

export function ProjectDialog({ open, onOpenChange, project, onSuccess }: ProjectDialogProps) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "other",
    project_url: "",
    published: true,
    featured: false,
  });
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchUserSkills();
    }
  }, [open]);

  useEffect(() => {
    if (project) {
      setFormData({
        title: project.title,
        description: project.description || "",
        category: project.category,
        project_url: project.project_url || "",
        published: project.published,
        featured: project.featured,
      });
      setTags(project.tags || []);
      setImageUrl(project.image_url);
      fetchProjectSkills(project.id);
    } else {
      resetForm();
    }
  }, [project, open]);

  const fetchUserSkills = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("skills")
        .select("id, title, category, status")
        .eq("user_id", user.id)
        .order("title");

      if (error) throw error;
      setAvailableSkills(data || []);
    } catch (error) {
      console.error("Error fetching skills:", error);
    }
  };

  const fetchProjectSkills = async (projectId: string) => {
    try {
      const { data, error } = await supabase
        .from("project_skills")
        .select("skill_id")
        .eq("project_id", projectId);

      if (error) throw error;
      setSelectedSkillIds(data?.map(ps => ps.skill_id) || []);
    } catch (error) {
      console.error("Error fetching project skills:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      category: "other",
      project_url: "",
      published: true,
      featured: false,
    });
    setTags([]);
    setTagInput("");
    setImageUrl(null);
    setSelectedSkillIds([]);
  };

  const toggleSkill = (skillId: string) => {
    setSelectedSkillIds(prev =>
      prev.includes(skillId)
        ? prev.filter(id => id !== skillId)
        : [...prev, skillId]
    );
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Ungültiger Dateityp",
        description: "Nur JPEG, PNG und WebP sind erlaubt.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10485760) {
      toast({
        title: "Datei zu groß",
        description: "Maximale Dateigröße: 10MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('project-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('project-images')
        .getPublicUrl(filePath);

      setImageUrl(publicUrl);
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Fehler",
        description: "Bild konnte nicht hochgeladen werden.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const addTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !tags.includes(trimmedTag) && tags.length < 5) {
      setTags([...tags, trimmedTag]);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const updateProjectSkills = async (projectId: string) => {
    // Delete existing skill links
    await supabase
      .from("project_skills")
      .delete()
      .eq("project_id", projectId);

    // Insert new skill links
    if (selectedSkillIds.length > 0) {
      const skillLinks = selectedSkillIds.map(skillId => ({
        project_id: projectId,
        skill_id: skillId,
      }));
      await supabase.from("project_skills").insert(skillLinks);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast({
        title: "Fehler",
        description: "Titel ist erforderlich.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const projectData = {
        title: formData.title,
        description: formData.description,
        category: formData.category as any,
        project_url: formData.project_url || null,
        published: formData.published,
        featured: formData.featured,
        tags,
        image_url: imageUrl,
        user_id: user.id,
      };

      let projectId: string;

      if (project) {
        const { error } = await supabase
          .from("projects")
          .update(projectData)
          .eq("id", project.id);
        if (error) throw error;
        projectId = project.id;
      } else {
        const { data, error } = await supabase
          .from("projects")
          .insert([projectData])
          .select("id")
          .single();
        if (error) throw error;
        projectId = data.id;
      }

      // Update skill links
      await updateProjectSkills(projectId);

      toast({
        title: "Erfolg",
        description: project ? "Projekt aktualisiert." : "Projekt erstellt.",
      });
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving project:", error);
      toast({
        title: "Fehler",
        description: "Projekt konnte nicht gespeichert werden.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const categoryLabels: Record<string, string> = {
    web_development: "Web Development",
    mobile_app: "Mobile App",
    design: "Design",
    data_science: "Data Science",
    machine_learning: "Machine Learning",
    other: "Sonstiges",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {project ? "Projekt bearbeiten" : "Neues Projekt"}
          </DialogTitle>
          <DialogDescription>
            Fügen Sie Ihr Projekt zu Ihrem Portfolio hinzu.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label>Projektbild</Label>
            <div className="flex items-center gap-4">
              {imageUrl && (
                <div className="relative w-32 h-32 rounded-lg overflow-hidden">
                  <img src={imageUrl} alt="Project" className="w-full h-full object-cover" />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1"
                    onClick={() => setImageUrl(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
              <Label htmlFor="image-upload" className="cursor-pointer">
                <div className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-accent">
                  <Upload className="w-4 h-4" />
                  {uploading ? "Wird hochgeladen..." : "Bild hochladen"}
                </div>
                <Input
                  id="image-upload"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleImageUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Titel *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Mein tolles Projekt"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Beschreibung</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Beschreiben Sie Ihr Projekt..."
              rows={4}
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
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (max. 5)</Label>
            <div className="flex gap-2">
              <Input
                id="tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="React, TypeScript, etc."
                disabled={tags.length >= 5}
              />
              <Button type="button" onClick={addTag} disabled={tags.length >= 5}>
                Hinzufügen
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Skills linking section */}
          {availableSkills.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Link2 className="w-4 h-4" />
                Verknüpfte Kompetenzen
              </Label>
              <p className="text-sm text-muted-foreground">
                Wählen Sie Kompetenzen aus, die Sie mit diesem Projekt nachweisen.
              </p>
              <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                {availableSkills.map((skill) => (
                  <div key={skill.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`skill-${skill.id}`}
                      checked={selectedSkillIds.includes(skill.id)}
                      onCheckedChange={() => toggleSkill(skill.id)}
                    />
                    <label
                      htmlFor={`skill-${skill.id}`}
                      className="flex-1 text-sm cursor-pointer flex items-center gap-2"
                    >
                      {skill.title}
                      <Badge variant="outline" className="text-xs">
                        {skillCategoryLabels[skill.category] || skill.category}
                      </Badge>
                    </label>
                  </div>
                ))}
              </div>
              {selectedSkillIds.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedSkillIds.length} Kompetenz(en) ausgewählt
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="project_url">Projekt-URL</Label>
            <Input
              id="project_url"
              type="url"
              value={formData.project_url}
              onChange={(e) => setFormData({ ...formData, project_url: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                id="published"
                checked={formData.published}
                onCheckedChange={(checked) => setFormData({ ...formData, published: checked })}
              />
              <Label htmlFor="published" className="cursor-pointer">
                Öffentlich sichtbar
              </Label>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Wird gespeichert..." : project ? "Aktualisieren" : "Erstellen"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}