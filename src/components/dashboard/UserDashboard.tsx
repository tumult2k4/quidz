import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  BookOpen, 
  Calendar,
  TrendingUp,
  FileText,
  Briefcase,
  ArrowRight,
  MessageSquare,
  Lightbulb,
  Bot,
  Layers,
  ClipboardList,
  User as UserIcon
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import MoodTracker from "@/components/dashboard/MoodTracker";

interface UserDashboardProps {
  user: User;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: string;
  priority: string;
  category: string | null;
}

interface Skill {
  id: string;
  title: string;
  status: string;
  is_integration_relevant: boolean;
}

const UserDashboard = ({ user }: UserDashboardProps) => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    totalSkills: 0,
    validatedSkills: 0,
    upcomingAbsences: 0,
  });

  const modules = [
    { 
      title: "Aufgaben", 
      icon: ClipboardList, 
      path: "/tasks", 
      description: "Meine To-Dos",
      color: "text-green-500"
    },
    { 
      title: "Skills", 
      icon: Lightbulb, 
      path: "/skills", 
      description: "Meine Kompetenzen",
      color: "text-yellow-500"
    },
    { 
      title: "Dokumente", 
      icon: FileText, 
      path: "/documents", 
      description: "Unterlagen",
      color: "text-cyan-500"
    },
    { 
      title: "Portfolio", 
      icon: Briefcase, 
      path: "/my-projects", 
      description: "Meine Projekte",
      color: "text-purple-500"
    },
    { 
      title: "Kalender", 
      icon: Calendar, 
      path: "/calendar", 
      description: "Termine & Absenzen",
      color: "text-red-500"
    },
    { 
      title: "Lernkarten", 
      icon: Layers, 
      path: "/flashcards", 
      description: "Wissen festigen",
      color: "text-indigo-500"
    },
    { 
      title: "Chat", 
      icon: MessageSquare, 
      path: "/chat", 
      description: "Nachrichten",
      color: "text-blue-500"
    },
    { 
      title: "KI-Assistent", 
      icon: Bot, 
      path: "/ai-assistant", 
      description: "Hilfe & Fragen",
      color: "text-orange-500"
    },
  ];

  useEffect(() => {
    const fetchData = async () => {
      // Fetch user profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      setProfile(profileData);

      // Fetch user tasks
      const { data: tasksData } = await supabase
        .from("tasks")
        .select("*")
        .eq("assigned_to", user.id)
        .order("due_date", { ascending: true });

      const allTasks = tasksData || [];
      setTasks(allTasks.slice(0, 5)); // Show only 5 recent tasks

      // Fetch user skills
      const { data: skillsData } = await supabase
        .from("skills")
        .select("id, title, status, is_integration_relevant")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      const allSkills = (skillsData || []) as Skill[];
      setSkills(allSkills.slice(0, 5));

      // Fetch upcoming absences
      const today = new Date().toISOString().split("T")[0];
      const { data: absencesData } = await supabase
        .from("absences")
        .select("id")
        .eq("user_id", user.id)
        .gte("date", today);

      // Calculate stats
      const completedCount = allTasks.filter(t => t.status === "completed").length;
      const validatedCount = allSkills.filter(s => s.status === "validated").length;

      setStats({
        totalTasks: allTasks.length,
        completedTasks: completedCount,
        totalSkills: allSkills.length,
        validatedSkills: validatedCount,
        upcomingAbsences: absencesData?.length || 0,
      });

      setLoading(false);
    };

    fetchData();
  }, [user.id]);

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    const { error } = await supabase
      .from("tasks")
      .update({ status: newStatus })
      .eq("id", taskId);

    if (error) {
      toast.error("Fehler beim Aktualisieren der Aufgabe");
      return;
    }

    setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    
    if (newStatus === "completed") {
      setStats(prev => ({ ...prev, completedTasks: prev.completedTasks + 1 }));
    }
    toast.success("Status aktualisiert");
  };

  const progress = stats.totalTasks > 0 ? (stats.completedTasks / stats.totalTasks) * 100 : 0;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case "in_progress":
        return <Clock className="w-5 h-5 text-primary" />;
      default:
        return <Circle className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "destructive";
      case "medium":
        return "default";
      default:
        return "secondary";
    }
  };

  const getSkillStatusColor = (status: string) => {
    switch (status) {
      case "validated":
        return "default";
      case "in_progress":
        return "secondary";
      default:
        return "outline";
    }
  };

  if (loading) {
    return <div className="p-8">Lädt...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card shadow-soft">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={profile?.avatar_url || ""} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-foreground font-bold shadow-glow">
                  {profile?.full_name?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-xl font-bold">Hallo, {profile?.full_name?.split(" ")[0] || "User"}!</h1>
                <p className="text-sm text-muted-foreground">Willkommen bei QUIDZ</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/profile")}>
              <UserIcon className="w-4 h-4 mr-2" />
              Profil
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="shadow-card">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardDescription className="text-xs">Aufgaben</CardDescription>
              <CardTitle className="text-2xl flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-green-500" />
                {stats.completedTasks}/{stats.totalTasks}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <Progress value={progress} className="h-2" />
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardDescription className="text-xs">Skills</CardDescription>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-yellow-500" />
                {stats.totalSkills}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-xs text-muted-foreground">{stats.validatedSkills} validiert</p>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardDescription className="text-xs">Absenzen</CardDescription>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Calendar className="w-5 h-5 text-red-500" />
                {stats.upcomingAbsences}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-xs text-muted-foreground">geplant</p>
            </CardContent>
          </Card>

          <MoodTracker userId={user.id} compact />
        </div>

        {/* Quick Access Modules */}
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="w-5 h-5 text-primary" />
              Schnellzugriff
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {modules.map((module) => (
                <Button
                  key={module.path}
                  variant="outline"
                  className="h-auto py-3 px-3 flex flex-col items-center gap-1 hover:bg-muted/50 transition-colors"
                  onClick={() => navigate(module.path)}
                >
                  <module.icon className={`w-6 h-6 ${module.color}`} />
                  <span className="font-medium text-sm">{module.title}</span>
                  <span className="text-xs text-muted-foreground font-normal hidden md:block">
                    {module.description}
                  </span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tasks and Skills Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Tasks */}
          <Card className="shadow-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-primary" />
                    Meine Aufgaben
                  </CardTitle>
                  <CardDescription>Aktuelle To-Dos</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate("/tasks")}>
                  Alle
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {tasks.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2 opacity-50" />
                  <p className="text-muted-foreground">Keine offenen Aufgaben</p>
                </div>
              ) : (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-3 rounded-lg border bg-gradient-to-r from-card to-muted/20 hover:shadow-soft transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => {
                          const nextStatus = 
                            task.status === "open" ? "in_progress" :
                            task.status === "in_progress" ? "completed" : "open";
                          updateTaskStatus(task.id, nextStatus);
                        }}
                        className="mt-0.5"
                      >
                        {getStatusIcon(task.status)}
                      </button>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{task.title}</h4>
                        <div className="flex flex-wrap gap-2 mt-1">
                          <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                            {task.priority === "high" ? "Hoch" : 
                             task.priority === "medium" ? "Mittel" : "Niedrig"}
                          </Badge>
                          {task.due_date && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(task.due_date).toLocaleDateString("de-CH")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Skills */}
          <Card className="shadow-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-primary" />
                    Meine Skills
                  </CardTitle>
                  <CardDescription>Kompetenzen & Fähigkeiten</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate("/skills")}>
                  Alle
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {skills.length === 0 ? (
                <div className="text-center py-8">
                  <Lightbulb className="w-12 h-12 text-yellow-500 mx-auto mb-2 opacity-50" />
                  <p className="text-muted-foreground">Noch keine Skills erfasst</p>
                  <Button variant="link" size="sm" onClick={() => navigate("/skills")}>
                    Jetzt hinzufügen
                  </Button>
                </div>
              ) : (
                skills.map((skill) => (
                  <div
                    key={skill.id}
                    className="p-3 rounded-lg border bg-gradient-to-r from-card to-muted/20 hover:shadow-soft transition-all cursor-pointer"
                    onClick={() => navigate("/skills")}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Lightbulb className={`w-4 h-4 ${skill.is_integration_relevant ? "text-yellow-500" : "text-muted-foreground"}`} />
                        <span className="font-medium text-sm">{skill.title}</span>
                      </div>
                      <Badge variant={getSkillStatusColor(skill.status)} className="text-xs">
                        {skill.status === "validated" ? "Validiert" :
                         skill.status === "in_progress" ? "In Arbeit" : "Vorgeschlagen"}
                      </Badge>
                    </div>
                    {skill.is_integration_relevant && (
                      <p className="text-xs text-yellow-600 mt-1 pl-6">Integrationsrelevant</p>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Motivational Quote */}
        <Card className="shadow-card bg-gradient-to-br from-primary/5 to-secondary/5">
          <CardContent className="p-6 text-center">
            <p className="text-lg font-medium italic">
              "Erfolg ist die Summe kleiner Bemühungen, die Tag für Tag wiederholt werden."
            </p>
            <p className="text-sm text-muted-foreground mt-2">– Robert Collier</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default UserDashboard;