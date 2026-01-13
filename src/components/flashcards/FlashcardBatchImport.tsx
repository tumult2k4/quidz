import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
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
import { Upload, HelpCircle, FileJson, CheckCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface Category {
  id: string;
  name: string;
}

interface FlashcardBatchImportProps {
  categories: Category[];
  onSuccess: () => void;
}

interface ImportCard {
  front_text: string;
  back_text: string;
  is_public?: boolean;
}

export function FlashcardBatchImport({ categories, onSuccess }: FlashcardBatchImportProps) {
  const { toast } = useToast();
  const [jsonInput, setJsonInput] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const exampleJson = `[
  {
    "front_text": "Was ist React?",
    "back_text": "Eine JavaScript-Bibliothek für Benutzeroberflächen"
  },
  {
    "front_text": "Was ist TypeScript?",
    "back_text": "Eine typisierte Erweiterung von JavaScript",
    "is_public": true
  }
]`;

  const handleImport = async () => {
    if (!jsonInput.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte gib JSON-Daten ein.",
        variant: "destructive",
      });
      return;
    }

    let cards: ImportCard[];
    try {
      cards = JSON.parse(jsonInput);
      if (!Array.isArray(cards)) {
        throw new Error("JSON muss ein Array sein");
      }
    } catch (error) {
      toast({
        title: "Ungültiges JSON",
        description: "Bitte überprüfe die JSON-Struktur.",
        variant: "destructive",
      });
      return;
    }

    // Validate cards
    const invalidCards = cards.filter(
      (card) => !card.front_text?.trim() || !card.back_text?.trim()
    );
    if (invalidCards.length > 0) {
      toast({
        title: "Ungültige Karten",
        description: `${invalidCards.length} Karte(n) haben keine gültige Vorder- oder Rückseite.`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nicht authentifiziert");

      const flashcardsToInsert = cards.map((card) => ({
        front_text: card.front_text.trim(),
        back_text: card.back_text.trim(),
        category_id: categoryId || null,
        is_public: card.is_public ?? isPublic,
        created_by: user.id,
      }));

      const { error } = await supabase
        .from("flashcards")
        .insert(flashcardsToInsert);

      if (error) throw error;

      toast({
        title: "Erfolg",
        description: `${cards.length} Lernkarte(n) wurden importiert.`,
      });

      setJsonInput("");
      setCategoryId("");
      onSuccess();
    } catch (error: any) {
      console.error("Error importing flashcards:", error);
      toast({
        title: "Fehler beim Import",
        description: error.message || "Karten konnten nicht importiert werden.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setJsonInput(content);
    };
    reader.readAsText(file);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Batch Import
          </span>
          <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <HelpCircle className="w-5 h-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileJson className="w-5 h-5" />
                  JSON-Struktur für Import
                </DialogTitle>
                <DialogDescription>
                  Importiere mehrere Lernkarten auf einmal mit einer JSON-Datei
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Erforderliche Felder:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li><code className="bg-muted px-1 rounded">front_text</code> - Der Text auf der Vorderseite (Frage)</li>
                    <li><code className="bg-muted px-1 rounded">back_text</code> - Der Text auf der Rückseite (Antwort)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Optionale Felder:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li><code className="bg-muted px-1 rounded">is_public</code> - Boolean (true/false) für öffentliche Karten</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Beispiel:</h4>
                  <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                    {exampleJson}
                  </pre>
                </div>
                <div className="flex items-start gap-2 p-3 bg-primary/10 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-primary mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">Tipps:</p>
                    <ul className="list-disc list-inside text-muted-foreground mt-1">
                      <li>Kategorie kann global für alle Karten ausgewählt werden</li>
                      <li>Standard-Sichtbarkeit gilt für Karten ohne is_public</li>
                      <li>JSON-Datei (.json) kann direkt hochgeladen werden</li>
                    </ul>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Kategorie (für alle Karten)</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Kategorie wählen (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Keine Kategorie</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Standard-Sichtbarkeit</Label>
            <div className="flex items-center gap-2 h-10">
              <Switch checked={isPublic} onCheckedChange={setIsPublic} />
              <span className="text-sm text-muted-foreground">
                {isPublic ? "Öffentlich" : "Privat"}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label>JSON-Daten</Label>
          <Textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder={exampleJson}
            className="min-h-[200px] font-mono text-sm"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleImport} disabled={loading}>
            <Upload className="w-4 h-4 mr-2" />
            {loading ? "Importiere..." : "Importieren"}
          </Button>
          <div className="relative">
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <Button variant="outline">
              <FileJson className="w-4 h-4 mr-2" />
              JSON-Datei laden
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}