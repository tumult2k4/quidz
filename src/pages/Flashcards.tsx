import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FlashcardEditor } from "@/components/flashcards/FlashcardEditor";
import { FlashcardFlipCard } from "@/components/flashcards/FlashcardFlipCard";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  BookOpen, 
  Play, 
  Filter,
  Edit,
  Trash2,
  Award
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Flashcard {
  id: string;
  front_text: string;
  back_text: string;
  category_id: string | null;
  is_public: boolean;
  created_by: string;
  categories?: { name: string } | null;
}

interface Category {
  id: string;
  name: string;
}

export default function Flashcards() {
  const { toast } = useToast();
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showOnlyOwn, setShowOnlyOwn] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [learningMode, setLearningMode] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);

  useEffect(() => {
    fetchUser();
    fetchCategories();
    fetchFlashcards();
  }, [selectedCategory, showOnlyOwn]);

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const fetchCategories = async () => {
    const { data } = await supabase
      .from("categories")
      .select("id, name")
      .order("name");
    
    if (data) {
      setCategories(data);
    }
  };

  const fetchFlashcards = async () => {
    let query = supabase
      .from("flashcards")
      .select(`
        *,
        categories (name)
      `)
      .order("created_at", { ascending: false });

    if (selectedCategory !== "all") {
      query = query.eq("category_id", selectedCategory);
    }

    if (showOnlyOwn && user) {
      query = query.eq("created_by", user.id);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching flashcards:", error);
      toast({
        title: "Fehler",
        description: "Lernkarten konnten nicht geladen werden.",
        variant: "destructive",
      });
    } else {
      setFlashcards(data || []);
    }
  };

  const handleFeedback = async (flashcardId: string, isHelpful: boolean) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("flashcard_feedbacks")
        .insert([{
          flashcard_id: flashcardId,
          user_id: user.id,
          is_helpful: isHelpful,
        }]);

      if (error) throw error;

      toast({
        title: "Danke!",
        description: "Dein Feedback wurde gespeichert.",
      });
    } catch (error: any) {
      console.error("Error saving feedback:", error);
    }
  };

  const handleEdit = (card: Flashcard) => {
    setEditingCard(card);
    setEditorOpen(true);
  };

  const handleDelete = async () => {
    if (!cardToDelete) return;

    try {
      const { error } = await supabase
        .from("flashcards")
        .delete()
        .eq("id", cardToDelete);

      if (error) throw error;

      toast({
        title: "Erfolg",
        description: "Lernkarte wurde gelöscht.",
      });
      
      fetchFlashcards();
      setDeleteDialogOpen(false);
      setCardToDelete(null);
    } catch (error: any) {
      console.error("Error deleting flashcard:", error);
      toast({
        title: "Fehler",
        description: "Lernkarte konnte nicht gelöscht werden.",
        variant: "destructive",
      });
    }
  };

  const startLearningMode = () => {
    if (flashcards.length === 0) {
      toast({
        title: "Keine Karten",
        description: "Es sind keine Lernkarten zum Lernen verfügbar.",
        variant: "destructive",
      });
      return;
    }
    setLearningMode(true);
    setCurrentCardIndex(0);
  };

  const nextCard = () => {
    if (currentCardIndex < flashcards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
    } else {
      setLearningMode(false);
      toast({
        title: "Fertig!",
        description: `Du hast ${flashcards.length} Karten durchgearbeitet.`,
      });
    }
  };

  const recordProgress = async (knewAnswer: boolean) => {
    if (!user || learningMode === false) return;

    const currentCard = flashcards[currentCardIndex];
    
    try {
      await supabase
        .from("learning_progress")
        .insert([{
          user_id: user.id,
          flashcard_id: currentCard.id,
          knew_answer: knewAnswer,
        }]);

      nextCard();
    } catch (error: any) {
      console.error("Error recording progress:", error);
      nextCard();
    }
  };

  if (learningMode && flashcards.length > 0) {
    const currentCard = flashcards[currentCardIndex];
    
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-4xl">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold">Lernmodus</h2>
              <p className="text-muted-foreground">
                Karte {currentCardIndex + 1} von {flashcards.length}
              </p>
            </div>
            <Button variant="outline" onClick={() => setLearningMode(false)}>
              Beenden
            </Button>
          </div>

          <FlashcardFlipCard
            frontText={currentCard.front_text}
            backText={currentCard.back_text}
            showFeedback={false}
          />

          <div className="flex gap-4 justify-center mt-8">
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => recordProgress(false)}
            >
              Ich wusste es nicht
            </Button>
            <Button 
              size="lg"
              onClick={() => recordProgress(true)}
            >
              Ich wusste es
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BookOpen className="w-8 h-8" />
            Lernkarten
          </h1>
          <p className="text-muted-foreground mt-1">
            Erstelle und lerne mit digitalen Lernkarten
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={startLearningMode}>
            <Play className="w-4 h-4 mr-2" />
            Lernmodus starten
          </Button>
          <Button onClick={() => {
            setEditingCard(null);
            setEditorOpen(true);
          }}>
            <Plus className="w-4 h-4 mr-2" />
            Neue Karte
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filter
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <div className="flex-1">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Kategorie wählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Kategorien</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant={showOnlyOwn ? "default" : "outline"}
            onClick={() => setShowOnlyOwn(!showOnlyOwn)}
          >
            Nur meine Karten
          </Button>
        </CardContent>
      </Card>

      {/* Flashcards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {flashcards.map((card) => (
          <Card key={card.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg line-clamp-2">
                  {card.front_text}
                </CardTitle>
                {user?.id === card.created_by && (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(card)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setCardToDelete(card.id);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                {card.back_text}
              </p>
              <div className="flex gap-2 flex-wrap">
                {card.categories && (
                  <Badge variant="secondary">{card.categories.name}</Badge>
                )}
                {card.is_public && (
                  <Badge variant="outline">Öffentlich</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {flashcards.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Keine Lernkarten gefunden</h3>
            <p className="text-muted-foreground mb-4">
              Erstelle deine erste Lernkarte oder ändere die Filter.
            </p>
            <Button onClick={() => setEditorOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Erste Karte erstellen
            </Button>
          </CardContent>
        </Card>
      )}

      <FlashcardEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        editCard={editingCard}
        onSuccess={() => {
          fetchFlashcards();
          setEditingCard(null);
        }}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Lernkarte löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
