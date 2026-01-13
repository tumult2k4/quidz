import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ExportPanel } from "@/components/flashcards/ExportPanel";
import { FlashcardBatchImport } from "@/components/flashcards/FlashcardBatchImport";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Edit, Trash2, Star, BarChart, Award, Users, TrendingUp, CheckCircle, XCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface Category {
  id: string;
  name: string;
  description: string | null;
  featured: boolean;
}

interface Flashcard {
  id: string;
  front_text: string;
  back_text: string;
  category_id: string | null;
  is_public: boolean;
  created_by: string;
  created_at: string;
  categories?: { name: string } | null;
}

interface BadgeData {
  id: string;
  user_id: string;
  badge_type: string;
  earned_at: string;
}

export default function AdminFlashcards() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [allBadges, setAllBadges] = useState<BadgeData[]>([]);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [badgeDialogOpen, setBadgeDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [categoryFeatured, setCategoryFeatured] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedBadgeType, setSelectedBadgeType] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetchCategories();
    fetchFlashcards();
    fetchStats();
    fetchUsers();
    fetchBadges();
  }, []);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("name");

    if (error) {
      console.error("Error fetching categories:", error);
      toast({
        title: "Fehler",
        description: "Kategorien konnten nicht geladen werden.",
        variant: "destructive",
      });
    } else {
      setCategories(data || []);
    }
  };

  const fetchFlashcards = async () => {
    const { data, error } = await supabase
      .from("flashcards")
      .select(`
        *,
        categories (name)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching flashcards:", error);
    } else {
      setFlashcards(data || []);
    }
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .order("full_name");
    
    if (data) {
      setUsers(data);
    }
  };

  const fetchBadges = async () => {
    const { data } = await supabase
      .from("badges")
      .select("*")
      .order("earned_at", { ascending: false });
    
    if (data) {
      setAllBadges(data);
    }
  };

  const fetchStats = async () => {
    try {
      const { count: totalCards } = await supabase
        .from("flashcards")
        .select("*", { count: "exact", head: true });

      const { count: publicCards } = await supabase
        .from("flashcards")
        .select("*", { count: "exact", head: true })
        .eq("is_public", true);

      const { data: progressData } = await supabase
        .from("learning_progress")
        .select("*");

      const { data: feedbackData } = await supabase
        .from("flashcard_feedbacks")
        .select("is_helpful");

      const { count: totalUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      const helpfulCount = feedbackData?.filter(f => f.is_helpful).length || 0;
      const totalFeedback = feedbackData?.length || 0;

      // Get cards created this week
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const { count: cardsThisWeek } = await supabase
        .from("flashcards")
        .select("*", { count: "exact", head: true })
        .gte("created_at", oneWeekAgo.toISOString());

      // Get category distribution
      const { data: categoryStats } = await supabase
        .from("flashcards")
        .select("category_id, categories(name)");

      const categoryDistribution = categoryStats?.reduce((acc: any, card: any) => {
        const catName = card.categories?.name || "Keine Kategorie";
        acc[catName] = (acc[catName] || 0) + 1;
        return acc;
      }, {});

      setStats({
        totalCards: totalCards || 0,
        publicCards: publicCards || 0,
        totalSessions: progressData?.length || 0,
        feedbackRatio: totalFeedback > 0 
          ? Math.round((helpfulCount / totalFeedback) * 100)
          : 0,
        totalUsers: totalUsers || 0,
        cardsThisWeek: cardsThisWeek || 0,
        categoryDistribution: categoryDistribution || {},
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const handleSaveCategory = async () => {
    if (!categoryName.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte gib einen Kategorienamen ein.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const categoryData = {
        name: categoryName.trim(),
        description: categoryDescription.trim() || null,
        featured: categoryFeatured,
        created_by: user.id,
      };

      if (editingCategory) {
        const { error } = await supabase
          .from("categories")
          .update(categoryData)
          .eq("id", editingCategory.id);

        if (error) throw error;

        toast({
          title: "Erfolg",
          description: "Kategorie wurde aktualisiert.",
        });
      } else {
        const { error } = await supabase
          .from("categories")
          .insert([categoryData]);

        if (error) throw error;

        toast({
          title: "Erfolg",
          description: "Kategorie wurde erstellt.",
        });
      }

      setCategoryDialogOpen(false);
      resetCategoryForm();
      fetchCategories();
    } catch (error: any) {
      console.error("Error saving category:", error);
      toast({
        title: "Fehler",
        description: "Kategorie konnte nicht gespeichert werden.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Erfolg",
        description: "Kategorie wurde gelöscht.",
      });
      
      fetchCategories();
    } catch (error: any) {
      console.error("Error deleting category:", error);
      toast({
        title: "Fehler",
        description: "Kategorie konnte nicht gelöscht werden.",
        variant: "destructive",
      });
    }
  };

  const handleGiveBadge = async () => {
    if (!selectedUserId || !selectedBadgeType) {
      toast({
        title: "Fehler",
        description: "Bitte wähle Benutzer und Badge-Typ.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("badges")
        .insert([{
          user_id: selectedUserId,
          badge_type: selectedBadgeType,
        }]);

      if (error) throw error;

      toast({
        title: "Erfolg",
        description: "Badge wurde vergeben.",
      });

      setBadgeDialogOpen(false);
      setSelectedUserId("");
      setSelectedBadgeType("");
      fetchBadges();
    } catch (error: any) {
      console.error("Error giving badge:", error);
      toast({
        title: "Fehler",
        description: "Badge konnte nicht vergeben werden.",
        variant: "destructive",
      });
    }
  };

  const togglePublicStatus = async (cardId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("flashcards")
        .update({ is_public: !currentStatus })
        .eq("id", cardId);

      if (error) throw error;

      toast({
        title: "Erfolg",
        description: `Karte ist jetzt ${!currentStatus ? "öffentlich" : "privat"}.`,
      });

      fetchFlashcards();
    } catch (error: any) {
      console.error("Error updating card:", error);
      toast({
        title: "Fehler",
        description: "Status konnte nicht geändert werden.",
        variant: "destructive",
      });
    }
  };

  const resetCategoryForm = () => {
    setCategoryName("");
    setCategoryDescription("");
    setCategoryFeatured(false);
    setEditingCategory(null);
  };

  const openEditCategory = (category: Category) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setCategoryDescription(category.description || "");
    setCategoryFeatured(category.featured);
    setCategoryDialogOpen(true);
  };

  const badgeTypes = [
    { value: "first_card", label: "Erste Karte erstellt" },
    { value: "cards_10", label: "10 Karten gelernt" },
    { value: "cards_50", label: "50 Karten gelernt" },
    { value: "streak_5", label: "5 Tage Streak" },
    { value: "streak_10", label: "10 Tage Streak" },
    { value: "perfect_session", label: "Perfekte Session" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Lernkarten Verwaltung</h1>
        <p className="text-muted-foreground mt-1">
          Verwalte Kategorien, analysiere Nutzung und vergib Badges
        </p>
      </div>

      <Tabs defaultValue="categories">
        <TabsList>
          <TabsTrigger value="categories">Kategorien</TabsTrigger>
          <TabsTrigger value="flashcards">Alle Lernkarten</TabsTrigger>
          <TabsTrigger value="stats">Statistiken</TabsTrigger>
          <TabsTrigger value="badges">Badges</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => {
              resetCategoryForm();
              setCategoryDialogOpen(true);
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Neue Kategorie
            </Button>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Beschreibung</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell>{category.description || "-"}</TableCell>
                    <TableCell>
                      {category.featured && (
                        <Badge variant="secondary">
                          <Star className="w-3 h-3 mr-1" />
                          Hervorgehoben
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditCategory(category)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCategory(category.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="flashcards" className="space-y-4">
          <FlashcardBatchImport 
            categories={categories} 
            onSuccess={fetchFlashcards} 
          />
          <ExportPanel flashcards={flashcards} title="Alle Lernkarten" />
          
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Frage</TableHead>
                  <TableHead>Kategorie</TableHead>
                  <TableHead>Erstellt von</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flashcards.slice(0, 50).map((card) => (
                  <TableRow key={card.id}>
                    <TableCell className="max-w-xs truncate">{card.front_text}</TableCell>
                    <TableCell>{card.categories?.name || "-"}</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>
                      {card.is_public ? (
                        <Badge variant="default">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Öffentlich
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          <XCircle className="w-3 h-3 mr-1" />
                          Privat
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => togglePublicStatus(card.id, card.is_public)}
                      >
                        {card.is_public ? "Auf Privat" : "Freigeben"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Gesamt Lernkarten
                </CardTitle>
                <BarChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalCards || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.publicCards || 0} öffentlich
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Diese Woche
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.cardsThisWeek || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Neue Karten
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Lernsessions
                </CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalSessions || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Hilfreich-Rate
                </CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.feedbackRatio || 0}%</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Kategorieverteilung</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats?.categoryDistribution && Object.entries(stats.categoryDistribution).map(([category, count]: [string, any]) => (
                  <div key={category} className="flex justify-between items-center">
                    <span className="text-sm">{category}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="badges" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setBadgeDialogOpen(true)}>
              <Award className="w-4 h-4 mr-2" />
              Badge vergeben
            </Button>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Benutzer</TableHead>
                  <TableHead>Badge</TableHead>
                  <TableHead>Erhalten am</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allBadges.map((badge) => (
                  <TableRow key={badge.id}>
                    <TableCell>User ID: {badge.user_id.substring(0, 8)}...</TableCell>
                    <TableCell>
                      <Badge>{badgeTypes.find(b => b.value === badge.badge_type)?.label || badge.badge_type}</Badge>
                    </TableCell>
                    <TableCell>{new Date(badge.earned_at).toLocaleDateString("de-DE")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Kategorie bearbeiten" : "Neue Kategorie"}
            </DialogTitle>
            <DialogDescription>
              Erstelle oder bearbeite eine Kategorie für Lernkarten.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="z.B. Digital Skills"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Beschreibung (optional)</Label>
              <Textarea
                id="description"
                placeholder="Kurze Beschreibung der Kategorie"
                value={categoryDescription}
                onChange={(e) => setCategoryDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="featured"
                checked={categoryFeatured}
                onCheckedChange={setCategoryFeatured}
              />
              <Label htmlFor="featured">Als hervorgehoben markieren</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSaveCategory}>
              {editingCategory ? "Aktualisieren" : "Erstellen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={badgeDialogOpen} onOpenChange={setBadgeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Badge vergeben</DialogTitle>
            <DialogDescription>
              Vergib manuell einen Badge an einen Benutzer.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Benutzer</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Benutzer wählen" />
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

            <div className="space-y-2">
              <Label>Badge-Typ</Label>
              <Select value={selectedBadgeType} onValueChange={setSelectedBadgeType}>
                <SelectTrigger>
                  <SelectValue placeholder="Badge-Typ wählen" />
                </SelectTrigger>
                <SelectContent>
                  {badgeTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBadgeDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleGiveBadge}>
              Badge vergeben
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
