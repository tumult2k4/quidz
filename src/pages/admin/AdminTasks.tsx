import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Users, Trash2, X, Upload, Link as LinkIcon, Image as ImageIcon, File, Edit } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Task {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: string;
  priority: string;
  category: string | null;
  assigned_to: string | null;
  assign_to_all: boolean;
  links: string[];
  image_url: string | null;
  file_url: string | null;
  profiles?: { full_name: string | null };
}

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
}

const AdminTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [linkInput, setLinkInput] = useState("");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    due_date: "",
    priority: "medium",
    category: "",
    assigned_to: "",
    assign_to_all: false,
    links: [] as string[],
    image_url: "",
    file_url: "",
  });

  const fetchData = async () => {
    const [tasksRes, usersRes] = await Promise.all([
      supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("id, full_name, email"),
    ]);

    if (tasksRes.error) {
      toast.error("Fehler beim Laden der Aufgaben");
      console.error("Tasks error:", tasksRes.error);
      return;
    }
    if (usersRes.error) {
      toast.error("Fehler beim Laden der User");
      console.error("Users error:", usersRes.error);
      return;
    }

    const profilesMap = new Map(
      (usersRes.data || []).map(profile => [profile.id, profile])
    );

    const tasksWithProfiles = (tasksRes.data || []).map(task => ({
      ...task,
      profiles: task.assigned_to ? profilesMap.get(task.assigned_to) : null,
    }));

    setTasks(tasksWithProfiles);
    setUsers(usersRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Bitte nur Bilddateien hochladen");
      return;
    }

    setUploading(true);
    const fileExt = file.name.split(".").pop();
    const fileName = `${Math.random()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("project-images")
      .upload(fileName, file);

    if (uploadError) {
      toast.error("Fehler beim Hochladen");
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("project-images")
      .getPublicUrl(fileName);

    setFormData({ ...formData, image_url: publicUrl });
    setUploading(false);
    toast.success("Bild hochgeladen");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const fileExt = file.name.split(".").pop();
    const fileName = `${Math.random()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(fileName, file);

    if (uploadError) {
      toast.error("Fehler beim Hochladen");
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("documents")
      .getPublicUrl(fileName);

    setFormData({ ...formData, file_url: publicUrl });
    setUploading(false);
    toast.success("Datei hochgeladen");
  };

  const addLink = () => {
    if (linkInput.trim() && !formData.links.includes(linkInput.trim())) {
      setFormData({ ...formData, links: [...formData.links, linkInput.trim()] });
      setLinkInput("");
    }
  };

  const removeLink = (link: string) => {
    setFormData({ ...formData, links: formData.links.filter(l => l !== link) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (editingTask) {
      // Update existing task
      const { error } = await supabase
        .from("tasks")
        .update({
          title: formData.title,
          description: formData.description || null,
          due_date: formData.due_date || null,
          priority: formData.priority,
          category: formData.category || null,
          links: formData.links,
          image_url: formData.image_url || null,
          file_url: formData.file_url || null,
        })
        .eq("id", editingTask.id);

      if (error) {
        toast.error("Fehler beim Aktualisieren der Aufgabe");
        return;
      }
      toast.success("Aufgabe erfolgreich aktualisiert");
    } else if (formData.assign_to_all) {
      // Bulk insert for all users
      const tasksToInsert = users.map(u => ({
        title: formData.title,
        description: formData.description || null,
        due_date: formData.due_date || null,
        priority: formData.priority,
        category: formData.category || null,
        assigned_to: u.id,
        assign_to_all: true,
        links: formData.links,
        image_url: formData.image_url || null,
        file_url: formData.file_url || null,
        created_by: user.id,
        status: "open",
      }));

      const { error } = await supabase.from("tasks").insert(tasksToInsert);
      if (error) {
        toast.error("Fehler beim Erstellen der Aufgaben");
        return;
      }
      toast.success(`Aufgabe an ${users.length} Teilnehmer zugewiesen`);
    } else {
      const { error } = await supabase.from("tasks").insert({
        title: formData.title,
        description: formData.description || null,
        due_date: formData.due_date || null,
        priority: formData.priority,
        category: formData.category || null,
        assigned_to: formData.assigned_to || null,
        assign_to_all: false,
        links: formData.links,
        image_url: formData.image_url || null,
        file_url: formData.file_url || null,
        created_by: user.id,
        status: "open",
      });

      if (error) {
        toast.error("Fehler beim Erstellen der Aufgabe");
        return;
      }
      toast.success("Aufgabe erfolgreich erstellt");
    }

    setIsDialogOpen(false);
    setEditingTask(null);
    setFormData({
      title: "",
      description: "",
      due_date: "",
      priority: "medium",
      category: "",
      assigned_to: "",
      assign_to_all: false,
      links: [],
      image_url: "",
      file_url: "",
    });
    setLinkInput("");
    fetchData();
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) {
      toast.error("Fehler beim Löschen");
      return;
    }
    toast.success("Aufgabe gelöscht");
    fetchData();
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || "",
      due_date: task.due_date || "",
      priority: task.priority,
      category: task.category || "",
      assigned_to: task.assigned_to || "",
      assign_to_all: task.assign_to_all,
      links: task.links || [],
      image_url: task.image_url || "",
      file_url: task.file_url || "",
    });
    setIsDialogOpen(true);
  };

  if (loading) return <div className="p-8">Lädt...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Aufgabenverwaltung</h1>
          <p className="text-muted-foreground">Erstellen und verwalten Sie Aufgaben</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingTask(null);
            setFormData({
              title: "",
              description: "",
              due_date: "",
              priority: "medium",
              category: "",
              assigned_to: "",
              assign_to_all: false,
              links: [],
              image_url: "",
              file_url: "",
            });
            setLinkInput("");
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Neue Aufgabe
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTask ? "Aufgabe bearbeiten" : "Neue Aufgabe erstellen"}</DialogTitle>
              <DialogDescription>
                {editingTask ? "Bearbeiten Sie die Aufgabe" : "Erstellen Sie eine neue Aufgabe für Teilnehmende"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Titel *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Beschreibung</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="due_date">Fälligkeitsdatum</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">Priorität</Label>
                  <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Niedrig</SelectItem>
                      <SelectItem value="medium">Mittel</SelectItem>
                      <SelectItem value="high">Hoch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Kategorie</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="z.B. Digitalität"
                />
              </div>

              {!editingTask && (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="assign_to_all"
                        checked={formData.assign_to_all}
                        onCheckedChange={(checked) => setFormData({ ...formData, assign_to_all: checked as boolean, assigned_to: "" })}
                      />
                      <Label htmlFor="assign_to_all" className="cursor-pointer">
                        An alle Teilnehmer zuweisen
                      </Label>
                    </div>
                  </div>

                  {!formData.assign_to_all && (
                    <div className="space-y-2">
                      <Label htmlFor="assigned_to">Zugewiesen an</Label>
                      <Select value={formData.assigned_to} onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Wählen Sie einen User" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.full_name || user.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </>
              )}

              <div className="space-y-2">
                <Label>Links</Label>
                <div className="flex gap-2">
                  <Input
                    value={linkInput}
                    onChange={(e) => setLinkInput(e.target.value)}
                    placeholder="https://..."
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addLink())}
                  />
                  <Button type="button" onClick={addLink} variant="outline">
                    <LinkIcon className="w-4 h-4 mr-1" />
                    Hinzufügen
                  </Button>
                </div>
                {formData.links.length > 0 && (
                  <div className="space-y-1 mt-2">
                    {formData.links.map((link, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 border rounded">
                        <LinkIcon className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm flex-1 truncate">{link}</span>
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeLink(link)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bild (optional)</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploading}
                  />
                  {formData.image_url && (
                    <div className="relative w-20 h-20">
                      <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover rounded" />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 w-6 h-6"
                        onClick={() => setFormData({ ...formData, image_url: "" })}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Datei (optional)</Label>
                  <Input
                    type="file"
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                  {formData.file_url && (
                    <div className="flex items-center gap-2 p-2 border rounded">
                      <File className="w-4 h-4" />
                      <span className="text-sm flex-1 truncate">Datei hochgeladen</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setFormData({ ...formData, file_url: "" })}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1" disabled={uploading}>
                  {editingTask ? "Änderungen speichern" : "Aufgabe erstellen"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Abbrechen
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {tasks.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="p-8 text-center text-muted-foreground">
              Noch keine Aufgaben vorhanden
            </CardContent>
          </Card>
        ) : (
          tasks.map((task) => (
            <Card key={task.id} className="shadow-card">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-2">{task.title}</CardTitle>
                    {task.description && (
                      <CardDescription className="mb-3">{task.description}</CardDescription>
                    )}
                    <div className="flex flex-wrap gap-2 mb-3">
                      <Badge variant={task.status === "completed" ? "default" : "outline"}>
                        {task.status === "completed" ? "Erledigt" : task.status === "in_progress" ? "In Arbeit" : "Offen"}
                      </Badge>
                      <Badge variant={task.priority === "high" ? "destructive" : "secondary"}>
                        {task.priority === "high" ? "Hoch" : task.priority === "medium" ? "Mittel" : "Niedrig"}
                      </Badge>
                      {task.assign_to_all ? (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          Alle Teilnehmer
                        </Badge>
                      ) : task.profiles?.full_name && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {task.profiles.full_name}
                        </Badge>
                      )}
                    </div>
                    {task.links && task.links.length > 0 && (
                      <div className="space-y-1 mb-2">
                        {task.links.map((link, idx) => (
                          <a key={idx} href={link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-primary hover:underline">
                            <LinkIcon className="w-3 h-3" />
                            {link}
                          </a>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2 flex-wrap">
                      {task.image_url && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <ImageIcon className="w-3 h-3" />
                          Bild
                        </Badge>
                      )}
                      {task.file_url && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <File className="w-3 h-3" />
                          Datei
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEditTask(task)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => deleteTask(task.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminTasks;
