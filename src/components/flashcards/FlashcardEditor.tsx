import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Category {
  id: string;
  name: string;
}

interface FlashcardEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  editCard?: {
    id: string;
    front_text: string;
    back_text: string;
    category_id: string | null;
    is_public: boolean;
  } | null;
}

export function FlashcardEditor({
  open,
  onOpenChange,
  onSuccess,
  editCard,
}: FlashcardEditorProps) {
  const { toast } = useToast();
  const [frontText, setFrontText] = useState("");
  const [backText, setBackText] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [isPublic, setIsPublic] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchCategories();
      if (editCard) {
        setFrontText(editCard.front_text);
        setBackText(editCard.back_text);
        setCategoryId(editCard.category_id || "");
        setIsPublic(editCard.is_public);
      } else {
        resetForm();
      }
    }
  }, [open, editCard]);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from("categories")
      .select("id, name")
      .order("name");
    
    if (data) {
      setCategories(data);
    }
  };

  const resetForm = () => {
    setFrontText("");
    setBackText("");
    setCategoryId("");
    setIsPublic(false);
  };

  const handleSubmit = async () => {
    if (!frontText.trim() || !backText.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte fülle beide Felder aus.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const cardData = {
        front_text: frontText.trim(),
        back_text: backText.trim(),
        category_id: categoryId || null,
        is_public: isPublic,
        created_by: user.id,
      };

      if (editCard) {
        const { error } = await supabase
          .from("flashcards")
          .update(cardData)
          .eq("id", editCard.id);

        if (error) throw error;

        toast({
          title: "Erfolg",
          description: "Lernkarte wurde aktualisiert.",
        });
      } else {
        const { error } = await supabase
          .from("flashcards")
          .insert([cardData]);

        if (error) throw error;

        toast({
          title: "Erfolg",
          description: "Lernkarte wurde erstellt.",
        });
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error saving flashcard:", error);
      toast({
        title: "Fehler",
        description: "Die Lernkarte konnte nicht gespeichert werden.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {editCard ? "Lernkarte bearbeiten" : "Neue Lernkarte"}
          </DialogTitle>
          <DialogDescription>
            Erstelle eine neue Lernkarte mit Frage und Antwort.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="front">Frage / Begriff</Label>
            <Textarea
              id="front"
              placeholder="Was möchtest du lernen?"
              value={frontText}
              onChange={(e) => setFrontText(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="back">Antwort / Erklärung</Label>
            <Textarea
              id="back"
              placeholder="Die Antwort auf die Frage"
              value={backText}
              onChange={(e) => setBackText(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Kategorie (optional)</Label>
            <Select value={categoryId || undefined} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Keine Kategorie" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="public"
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
            <Label htmlFor="public">Öffentlich teilen</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Speichern..." : editCard ? "Aktualisieren" : "Erstellen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
