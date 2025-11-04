import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ExternalLink, Heart, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Project {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  image_url: string | null;
  project_url: string | null;
  created_at: string;
  profiles: {
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
  likes: { count: number }[];
  user_liked: boolean;
}

const PortfolioGallery = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    getCurrentUser();
    fetchProjects();
  }, []);

  useEffect(() => {
    filterProjects();
  }, [projects, searchQuery, categoryFilter]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
  };

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select(`
          *,
          profiles!projects_user_id_fkey (
            full_name,
            email,
            avatar_url
          ),
          likes:project_likes(count)
        `)
        .eq("published", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Check if current user liked each project
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userLikes } = await supabase
          .from("project_likes")
          .select("project_id")
          .eq("user_id", user.id);

        const likedProjectIds = new Set(userLikes?.map(l => l.project_id) || []);
        
        const projectsWithLikes = (data || []).map(project => ({
          ...project,
          user_liked: likedProjectIds.has(project.id)
        }));
        
        setProjects(projectsWithLikes);
      } else {
        setProjects((data || []).map(p => ({ ...p, user_liked: false })));
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast({
        title: "Fehler",
        description: "Projekte konnten nicht geladen werden.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterProjects = () => {
    let filtered = projects;

    if (searchQuery) {
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter((p) => p.category === categoryFilter);
    }

    setFilteredProjects(filtered);
  };

  const toggleLike = async (projectId: string) => {
    if (!currentUserId) {
      toast({
        title: "Anmeldung erforderlich",
        description: "Bitte melden Sie sich an, um Projekte zu liken.",
        variant: "destructive",
      });
      return;
    }

    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    try {
      if (project.user_liked) {
        const { error } = await supabase
          .from("project_likes")
          .delete()
          .eq("project_id", projectId)
          .eq("user_id", currentUserId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("project_likes")
          .insert({ project_id: projectId, user_id: currentUserId });

        if (error) throw error;
      }

      await fetchProjects();
    } catch (error) {
      console.error("Error toggling like:", error);
      toast({
        title: "Fehler",
        description: "Like konnte nicht gespeichert werden.",
        variant: "destructive",
      });
    }
  };

  const categoryLabels: Record<string, string> = {
    all: "Alle Kategorien",
    web_development: "Web Development",
    mobile_app: "Mobile App",
    design: "Design",
    data_science: "Data Science",
    machine_learning: "Machine Learning",
    other: "Sonstiges",
  };

  if (loading) {
    return <div className="p-8">Lädt...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Portfolio Galerie</h1>
        <p className="text-muted-foreground">
          Entdecken Sie Projekte der Community
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Projekte durchsuchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(categoryLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">
              Keine Projekte gefunden.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <Card key={project.id} className="overflow-hidden">
              {project.image_url && (
                <div className="aspect-video w-full overflow-hidden bg-muted">
                  <img
                    src={project.image_url}
                    alt={project.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <CardHeader>
                <CardTitle className="line-clamp-1">{project.title}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {project.description}
                </CardDescription>
                <div className="flex items-center gap-2 pt-2">
                  <Avatar className="w-6 h-6">
                    {project.profiles.avatar_url && (
                      <AvatarImage src={project.profiles.avatar_url} />
                    )}
                    <AvatarFallback className="text-xs">
                      {project.profiles.full_name?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-muted-foreground">
                    {project.profiles.full_name || project.profiles.email}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    {categoryLabels[project.category]}
                  </Badge>
                  {project.tags.slice(0, 2).map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                  {project.tags.length > 2 && (
                    <Badge variant="outline">+{project.tags.length - 2}</Badge>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    {project.project_url && (
                      <Button variant="outline" size="sm" asChild>
                        <a
                          href={project.project_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleLike(project.id)}
                    className="gap-1"
                  >
                    <Heart
                      className={`w-4 h-4 ${
                        project.user_liked ? "fill-red-500 text-red-500" : ""
                      }`}
                    />
                    <span className="text-sm">
                      {project.likes[0]?.count || 0}
                    </span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PortfolioGallery;