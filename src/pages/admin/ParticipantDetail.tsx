import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  BookOpen, 
  Calendar, 
  FolderOpen, 
  MessageSquare, 
  Trophy,
  CheckCircle2,
  XCircle,
  Clock,
  Smile,
  Meh,
  Frown,
  Lightbulb,
  ClipboardList,
  Star
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface Absence {
  id: string;
  date: string;
  reason: string | null;
  approved: boolean | null;
  comment: string | null;
}

interface Project {
  id: string;
  title: string;
  description: string | null;
  category: string;
  image_url: string | null;
  created_at: string;
}

interface LearningProgress {
  id: string;
  flashcard_id: string;
  knew_answer: boolean;
  created_at: string;
}

interface FeedbackAnswer {
  id: string;
  mood_value: number | null;
  answer_text: string | null;
  created_at: string;
  question_id: string;
}

interface MoodEntry {
  id: string;
  mood_value: number;
  created_at: string;
}

interface Badge {
  id: string;
  badge_type: string;
  earned_at: string;
}

interface Skill {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  is_integration_relevant: boolean;
  coach_comment: string | null;
  competence_level: string | null;
  created_at: string;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  priority: string | null;
  due_date: string | null;
  category: string | null;
  created_at: string;
}

const statusLabels: Record<string, string> = {
  in_pruefung: "In Prüfung",
  integrationsrelevant: "Integrationsrelevant",
  validiert: "Validiert",
  abgelehnt: "Abgelehnt",
};

const statusColors: Record<string, string> = {
  in_pruefung: "bg-yellow-100 text-yellow-800",
  integrationsrelevant: "bg-purple-100 text-purple-800",
  validiert: "bg-green-100 text-green-800",
  abgelehnt: "bg-red-100 text-red-800",
};

const taskStatusLabels: Record<string, string> = {
  open: "Offen",
  in_progress: "In Bearbeitung",
  completed: "Erledigt",
};

const taskPriorityLabels: Record<string, string> = {
  low: "Niedrig",
  medium: "Mittel",
  high: "Hoch",
};

const ParticipantDetail = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [learningProgress, setLearningProgress] = useState<LearningProgress[]>([]);
  const [feedbackAnswers, setFeedbackAnswers] = useState<FeedbackAnswer[]>([]);
  const [moodEntries, setMoodEntries] = useState<MoodEntry[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [totalFlashcards, setTotalFlashcards] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchAllData();
    }
  }, [userId]);

  const fetchAllData = async () => {
    if (!userId) return;

    const [
      profileRes,
      absencesRes,
      projectsRes,
      progressRes,
      feedbackRes,
      moodRes,
      badgesRes,
      flashcardsRes,
      skillsRes,
      tasksRes
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase.from("absences").select("*").eq("user_id", userId).order("date", { ascending: false }),
      supabase.from("projects").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("learning_progress").select("*").eq("user_id", userId),
      supabase.from("feedback_answers").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("mood_entries").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("badges").select("*").eq("user_id", userId).order("earned_at", { ascending: false }),
      supabase.from("flashcards").select("id", { count: "exact" }).eq("is_public", true),
      supabase.from("skills").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("tasks").select("*").eq("assigned_to", userId).order("created_at", { ascending: false })
    ]);

    if (profileRes.data) setProfile(profileRes.data);
    if (absencesRes.data) setAbsences(absencesRes.data);
    if (projectsRes.data) setProjects(projectsRes.data);
    if (progressRes.data) setLearningProgress(progressRes.data);
    if (feedbackRes.data) setFeedbackAnswers(feedbackRes.data);
    if (moodRes.data) setMoodEntries(moodRes.data);
    if (badgesRes.data) setBadges(badgesRes.data);
    if (flashcardsRes.count) setTotalFlashcards(flashcardsRes.count);
    if (skillsRes.data) setSkills(skillsRes.data);
    if (tasksRes.data) setTasks(tasksRes.data);

    setLoading(false);
  };

  const getAbsenceStatusBadge = (approved: boolean | null) => {
    if (approved === null) {
      return <Badge variant="outline" className="flex items-center gap-1"><Clock className="w-3 h-3" /> Ausstehend</Badge>;
    }
    if (approved) {
      return <Badge variant="default" className="flex items-center gap-1 bg-green-500"><CheckCircle2 className="w-3 h-3" /> Genehmigt</Badge>;
    }
    return <Badge variant="destructive" className="flex items-center gap-1"><XCircle className="w-3 h-3" /> Abgelehnt</Badge>;
  };

  const getMoodIcon = (value: number) => {
    if (value >= 4) return <Smile className="w-5 h-5 text-green-500" />;
    if (value >= 2) return <Meh className="w-5 h-5 text-yellow-500" />;
    return <Frown className="w-5 h-5 text-red-500" />;
  };

  const getLearnedCardsCount = () => {
    const uniqueCards = new Set(learningProgress.filter(p => p.knew_answer).map(p => p.flashcard_id));
    return uniqueCards.size;
  };

  const getProgressPercentage = () => {
    if (totalFlashcards === 0) return 0;
    return Math.round((getLearnedCardsCount() / totalFlashcards) * 100);
  };

  const getAverageMood = () => {
    if (moodEntries.length === 0) return null;
    const sum = moodEntries.reduce((acc, entry) => acc + entry.mood_value, 0);
    return (sum / moodEntries.length).toFixed(1);
  };

  if (loading) return <div className="p-8">Lädt...</div>;
  if (!profile) return <div className="p-8">Teilnehmer nicht gefunden</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/users")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-4 flex-1">
          <Avatar className="w-16 h-16">
            <AvatarImage src={profile.avatar_url || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-foreground text-xl">
              {profile.full_name?.[0]?.toUpperCase() || profile.email[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold">{profile.full_name || "Unbekannt"}</h1>
            <p className="text-muted-foreground">{profile.email}</p>
            <p className="text-sm text-muted-foreground">
              Registriert seit {format(new Date(profile.created_at), "dd. MMMM yyyy", { locale: de })}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{getLearnedCardsCount()}</p>
                <p className="text-sm text-muted-foreground">Lernkarten gelernt</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FolderOpen className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{projects.length}</p>
                <p className="text-sm text-muted-foreground">Projekte</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Trophy className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{badges.length}</p>
                <p className="text-sm text-muted-foreground">Abzeichen</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{absences.length}</p>
                <p className="text-sm text-muted-foreground">Absenzen</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Learning Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Lernfortschritt
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {getLearnedCardsCount()} von {totalFlashcards} Karten gelernt
              </span>
              <span className="font-semibold">{getProgressPercentage()}%</span>
            </div>
            <Progress value={getProgressPercentage()} className="h-3" />
            {getAverageMood() && (
              <div className="flex items-center gap-2 pt-2">
                {getMoodIcon(parseFloat(getAverageMood()!))}
                <span className="text-sm text-muted-foreground">
                  Durchschnittliche Stimmung: {getAverageMood()}/5
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="skills" className="space-y-4">
        <TabsList className="grid grid-cols-6 w-full max-w-4xl">
          <TabsTrigger value="skills" className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            Skills ({skills.length})
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4" />
            Aufgaben ({tasks.length})
          </TabsTrigger>
          <TabsTrigger value="absences" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Absenzen ({absences.length})
          </TabsTrigger>
          <TabsTrigger value="projects" className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4" />
            Projekte ({projects.length})
          </TabsTrigger>
          <TabsTrigger value="feedback" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Feedback ({feedbackAnswers.length})
          </TabsTrigger>
          <TabsTrigger value="badges" className="flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            Abzeichen ({badges.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="skills">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {skills.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="p-6 text-center text-muted-foreground">
                  Keine Skills vorhanden
                </CardContent>
              </Card>
            ) : (
              skills.map((skill) => (
                <Card key={skill.id}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start gap-2">
                      <CardTitle className="text-lg">{skill.title}</CardTitle>
                      <Badge variant="secondary" className="shrink-0">
                        {skill.category}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={`${statusColors[skill.status] || 'bg-gray-100 text-gray-800'}`}>
                        {statusLabels[skill.status] || skill.status}
                      </Badge>
                      {skill.is_integration_relevant && (
                        <Badge variant="outline" className="text-purple-600 border-purple-300">
                          <Star className="w-3 h-3 mr-1" />
                          Relevant
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {skill.description}
                    </p>
                    {skill.competence_level && (
                      <p className="text-xs text-muted-foreground mb-2">
                        Stufe: {skill.competence_level}
                      </p>
                    )}
                    {skill.coach_comment && (
                      <p className="text-xs text-muted-foreground italic border-l-2 border-primary pl-2 mt-2">
                        Coach: {skill.coach_comment}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {format(new Date(skill.created_at), "dd.MM.yyyy", { locale: de })}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="tasks">
          <div className="grid gap-3">
            {tasks.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  Keine Aufgaben vorhanden
                </CardContent>
              </Card>
            ) : (
              tasks.map((task) => (
                <Card key={task.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-medium">{task.title}</p>
                        {task.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {task.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Badge variant={task.status === 'completed' ? 'default' : 'secondary'}>
                            {taskStatusLabels[task.status || 'open'] || task.status}
                          </Badge>
                          {task.priority && (
                            <Badge variant="outline">
                              {taskPriorityLabels[task.priority] || task.priority}
                            </Badge>
                          )}
                          {task.category && (
                            <Badge variant="outline">{task.category}</Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {task.due_date && (
                          <p className="text-sm text-muted-foreground">
                            Fällig: {format(new Date(task.due_date), "dd.MM.yyyy", { locale: de })}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Erstellt: {format(new Date(task.created_at), "dd.MM.yyyy", { locale: de })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="absences">
          <div className="grid gap-3">
            {absences.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  Keine Absenzen vorhanden
                </CardContent>
              </Card>
            ) : (
              absences.map((absence) => (
                <Card key={absence.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {format(new Date(absence.date), "dd. MMMM yyyy", { locale: de })}
                        </p>
                        {absence.reason && (
                          <p className="text-sm text-muted-foreground">{absence.reason}</p>
                        )}
                        {absence.comment && (
                          <p className="text-sm text-muted-foreground italic mt-1">
                            Kommentar: {absence.comment}
                          </p>
                        )}
                      </div>
                      {getAbsenceStatusBadge(absence.approved)}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="projects">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="p-6 text-center text-muted-foreground">
                  Keine Projekte vorhanden
                </CardContent>
              </Card>
            ) : (
              projects.map((project) => (
                <Card key={project.id} className="overflow-hidden">
                  {project.image_url && (
                    <div className="aspect-video">
                      <img 
                        src={project.image_url} 
                        alt={project.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-lg">{project.title}</CardTitle>
                    <CardDescription>{project.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">{project.category}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(project.created_at), "dd.MM.yyyy", { locale: de })}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="feedback">
          <div className="grid gap-3">
            {feedbackAnswers.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  Kein Feedback vorhanden
                </CardContent>
              </Card>
            ) : (
              feedbackAnswers.map((feedback) => (
                <Card key={feedback.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {feedback.mood_value !== null && (
                          <div className="flex items-center gap-2 mb-2">
                            {getMoodIcon(feedback.mood_value)}
                            <span className="font-medium">Stimmung: {feedback.mood_value}/5</span>
                          </div>
                        )}
                        {feedback.answer_text && (
                          <p className="text-sm text-muted-foreground">{feedback.answer_text}</p>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(feedback.created_at), "dd.MM.yyyy HH:mm", { locale: de })}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="badges">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {badges.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="p-6 text-center text-muted-foreground">
                  Keine Abzeichen vorhanden
                </CardContent>
              </Card>
            ) : (
              badges.map((badge) => (
                <Card key={badge.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-primary/10">
                        <Trophy className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{badge.badge_type}</p>
                        <p className="text-sm text-muted-foreground">
                          Erhalten am {format(new Date(badge.earned_at), "dd.MM.yyyy", { locale: de })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ParticipantDetail;
