import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Download, FileText, Filter } from "lucide-react";
import { toast } from "sonner";
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
  created_at: string;
}

const Documents = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocs, setFilteredDocs] = useState<Document[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  const categories = [
    { value: "all", label: "Alle Kategorien" },
    { value: "digitalitaet", label: "Digitalität" },
    { value: "gestaltung", label: "Gestaltung" },
    { value: "marketing", label: "Marketing" },
    { value: "ki", label: "KI & Technologie" },
    { value: "allgemein", label: "Allgemein" },
  ];

  useEffect(() => {
    const fetchDocuments = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .or(`visibility.eq.public,assigned_to.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (error) {
        toast.error("Fehler beim Laden der Dokumente");
        return;
      }

      setDocuments(data || []);
      setFilteredDocs(data || []);
      setLoading(false);
    };

    fetchDocuments();
  }, []);

  useEffect(() => {
    if (selectedCategory === "all") {
      setFilteredDocs(documents);
    } else {
      setFilteredDocs(documents.filter(doc => doc.category === selectedCategory));
    }
  }, [selectedCategory, documents]);

  const getCategoryColor = (category: string | null) => {
    switch (category) {
      case "digitalitaet": return "bg-primary/10 text-primary";
      case "gestaltung": return "bg-secondary/10 text-secondary";
      case "marketing": return "bg-accent/10 text-accent";
      case "ki": return "bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300";
      default: return "bg-muted text-muted-foreground";
    }
  };

  if (loading) return <div className="p-8">Lädt...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dokumente & Unterlagen</h1>
          <p className="text-muted-foreground">Alle Lernmaterialien an einem Ort</p>
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-64">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categories.map(cat => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4">
        {filteredDocs.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="p-8 text-center text-muted-foreground">
              {selectedCategory === "all" 
                ? "Noch keine Dokumente vorhanden"
                : "Keine Dokumente in dieser Kategorie"}
            </CardContent>
          </Card>
        ) : (
          filteredDocs.map((doc) => (
            <Card key={doc.id} className="shadow-card hover:shadow-glow transition-all">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">{doc.title}</CardTitle>
                      {doc.description && (
                        <CardDescription className="text-base">
                          {doc.description}
                        </CardDescription>
                      )}
                      <div className="flex items-center gap-2 mt-3">
                        {doc.category && (
                          <Badge className={getCategoryColor(doc.category)}>
                            {categories.find(c => c.value === doc.category)?.label || doc.category}
                          </Badge>
                        )}
                        <span className="text-sm text-muted-foreground">
                          {new Date(doc.created_at).toLocaleDateString("de-CH")}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button asChild>
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                      <Download className="w-4 h-4 mr-2" />
                      Öffnen
                    </a>
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default Documents;
