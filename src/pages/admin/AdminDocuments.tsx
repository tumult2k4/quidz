import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Upload, FileText } from "lucide-react";
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

interface Document {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  category: string | null;
  visibility: string;
  created_at: string;
}

const AdminDocuments = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "allgemein",
    visibility: "public",
    file_url: "",
  });

  const categories = [
    { value: "digitalitaet", label: "Digitalität" },
    { value: "gestaltung", label: "Gestaltung" },
    { value: "marketing", label: "Marketing" },
    { value: "ki", label: "KI & Technologie" },
    { value: "allgemein", label: "Allgemein" },
  ];

  const fetchDocuments = async () => {
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Fehler beim Laden der Dokumente");
      return;
    }

    setDocuments(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const fileExt = file.name.split(".").pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(filePath, file);

    if (uploadError) {
      toast.error("Fehler beim Hochladen der Datei");
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from("documents").getPublicUrl(filePath);
    setFormData({ ...formData, file_url: data.publicUrl });
    setUploading(false);
    toast.success("Datei erfolgreich hochgeladen");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (!formData.file_url) {
      toast.error("Bitte laden Sie eine Datei hoch");
      return;
    }

    const { error } = await supabase.from("documents").insert({
      title: formData.title,
      description: formData.description || null,
      file_url: formData.file_url,
      category: formData.category,
      visibility: formData.visibility,
      created_by: user.id,
    });

    if (error) {
      toast.error("Fehler beim Erstellen des Dokuments");
      return;
    }

    toast.success("Dokument erfolgreich erstellt");
    setIsDialogOpen(false);
    setFormData({
      title: "",
      description: "",
      category: "allgemein",
      visibility: "public",
      file_url: "",
    });
    fetchDocuments();
  };

  const deleteDocument = async (id: string) => {
    const { error } = await supabase.from("documents").delete().eq("id", id);
    if (error) {
      toast.error("Fehler beim Löschen");
      return;
    }
    toast.success("Dokument gelöscht");
    fetchDocuments();
  };

  if (loading) return <div className="p-8">Lädt...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dokumentenverwaltung</h1>
          <p className="text-muted-foreground">Hochladen und verwalten Sie Lernmaterialien</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Neues Dokument
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Neues Dokument hochladen</DialogTitle>
              <DialogDescription>Fügen Sie ein neues Lernmaterial hinzu</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="file">Datei *</Label>
                <Input
                  id="file"
                  type="file"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  required={!formData.file_url}
                />
                {uploading && <p className="text-sm text-muted-foreground">Wird hochgeladen...</p>}
                {formData.file_url && <p className="text-sm text-secondary">✓ Datei hochgeladen</p>}
              </div>
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
                <Label htmlFor="category">Kategorie</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="visibility">Sichtbarkeit</Label>
                <Select value={formData.visibility} onValueChange={(value) => setFormData({ ...formData, visibility: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Öffentlich (alle Teilnehmende)</SelectItem>
                    <SelectItem value="individual">Individuell</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1" disabled={uploading}>
                  Dokument erstellen
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
        {documents.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="p-8 text-center text-muted-foreground">
              Noch keine Dokumente vorhanden
            </CardContent>
          </Card>
        ) : (
          documents.map((doc) => (
            <Card key={doc.id} className="shadow-card">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">{doc.title}</CardTitle>
                      {doc.description && (
                        <CardDescription className="mb-3">{doc.description}</CardDescription>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {doc.category && (
                          <Badge>
                            {categories.find((c) => c.value === doc.category)?.label || doc.category}
                          </Badge>
                        )}
                        <Badge variant={doc.visibility === "public" ? "default" : "outline"}>
                          {doc.visibility === "public" ? "Öffentlich" : "Individuell"}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {new Date(doc.created_at).toLocaleDateString("de-CH")}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild variant="outline" size="sm">
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                        Öffnen
                      </a>
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => deleteDocument(doc.id)}>
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

export default AdminDocuments;
