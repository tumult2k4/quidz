import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
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

interface Tag {
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
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchCategories();
      fetchTags();
      if (editCard) {
        setFrontText(editCard.front_text);
        setBackText(editCard.back_text);
        setCategoryId(editCard.category_id || "");
        setIsPublic(editCard.is_public);
        fetchCardTags(editCard.id);
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

  const fetchTags = async () => {
    const { data } = await supabase
      .from("tags")
      .select("id, name")
      .order("name");
    
    if (data) {
      setAllTags(data);
    }
  };

  const fetchCardTags = async (cardId: string) => {
    const { data } = await supabase
      .from("flashcard_tags")
      .select("tag_id")
      .eq("flashcard_id", cardId);
    
    if (data) {
      setSelectedTags(data.map(t => t.tag_id));
    }
  };

  const resetForm = () => {
    setFrontText("");
    setBackText("");
    setCategoryId("");
    setIsPublic(false);
    setSelectedTags([]);
    setNewTagName("");
  };

  const handleAddTag = async () => {
    if (!newTagName.trim()) return;

    // Check if tag already exists
    const existingTag = allTags.find(t => 
      t.name.toLowerCase() === newTagName.trim().toLowerCase()
    );
    
    if (existingTag) {
      if (!selectedTags.includes(existingTag.id)) {
        setSelectedTags([...selectedTags, existingTag.id]);
      }
      setNewTagName("");
      return;
    }

    // Create new tag
    const { data, error } = await supabase
      .from("tags")
      .insert({ name: newTagName.trim() })
      .select()
      .single();

    if (error) {
      toast({
        title: "Fehler",
        description: "Tag konnte nicht erstellt werden",
        variant: "destructive",
      });
      return;
    }

    setAllTags([...allTags, data]);
    setSelectedTags([...selectedTags, data.id]);
    setNewTagName("");
  };

  const toggleTag = (tagId: string) => {
    if (selectedTags.includes(tagId)) {
      setSelectedTags(selectedTags.filter(id => id !== tagId));
    } else {
      setSelectedTags([...selectedTags, tagId]);
    }
  };

  const updateCardTags = async (cardId: string) => {
    // Delete existing tags
    await supabase
      .from("flashcard_tags")
      .delete()
      .eq("flashcard_id", cardId);

    // Insert new tags
    if (selectedTags.length > 0) {
      await supabase
        .from("flashcard_tags")
        .insert(
          selectedTags.map(tagId => ({
            flashcard_id: cardId,
            tag_id: tagId,
          }))
        );
    }
  };

  const checkFirstCardBadge = async (userId: string) => {
    const { data: existingBadge } = await supabase
      .from("badges")
      .select("id")
      .eq("user_id", userId)
      .eq("badge_type", "first_card")
      .maybeSingle();

    if (!existingBadge) {
      await supabase
        .from("badges")
        .insert({
          user_id: userId,
          badge_type: "first_card",
        });
    }
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

        await updateCardTags(editCard.id);

        toast({
          title: "Erfolg",
          description: "Lernkarte wurde aktualisiert.",
        });
      } else {
        const { data: newCard, error } = await supabase
          .from("flashcards")
          .insert([cardData])
          .select()
          .single();

        if (error) throw error;

        await updateCardTags(newCard.id);
        await checkFirstCardBadge(user.id);

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
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
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

          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Neues Tag..."
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
              />
              <Button type="button" onClick={handleAddTag} variant="outline">
                +
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {allTags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant={selectedTags.includes(tag.id) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleTag(tag.id)}
                >
                  {tag.name}
                  {selectedTags.includes(tag.id) && (
                    <X className="ml-1 h-3 w-3" />
                  )}
                </Badge>
              ))}
            </div>
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
