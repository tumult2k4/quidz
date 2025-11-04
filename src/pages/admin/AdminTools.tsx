import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Wrench } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Tool {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  web_link: string;
  created_at: string;
}

const AdminTools = () => {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    web_link: "",
    image_url: "",
  });

  const fetchTools = async () => {
    const { data, error } = await supabase
      .from("tools")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Fehler beim Laden der Werkzeuge");
      console.error(error);
      return;
    }

    setTools(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchTools();
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Bitte nur Bilddateien hochladen");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Bild darf maximal 5MB groß sein");
      return;
    }

    setUploading(true);
    const fileExt = file.name.split(".").pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("project-images")
      .upload(filePath, file);

    if (uploadError) {
      toast.error("Fehler beim Hochladen");
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("project-images")
      .getPublicUrl(filePath);

    setFormData({ ...formData, image_url: publicUrl });
    setUploading(false);
    toast.success("Bild hochgeladen");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("tools").insert({
      title: formData.title,
      description: formData.description || null,
      web_link: formData.web_link,
      image_url: formData.image_url || null,
      created_by: user.id,
    });

    if (error) {
      toast.error("Fehler beim Erstellen des Werkzeugs");
      return;
    }

    toast.success("Werkzeug erfolgreich erstellt");
    setIsDialogOpen(false);
    setFormData({ title: "", description: "", web_link: "", image_url: "" });
    fetchTools();
  };

  const deleteTool = async (id: string) => {
    const { error } = await supabase.from("tools").delete().eq("id", id);
    if (error) {
      toast.error("Fehler beim Löschen");
      return;
    }
    toast.success("Werkzeug gelöscht");
    fetchTools();
  };

  if (loading) return <div className="p-8">Lädt...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Werkzeuge verwalten</h1>
          <p className="text-muted-foreground">Erstellen und verwalten Sie Werkzeuge</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Neues Werkzeug
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Neues Werkzeug erstellen</DialogTitle>
              <DialogDescription>Erstellen Sie ein neues Werkzeug für Teilnehmende</DialogDescription>
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
              <div className="space-y-2">
                <Label htmlFor="web_link">Weblink *</Label>
                <Input
                  id="web_link"
                  type="url"
                  value={formData.web_link}
                  onChange={(e) => setFormData({ ...formData, web_link: e.target.value })}
                  placeholder="https://..."
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="image">Bild</Label>
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                />
                {formData.image_url && (
                  <div className="mt-2">
                    <img src={formData.image_url} alt="Preview" className="w-32 h-32 object-cover rounded" />
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1" disabled={uploading}>
                  Werkzeug erstellen
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Abbrechen
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tools.length === 0 ? (
          <Card className="shadow-card col-span-full">
            <CardContent className="p-8 text-center text-muted-foreground">
              Noch keine Werkzeuge vorhanden
            </CardContent>
          </Card>
        ) : (
          tools.map((tool) => (
            <Card key={tool.id} className="shadow-card">
              <CardHeader>
                {tool.image_url && (
                  <img src={tool.image_url} alt={tool.title} className="w-full h-32 object-cover rounded mb-2" />
                )}
                <CardTitle className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-primary" />
                    {tool.title}
                  </span>
                  <Button variant="destructive" size="sm" onClick={() => deleteTool(tool.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardTitle>
                {tool.description && (
                  <CardDescription>{tool.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <a href={tool.web_link} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="w-full">
                    Werkzeug öffnen
                  </Button>
                </a>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminTools;
