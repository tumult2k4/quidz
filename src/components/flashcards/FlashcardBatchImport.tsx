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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Upload, HelpCircle, FileJson, CheckCircle, FileSpreadsheet } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import Papa from "papaparse";

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
  category?: string; // Category name or ID
}

export function FlashcardBatchImport({ categories, onSuccess }: FlashcardBatchImportProps) {
  const { toast } = useToast();
  const [jsonInput, setJsonInput] = useState("");
  const [csvInput, setCsvInput] = useState("");
  const [categoryId, setCategoryId] = useState<string>("none");
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [importFormat, setImportFormat] = useState<"json" | "csv">("json");

  const exampleJson = `[
  {
    "front_text": "Was ist React?",
    "back_text": "Eine JavaScript-Bibliothek für Benutzeroberflächen",
    "category": "Digital Skills"
  },
  {
    "front_text": "Was ist TypeScript?",
    "back_text": "Eine typisierte Erweiterung von JavaScript",
    "category": "Programmierung",
    "is_public": true
  }
]`;

  const exampleCsv = `front_text;back_text;category;is_public
Was ist React?;Eine JavaScript-Bibliothek für Benutzeroberflächen;Digital Skills;
Was ist TypeScript?;Eine typisierte Erweiterung von JavaScript;Programmierung;true`;

  const parseCSV = (csvText: string): ImportCard[] => {
    const result = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      delimiter: ";",
    });

    if (result.errors.length > 0) {
      throw new Error(`CSV Parse Error: ${result.errors[0].message}`);
    }

    return result.data.map((row: any) => ({
      front_text: row.front_text || row.Frage || row.vorderseite || "",
      back_text: row.back_text || row.Antwort || row.rückseite || "",
      is_public: row.is_public === "true" || row.is_public === "1" || row.öffentlich === "true",
      category: row.category || row.Kategorie || row.kategorie || "",
    }));
  };

  const handleImport = async () => {
    const inputText = importFormat === "json" ? jsonInput : csvInput;
    
    if (!inputText.trim()) {
      toast({
        title: "Fehler",
        description: `Bitte gib ${importFormat.toUpperCase()}-Daten ein.`,
        variant: "destructive",
      });
      return;
    }

    let cards: ImportCard[];
    try {
      if (importFormat === "json") {
        cards = JSON.parse(inputText);
        if (!Array.isArray(cards)) {
          throw new Error("JSON muss ein Array sein");
        }
      } else {
        cards = parseCSV(inputText);
      }
    } catch (error: any) {
      toast({
        title: `Ungültiges ${importFormat.toUpperCase()}`,
        description: error.message || "Bitte überprüfe die Struktur.",
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

    if (cards.length === 0) {
      toast({
        title: "Keine Karten",
        description: "Es wurden keine gültigen Karten gefunden.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nicht authentifiziert");

      // Build category lookup map (by name and by ID)
      const categoryByName = new Map<string, string>();
      const categoryById = new Set<string>();
      categories.forEach(cat => {
        categoryByName.set(cat.name.toLowerCase(), cat.id);
        categoryById.add(cat.id);
      });

      // Collect unique category names that need to be created
      const categoriesToCreate = new Set<string>();
      cards.forEach(card => {
        if (card.category && card.category.trim()) {
          const catValue = card.category.trim();
          // Check if it doesn't exist as ID or name
          if (!categoryById.has(catValue) && !categoryByName.has(catValue.toLowerCase())) {
            categoriesToCreate.add(catValue);
          }
        }
      });

      // Create missing categories
      if (categoriesToCreate.size > 0) {
        const newCategories = Array.from(categoriesToCreate).map(name => ({
          name,
          created_by: user.id,
        }));

        const { data: createdCategories, error: createError } = await supabase
          .from("categories")
          .insert(newCategories)
          .select("id, name");

        if (createError) {
          console.error("Error creating categories:", createError);
          toast({
            title: "Warnung",
            description: `Einige Kategorien konnten nicht erstellt werden: ${createError.message}`,
            variant: "destructive",
          });
        } else if (createdCategories) {
          // Add newly created categories to the lookup map
          createdCategories.forEach(cat => {
            categoryByName.set(cat.name.toLowerCase(), cat.id);
            categoryById.add(cat.id);
          });
          
          toast({
            title: "Kategorien erstellt",
            description: `${createdCategories.length} neue Kategorie(n) wurden automatisch erstellt.`,
          });
        }
      }

      const flashcardsToInsert = cards.map((card) => {
        // Determine category_id: check if card has category, resolve by name or ID
        let resolvedCategoryId: string | null = null;
        
        if (card.category && card.category.trim()) {
          const catValue = card.category.trim();
          // Check if it's a valid category ID
          if (categoryById.has(catValue)) {
            resolvedCategoryId = catValue;
          } else {
            // Try to find by name (case-insensitive)
            const foundId = categoryByName.get(catValue.toLowerCase());
            if (foundId) {
              resolvedCategoryId = foundId;
            }
          }
        }
        
        // Fall back to global category selection if no per-card category
        if (!resolvedCategoryId && categoryId !== "none") {
          resolvedCategoryId = categoryId;
        }

        return {
          front_text: card.front_text.trim().substring(0, 10000),
          back_text: card.back_text.trim().substring(0, 10000),
          category_id: resolvedCategoryId,
          is_public: card.is_public ?? isPublic,
          created_by: user.id,
        };
      });

      const { error } = await supabase
        .from("flashcards")
        .insert(flashcardsToInsert);

      if (error) throw error;

      toast({
        title: "Erfolg",
        description: `${cards.length} Lernkarte(n) wurden importiert.`,
      });

      setJsonInput("");
      setCsvInput("");
      setCategoryId("none");
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
      
      if (file.name.endsWith(".csv")) {
        setCsvInput(content);
        setImportFormat("csv");
      } else {
        setJsonInput(content);
        setImportFormat("json");
      }
    };
    reader.readAsText(file);
    
    // Reset input so same file can be selected again
    event.target.value = "";
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
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileJson className="w-5 h-5" />
                  Import-Struktur
                </DialogTitle>
                <DialogDescription>
                  Importiere mehrere Lernkarten auf einmal mit JSON oder CSV
                </DialogDescription>
              </DialogHeader>
              <Tabs defaultValue="json" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="json">JSON-Format</TabsTrigger>
                  <TabsTrigger value="csv">CSV-Format</TabsTrigger>
                </TabsList>
                
                <TabsContent value="json" className="space-y-4">
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
                      <li><code className="bg-muted px-1 rounded">category</code> - Kategoriename (wird automatisch erstellt falls nicht vorhanden)</li>
                      <li><code className="bg-muted px-1 rounded">is_public</code> - Boolean (true/false) für öffentliche Karten</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Beispiel:</h4>
                    <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                      {exampleJson}
                    </pre>
                  </div>
                </TabsContent>
                
                <TabsContent value="csv" className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">CSV-Spalten (Semikolon-getrennt):</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li><code className="bg-muted px-1 rounded">front_text</code> - Der Text auf der Vorderseite (Frage)</li>
                      <li><code className="bg-muted px-1 rounded">back_text</code> - Der Text auf der Rückseite (Antwort)</li>
                      <li><code className="bg-muted px-1 rounded">category</code> - Optional: Kategoriename</li>
                      <li><code className="bg-muted px-1 rounded">is_public</code> - Optional: "true" oder "false"</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Alternative Spaltennamen:</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li><code className="bg-muted px-1 rounded">Frage</code> oder <code className="bg-muted px-1 rounded">vorderseite</code> statt front_text</li>
                      <li><code className="bg-muted px-1 rounded">Antwort</code> oder <code className="bg-muted px-1 rounded">rückseite</code> statt back_text</li>
                      <li><code className="bg-muted px-1 rounded">Kategorie</code> statt category</li>
                      <li><code className="bg-muted px-1 rounded">öffentlich</code> statt is_public</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Beispiel:</h4>
                    <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto whitespace-pre-wrap">
                      {exampleCsv}
                    </pre>
                  </div>
                </TabsContent>
              </Tabs>
              
              <div className="flex items-start gap-2 p-3 bg-primary/10 rounded-lg mt-4">
                <CheckCircle className="w-5 h-5 text-primary mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">Tipps:</p>
                  <ul className="list-disc list-inside text-muted-foreground mt-1">
                    <li>Kategorie pro Karte überschreibt die globale Auswahl</li>
                    <li>Neue Kategorien werden automatisch erstellt</li>
                    <li>Standard-Sichtbarkeit gilt für Karten ohne is_public</li>
                    <li>CSV-Dateien sollten Semikolon (;) als Trennzeichen verwenden</li>
                  </ul>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Standard-Kategorie (falls nicht pro Karte angegeben)</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Kategorie wählen (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Keine Kategorie</SelectItem>
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

        <Tabs value={importFormat} onValueChange={(v) => setImportFormat(v as "json" | "csv")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="json" className="flex items-center gap-2">
              <FileJson className="w-4 h-4" />
              JSON
            </TabsTrigger>
            <TabsTrigger value="csv" className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              CSV
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="json" className="space-y-2">
            <Label>JSON-Daten</Label>
            <Textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder={exampleJson}
              className="min-h-[200px] font-mono text-sm"
            />
          </TabsContent>
          
          <TabsContent value="csv" className="space-y-2">
            <Label>CSV-Daten (Semikolon-getrennt)</Label>
            <Textarea
              value={csvInput}
              onChange={(e) => setCsvInput(e.target.value)}
              placeholder={exampleCsv}
              className="min-h-[200px] font-mono text-sm"
            />
          </TabsContent>
        </Tabs>

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleImport} disabled={loading}>
            <Upload className="w-4 h-4 mr-2" />
            {loading ? "Importiere..." : "Importieren"}
          </Button>
          <div className="relative">
            <input
              type="file"
              accept=".json,.csv"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <Button variant="outline">
              <FileJson className="w-4 h-4 mr-2" />
              Datei laden (.json / .csv)
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}