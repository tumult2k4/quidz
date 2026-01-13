import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Save,
  FileText,
  Download,
  CheckCircle,
  User,
  Calendar,
  ClipboardList,
  Lightbulb,
  BookOpen,
  Brain,
  Heart,
  Target,
  Loader2,
} from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "sonner";
import jsPDF from "jspdf";

interface Profile {
  id: string;
  full_name: string;
  email: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
  due_date: string;
}

interface Skill {
  id: string;
  title: string;
  status: string;
  is_integration_relevant: boolean;
  category: string;
}

interface Absence {
  id: string;
  date: string;
  reason: string;
  approved: boolean;
}

interface MoodEntry {
  mood_value: number;
  created_at: string;
}

interface ReportData {
  id?: string;
  user_id: string;
  coach_id: string;
  period_start: string;
  period_end: string;
  program_type: string;
  attendance_summary: Json;
  attendance_notes: string;
  tasks_summary: Json;
  tasks_notes: string;
  skills_summary: Json;
  skills_notes: string;
  learning_summary: Json;
  learning_notes: string;
  behavior_notes: string;
  mood_summary: string;
  overall_assessment: string;
  outlook: string;
  status: string;
}

const ReportEditor = () => {
  const { reportId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isNew = reportId === "new";
  const preselectedUserId = searchParams.get("userId");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [participants, setParticipants] = useState<Profile[]>([]);
  const [currentCoachId, setCurrentCoachId] = useState<string>("");

  // Fetched data for auto-fill
  const [tasks, setTasks] = useState<Task[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [moodEntries, setMoodEntries] = useState<MoodEntry[]>([]);

  // Report form data
  const [report, setReport] = useState<ReportData>({
    user_id: preselectedUserId || "",
    coach_id: "",
    period_start: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    period_end: format(endOfMonth(new Date()), "yyyy-MM-dd"),
    program_type: "arbeitstraining",
    attendance_summary: {},
    attendance_notes: "",
    tasks_summary: {},
    tasks_notes: "",
    skills_summary: {},
    skills_notes: "",
    learning_summary: {},
    learning_notes: "",
    behavior_notes: "",
    mood_summary: "",
    overall_assessment: "",
    outlook: "",
    status: "draft",
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (report.user_id && report.period_start && report.period_end) {
      fetchParticipantData();
    }
  }, [report.user_id, report.period_start, report.period_end]);

  const fetchInitialData = async () => {
    try {
      // Get current user as coach
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentCoachId(user.id);
        setReport((prev) => ({ ...prev, coach_id: user.id }));
      }

      // Fetch all participants
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .order("full_name");

      setParticipants(profilesData || []);

      // If editing existing report, fetch it
      if (!isNew && reportId) {
        const { data: reportData, error } = await supabase
          .from("reports")
          .select("*")
          .eq("id", reportId)
          .single();

        if (error) throw error;
        if (reportData) {
          setReport({
            ...reportData,
            attendance_summary: reportData.attendance_summary || {},
            tasks_summary: reportData.tasks_summary || {},
            skills_summary: reportData.skills_summary || {},
            learning_summary: reportData.learning_summary || {},
          });
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Fehler beim Laden der Daten");
    } finally {
      setLoading(false);
    }
  };

  const fetchParticipantData = async () => {
    if (!report.user_id) return;

    try {
      // Fetch tasks for participant in period
      const { data: tasksData } = await supabase
        .from("tasks")
        .select("id, title, status, due_date")
        .eq("assigned_to", report.user_id)
        .gte("due_date", report.period_start)
        .lte("due_date", report.period_end);

      setTasks(tasksData || []);

      // Fetch skills
      const { data: skillsData } = await supabase
        .from("skills")
        .select("id, title, status, is_integration_relevant, category")
        .eq("user_id", report.user_id);

      setSkills(skillsData || []);

      // Fetch absences in period
      const { data: absencesData } = await supabase
        .from("absences")
        .select("id, date, reason, approved")
        .eq("user_id", report.user_id)
        .gte("date", report.period_start)
        .lte("date", report.period_end);

      setAbsences(absencesData || []);

      // Fetch mood entries in period
      const { data: moodData } = await supabase
        .from("mood_entries")
        .select("mood_value, created_at")
        .eq("user_id", report.user_id)
        .gte("created_at", report.period_start)
        .lte("created_at", report.period_end);

      setMoodEntries(moodData || []);

      // Auto-update summaries
      setReport((prev) => ({
        ...prev,
        attendance_summary: {
          absences_count: absencesData?.length || 0,
          absences: absencesData || [],
        },
        tasks_summary: {
          total: tasksData?.length || 0,
          completed: tasksData?.filter((t) => t.status === "done").length || 0,
          in_progress: tasksData?.filter((t) => t.status === "in_progress").length || 0,
          open: tasksData?.filter((t) => t.status === "open").length || 0,
        },
        skills_summary: {
          total: skillsData?.length || 0,
          validated: skillsData?.filter((s) => s.status === "validiert").length || 0,
          integration_relevant: skillsData?.filter((s) => s.is_integration_relevant).length || 0,
        },
      }));
    } catch (error) {
      console.error("Error fetching participant data:", error);
    }
  };

  const handleSave = async (finalStatus?: string) => {
    if (!report.user_id) {
      toast.error("Bitte wählen Sie einen Teilnehmer aus");
      return;
    }

    setSaving(true);
    try {
      const dataToSave = {
        ...report,
        status: finalStatus || report.status,
      };

      if (isNew) {
        const { error } = await supabase.from("reports").insert(dataToSave);
        if (error) throw error;
        toast.success("Bericht erstellt");
      } else {
        const { error } = await supabase
          .from("reports")
          .update(dataToSave)
          .eq("id", reportId);
        if (error) throw error;
        toast.success("Bericht gespeichert");
      }

      navigate("/admin/reports");
    } catch (error) {
      console.error("Error saving report:", error);
      toast.error("Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  const exportToPDF = () => {
    const participant = participants.find((p) => p.id === report.user_id);
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(20);
    doc.text("QUIDZ Teilnehmerbericht", 20, 20);
    
    // Meta info
    doc.setFontSize(12);
    doc.text(`Teilnehmer: ${participant?.full_name || "Unbekannt"}`, 20, 35);
    doc.text(`Zeitraum: ${format(new Date(report.period_start), "dd.MM.yyyy")} - ${format(new Date(report.period_end), "dd.MM.yyyy")}`, 20, 42);
    doc.text(`Programm: ${report.program_type}`, 20, 49);
    
    let yPos = 65;
    
    // Sections
    const addSection = (title: string, content: string) => {
      if (!content) return;
      if (yPos > 260) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(title, 20, yPos);
      yPos += 8;
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(content, 170);
      doc.text(lines, 20, yPos);
      yPos += lines.length * 6 + 10;
    };

    // Attendance
    const attendanceSummary = report.attendance_summary as { absences_count?: number };
    addSection("Anwesenheit & Struktur", 
      `Absenzen im Zeitraum: ${attendanceSummary.absences_count || 0}\n${report.attendance_notes || ""}`
    );
    
    // Tasks
    const tasksSummary = report.tasks_summary as { total?: number; completed?: number };
    addSection("Aktivitäten & Aufgaben", 
      `Aufgaben: ${tasksSummary.total || 0} (${tasksSummary.completed || 0} erledigt)\n${report.tasks_notes || ""}`
    );
    
    // Skills
    const skillsSummary = report.skills_summary as { total?: number; validated?: number; integration_relevant?: number };
    addSection("Skills & Entwicklung", 
      `Skills: ${skillsSummary.total || 0} (${skillsSummary.validated || 0} validiert, ${skillsSummary.integration_relevant || 0} integrationsrelevant)\n${report.skills_notes || ""}`
    );
    
    addSection("Lernen & Inhalte", report.learning_notes || "");
    addSection("Verhalten & Arbeitshaltung", report.behavior_notes || "");
    addSection("Stimmung & Stabilität", report.mood_summary || "");
    addSection("Gesamtbeurteilung", report.overall_assessment || "");
    addSection("Ausblick & nächste Schritte", report.outlook || "");
    
    // Footer
    doc.setFontSize(9);
    doc.setTextColor(128);
    doc.text(`Erstellt am: ${format(new Date(), "dd.MM.yyyy HH:mm")}`, 20, 285);
    
    doc.save(`Bericht_${participant?.full_name || "Teilnehmer"}_${format(new Date(report.period_start), "yyyy-MM")}.pdf`);
    toast.success("PDF exportiert");
  };

  const getAverageMood = () => {
    if (moodEntries.length === 0) return null;
    const avg = moodEntries.reduce((sum, e) => sum + e.mood_value, 0) / moodEntries.length;
    return avg.toFixed(1);
  };

  const getMoodLabel = (value: number) => {
    if (value >= 4) return "Sehr gut";
    if (value >= 3) return "Gut";
    if (value >= 2) return "Neutral";
    if (value >= 1) return "Angespannt";
    return "Schwierig";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const selectedParticipant = participants.find((p) => p.id === report.user_id);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/reports")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6" />
              {isNew ? "Neuer Bericht" : "Bericht bearbeiten"}
            </h1>
            {selectedParticipant && (
              <p className="text-muted-foreground">
                {selectedParticipant.full_name || selectedParticipant.email}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToPDF} disabled={!report.user_id}>
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
          <Button variant="outline" onClick={() => handleSave()} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Entwurf speichern
          </Button>
          <Button onClick={() => handleSave("final")} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
            Abschliessen
          </Button>
        </div>
      </div>

      {/* Section 1: Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Basisinformationen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Teilnehmer *</Label>
              <Select
                value={report.user_id}
                onValueChange={(value) => setReport((prev) => ({ ...prev, user_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Teilnehmer auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {participants.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.full_name || p.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Programmtyp</Label>
              <Select
                value={report.program_type}
                onValueChange={(value) => setReport((prev) => ({ ...prev, program_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="arbeitstraining">Arbeitstraining</SelectItem>
                  <SelectItem value="abklaerung">Abklärung</SelectItem>
                  <SelectItem value="integration">Integration</SelectItem>
                  <SelectItem value="coaching">Coaching</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Berichtszeitraum von</Label>
              <Input
                type="date"
                value={report.period_start}
                onChange={(e) => setReport((prev) => ({ ...prev, period_start: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Berichtszeitraum bis</Label>
              <Input
                type="date"
                value={report.period_end}
                onChange={(e) => setReport((prev) => ({ ...prev, period_end: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Attendance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Anwesenheit & Struktur
          </CardTitle>
          <CardDescription>
            Automatisch aus dem System: {absences.length} Absenzen im Zeitraum
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {absences.length > 0 && (
            <div className="bg-muted p-4 rounded-lg space-y-2">
              {absences.map((absence) => (
                <div key={absence.id} className="flex justify-between items-center text-sm">
                  <span>{format(new Date(absence.date), "dd.MM.yyyy", { locale: de })}</span>
                  <span className="text-muted-foreground">{absence.reason || "Kein Grund angegeben"}</span>
                  <Badge variant={absence.approved ? "default" : "secondary"}>
                    {absence.approved ? "Entschuldigt" : "Unentschuldigt"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
          <div className="space-y-2">
            <Label>Kommentar zu Anwesenheit & Struktur</Label>
            <Textarea
              placeholder="Auffälligkeiten, Stabilität, Schwankungen..."
              value={report.attendance_notes}
              onChange={(e) => setReport((prev) => ({ ...prev, attendance_notes: e.target.value }))}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Aktivitäten & Aufgaben
          </CardTitle>
          <CardDescription>
            {tasks.length} Aufgaben im Zeitraum • {tasks.filter((t) => t.status === "done").length} erledigt
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {tasks.length > 0 && (
            <div className="bg-muted p-4 rounded-lg space-y-2 max-h-48 overflow-y-auto">
              {tasks.map((task) => (
                <div key={task.id} className="flex justify-between items-center text-sm">
                  <span className="truncate flex-1">{task.title}</span>
                  <Badge
                    variant={task.status === "done" ? "default" : task.status === "in_progress" ? "secondary" : "outline"}
                  >
                    {task.status === "done" ? "Erledigt" : task.status === "in_progress" ? "In Arbeit" : "Offen"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
          <div className="space-y-2">
            <Label>Beobachtungen zur Arbeitsweise</Label>
            <Textarea
              placeholder="Arbeitsweise, Selbstständigkeit, Zuverlässigkeit..."
              value={report.tasks_notes}
              onChange={(e) => setReport((prev) => ({ ...prev, tasks_notes: e.target.value }))}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Section 4: Skills */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Skills & Entwicklung
          </CardTitle>
          <CardDescription>
            {skills.length} Skills gesamt • {skills.filter((s) => s.is_integration_relevant).length} integrationsrelevant
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {skills.length > 0 && (
            <div className="bg-muted p-4 rounded-lg space-y-2 max-h-48 overflow-y-auto">
              {skills.map((skill) => (
                <div key={skill.id} className="flex justify-between items-center text-sm">
                  <span className="truncate flex-1">{skill.title}</span>
                  <div className="flex gap-2">
                    {skill.is_integration_relevant && (
                      <Badge variant="default">Integrationsrelevant</Badge>
                    )}
                    <Badge variant="outline">{skill.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="space-y-2">
            <Label>Beschreibung der Skill-Entwicklung</Label>
            <Textarea
              placeholder="Wie zeigen sich die Skills in der Praxis? Entwicklung im Berichtszeitraum..."
              value={report.skills_notes}
              onChange={(e) => setReport((prev) => ({ ...prev, skills_notes: e.target.value }))}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Section 5: Learning */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Lernen & Inhalte
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Einschätzung zu Lernbereitschaft & Umsetzung</Label>
            <Textarea
              placeholder="Lernbereitschaft, Verständnis, Umsetzung in die Praxis..."
              value={report.learning_notes}
              onChange={(e) => setReport((prev) => ({ ...prev, learning_notes: e.target.value }))}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Section 6: Behavior */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Verhalten & Arbeitshaltung
          </CardTitle>
          <CardDescription>
            Beobachtend, nicht wertend formuliert
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Beobachtungen</Label>
            <Textarea
              placeholder="Arbeitsstruktur, Umgang mit Feedback, Konzentration & Belastbarkeit, Sozialverhalten im Kontext..."
              value={report.behavior_notes}
              onChange={(e) => setReport((prev) => ({ ...prev, behavior_notes: e.target.value }))}
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Section 7: Mood */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Stimmung & Stabilität
          </CardTitle>
          <CardDescription>
            {moodEntries.length > 0 ? (
              <>Durchschnittliche Stimmung im Zeitraum: {getAverageMood()} ({getMoodLabel(parseFloat(getAverageMood() || "0"))})</>
            ) : (
              "Keine Stimmungsdaten im Zeitraum"
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Coach-Einschätzung zur Stabilität</Label>
            <Textarea
              placeholder="Stabil, schwankend, angespannt? Keine medizinische Bewertung."
              value={report.mood_summary}
              onChange={(e) => setReport((prev) => ({ ...prev, mood_summary: e.target.value }))}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Section 8: Overall Assessment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Gesamtbeurteilung
          </CardTitle>
          <CardDescription>
            Qualitative Zusammenfassung
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Zusammenfassung</Label>
            <Textarea
              placeholder="Wo steht die Person aktuell? Welche Entwicklung ist sichtbar? Wo besteht weiterer Unterstützungsbedarf?"
              value={report.overall_assessment}
              onChange={(e) => setReport((prev) => ({ ...prev, overall_assessment: e.target.value }))}
              rows={5}
            />
          </div>
        </CardContent>
      </Card>

      {/* Section 9: Outlook */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Ausblick & nächste Schritte
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Geplante Massnahmen & Empfehlungen</Label>
            <Textarea
              placeholder="Zielrichtung für nächsten Zeitraum, offene Fragen, Empfehlungen..."
              value={report.outlook}
              onChange={(e) => setReport((prev) => ({ ...prev, outlook: e.target.value }))}
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Footer Actions */}
      <div className="flex justify-end gap-4 pb-8">
        <Button variant="outline" onClick={() => navigate("/admin/reports")}>
          Abbrechen
        </Button>
        <Button variant="outline" onClick={() => handleSave()} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Als Entwurf speichern
        </Button>
        <Button onClick={() => handleSave("final")} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
          Bericht abschliessen
        </Button>
      </div>
    </div>
  );
};

export default ReportEditor;
