import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Download, Users, TrendingUp, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Switch } from "@/components/ui/switch";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from "recharts";

export default function AdminFeedback() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newQuestion, setNewQuestion] = useState({
    question_text: "",
    type: "text",
    options: "",
    target_user: "",
    active_from: new Date().toISOString().slice(0, 16),
    active_until: "",
    is_active: true,
  });

  const { data: user } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: questions } = useQuery({
    queryKey: ["allQuestions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feedback_questions")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: answers } = useQuery({
    queryKey: ["allAnswers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feedback_answers")
        .select(`
          *,
          feedback_questions (question_text, type),
          profiles:user_id (full_name, email)
        `)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: moodData } = useQuery({
    queryKey: ["allMoodData"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mood_entries")
        .select(`
          *,
          profiles:user_id (full_name, email)
        `)
        .order("created_at", { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data;
    },
  });

  const { data: users } = useQuery({
    queryKey: ["allUsers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*");
      
      if (error) throw error;
      return data;
    },
  });

  const createQuestionMutation = useMutation({
    mutationFn: async () => {
      const questionData: any = {
        question_text: newQuestion.question_text,
        type: newQuestion.type,
        active_from: newQuestion.active_from,
        active_until: newQuestion.active_until || null,
        is_active: newQuestion.is_active,
        created_by: user?.id,
      };

      if (newQuestion.type === "multiple_choice" && newQuestion.options) {
        questionData.options = newQuestion.options.split("\n").filter(o => o.trim());
      }

      if (newQuestion.target_user) {
        questionData.target_user = newQuestion.target_user;
      }

      const { error } = await supabase
        .from("feedback_questions")
        .insert(questionData);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allQuestions"] });
      setIsDialogOpen(false);
      setNewQuestion({
        question_text: "",
        type: "text",
        options: "",
        target_user: "",
        active_from: new Date().toISOString().slice(0, 16),
        active_until: "",
        is_active: true,
      });
      toast({
        title: "Frage erstellt",
        description: "Die Feedbackfrage wurde erfolgreich erstellt.",
      });
    },
  });

  const exportCSV = () => {
    if (!answers) return;

    const csv = [
      ["Datum", "Benutzer", "Frage", "Antwort", "Mood"],
      ...answers.map(a => [
        format(new Date(a.created_at), "dd.MM.yyyy HH:mm", { locale: de }),
        (a.profiles as any)?.full_name || (a.profiles as any)?.email || "Unbekannt",
        (a.feedback_questions as any)?.question_text || "",
        a.answer_text || "",
        a.mood_value?.toString() || "",
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `feedback-export-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  const avgMood = moodData?.reduce((sum, entry) => sum + entry.mood_value, 0) / (moodData?.length || 1);
  
  const moodByDay = moodData?.reduce((acc: any, entry) => {
    const date = format(new Date(entry.created_at), "dd.MM", { locale: de });
    if (!acc[date]) acc[date] = [];
    acc[date].push(entry.mood_value);
    return acc;
  }, {});

  const chartData = Object.entries(moodByDay || {}).map(([date, values]: [string, any]) => ({
    date,
    durchschnitt: values.reduce((a: number, b: number) => a + b, 0) / values.length,
  })).reverse().slice(0, 14);

  const lowMoodUsers = moodData?.filter(entry => entry.mood_value <= 2)
    .reduce((acc: any, entry) => {
      const userId = entry.user_id;
      if (!acc[userId]) acc[userId] = { count: 0, user: entry.profiles };
      acc[userId].count++;
      return acc;
    }, {});

  const alerts = Object.entries(lowMoodUsers || {})
    .filter(([_, data]: [string, any]) => data.count >= 3)
    .map(([userId, data]: [string, any]) => ({ userId, ...data }));

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Feedback-Verwaltung</h1>
          <p className="text-muted-foreground">Fragen erstellen und Antworten auswerten</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Neue Frage
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Neue Feedbackfrage erstellen</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Fragetext</Label>
                <Textarea
                  value={newQuestion.question_text}
                  onChange={(e) => setNewQuestion({ ...newQuestion, question_text: e.target.value })}
                  placeholder="Was lief diese Woche besonders gut?"
                  rows={3}
                />
              </div>

              <div>
                <Label>Fragetyp</Label>
                <Select
                  value={newQuestion.type}
                  onValueChange={(value) => setNewQuestion({ ...newQuestion, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Freitext</SelectItem>
                    <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                    <SelectItem value="mood">Stimmung (1-5)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newQuestion.type === "multiple_choice" && (
                <div>
                  <Label>Antwortoptionen (eine pro Zeile)</Label>
                  <Textarea
                    value={newQuestion.options}
                    onChange={(e) => setNewQuestion({ ...newQuestion, options: e.target.value })}
                    placeholder="Option 1&#10;Option 2&#10;Option 3"
                    rows={4}
                  />
                </div>
              )}

              <div>
                <Label>Zielgruppe</Label>
                <Select
                  value={newQuestion.target_user}
                  onValueChange={(value) => setNewQuestion({ ...newQuestion, target_user: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Alle Benutzer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Alle Benutzer</SelectItem>
                    {users?.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.full_name || u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Aktiv ab</Label>
                  <Input
                    type="datetime-local"
                    value={newQuestion.active_from}
                    onChange={(e) => setNewQuestion({ ...newQuestion, active_from: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Aktiv bis (optional)</Label>
                  <Input
                    type="datetime-local"
                    value={newQuestion.active_until}
                    onChange={(e) => setNewQuestion({ ...newQuestion, active_until: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={newQuestion.is_active}
                  onCheckedChange={(checked) => setNewQuestion({ ...newQuestion, is_active: checked })}
                />
                <Label>Frage ist aktiv</Label>
              </div>

              <Button 
                onClick={() => createQuestionMutation.mutate()}
                disabled={!newQuestion.question_text}
                className="w-full"
              >
                Frage erstellen
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="questions" className="space-y-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="questions">Fragen</TabsTrigger>
          <TabsTrigger value="answers">Antworten</TabsTrigger>
          <TabsTrigger value="mood">Stimmung</TabsTrigger>
          <TabsTrigger value="users">Teilnehmer</TabsTrigger>
        </TabsList>

        <TabsContent value="questions">
          <Card>
            <CardHeader>
              <CardTitle>Alle Feedbackfragen</CardTitle>
              <CardDescription>Verwalte deine erstellten Fragen</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Frage</TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Aktiv ab</TableHead>
                    <TableHead>Aktiv bis</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {questions?.map((q) => (
                    <TableRow key={q.id}>
                      <TableCell className="font-medium">{q.question_text}</TableCell>
                      <TableCell>{q.type}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${q.is_active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                          {q.is_active ? 'Aktiv' : 'Inaktiv'}
                        </span>
                      </TableCell>
                      <TableCell>{format(new Date(q.active_from), "dd.MM.yyyy HH:mm", { locale: de })}</TableCell>
                      <TableCell>{q.active_until ? format(new Date(q.active_until), "dd.MM.yyyy HH:mm", { locale: de }) : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="answers">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Alle Antworten</CardTitle>
                <CardDescription>{answers?.length || 0} Antworten insgesamt</CardDescription>
              </div>
              <Button onClick={exportCSV} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                CSV Export
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Benutzer</TableHead>
                    <TableHead>Frage</TableHead>
                    <TableHead>Antwort</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {answers?.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>{format(new Date(a.created_at), "dd.MM.yyyy HH:mm", { locale: de })}</TableCell>
                      <TableCell>{(a.profiles as any)?.full_name || (a.profiles as any)?.email}</TableCell>
                      <TableCell>{(a.feedback_questions as any)?.question_text}</TableCell>
                      <TableCell>
                        {a.mood_value ? `Mood: ${a.mood_value}/5` : a.answer_text}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mood" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Durchschnittliche Stimmung</CardTitle>
                <CardDescription>Über alle Teilnehmenden</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold">{avgMood?.toFixed(1) || 0}/5</div>
              </CardContent>
            </Card>

            {alerts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Warnungen
                  </CardTitle>
                  <CardDescription>Teilnehmende mit niedriger Stimmung</CardDescription>
                </CardHeader>
                <CardContent>
                  {alerts.map((alert: any) => (
                    <div key={alert.userId} className="mb-2">
                      <span className="font-medium">{alert.user?.full_name || alert.user?.email}</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        {alert.count}× niedrige Werte
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Stimmungsverlauf (14 Tage)</CardTitle>
              <CardDescription>Durchschnittliche Stimmung pro Tag</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[1, 5]} />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="durchschnitt" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Teilnehmerübersicht</CardTitle>
              <CardDescription>Feedback-Aktivität pro Benutzer</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>E-Mail</TableHead>
                    <TableHead>Antworten</TableHead>
                    <TableHead>Ø Stimmung</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users?.map((u) => {
                    const userAnswers = answers?.filter(a => a.user_id === u.id) || [];
                    const userMood = moodData?.filter(m => m.user_id === u.id) || [];
                    const avgUserMood = userMood.length > 0 
                      ? userMood.reduce((sum, m) => sum + m.mood_value, 0) / userMood.length 
                      : null;

                    return (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.full_name || '-'}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>{userAnswers.length}</TableCell>
                        <TableCell>{avgUserMood ? avgUserMood.toFixed(1) : '-'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}