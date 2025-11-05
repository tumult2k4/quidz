import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageCircle, TrendingUp, History, Smile, Meh, Frown } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

export default function Feedback() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [moodValue, setMoodValue] = useState([5]);

  const { data: user } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: activeQuestions } = useQuery({
    queryKey: ["activeQuestions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feedback_questions")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: myAnswers } = useQuery({
    queryKey: ["myAnswers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feedback_answers")
        .select(`
          *,
          feedback_questions (question_text, type)
        `)
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: moodEntries } = useQuery({
    queryKey: ["moodEntries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mood_entries")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(30);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const submitAnswerMutation = useMutation({
    mutationFn: async ({ questionId, answerText, moodValue }: { 
      questionId: string; 
      answerText?: string; 
      moodValue?: number;
    }) => {
      const { error } = await supabase
        .from("feedback_answers")
        .insert({
          user_id: user?.id,
          question_id: questionId,
          answer_text: answerText,
          mood_value: moodValue,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myAnswers"] });
      setAnswers({});
      toast({
        title: "Danke!",
        description: "Dein Feedback wurde gespeichert.",
      });
    },
  });

  const submitMoodMutation = useMutation({
    mutationFn: async (mood: number) => {
      const { error } = await supabase
        .from("mood_entries")
        .insert({
          user_id: user?.id,
          mood_value: mood,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["moodEntries"] });
      toast({
        title: "Stimmung gespeichert",
        description: "Deine heutige Stimmung wurde erfasst.",
      });
    },
  });

  const handleSubmitAnswer = (questionId: string, type: string) => {
    if (type === "mood") {
      const moodValue = answers[questionId] ? parseInt(answers[questionId]) : 5;
      submitAnswerMutation.mutate({
        questionId,
        moodValue,
      });
    } else {
      if (!answers[questionId]) return;
      submitAnswerMutation.mutate({
        questionId,
        answerText: answers[questionId],
      });
    }
  };

  const getMoodEmoji = (value: number) => {
    if (value <= 3) return <Frown className="h-8 w-8 text-destructive" />;
    if (value <= 6) return <Meh className="h-8 w-8 text-muted-foreground" />;
    return <Smile className="h-8 w-8 text-primary" />;
  };

  const chartData = moodEntries?.map(entry => ({
    date: format(new Date(entry.created_at), "dd.MM", { locale: de }),
    stimmung: entry.mood_value,
  })).reverse() || [];

  const answeredQuestionIds = new Set(myAnswers?.map(a => a.question_id) || []);
  const unansweredQuestions = activeQuestions?.filter(q => !answeredQuestionIds.has(q.id)) || [];

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Mein Feedback</h1>
        <p className="text-muted-foreground">Teile deine Gedanken und Stimmung mit uns</p>
      </div>

      <Tabs defaultValue="questions" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="questions">
            <MessageCircle className="h-4 w-4 mr-2" />
            Fragen
          </TabsTrigger>
          <TabsTrigger value="mood">
            <TrendingUp className="h-4 w-4 mr-2" />
            Stimmung
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" />
            Verlauf
          </TabsTrigger>
        </TabsList>

        <TabsContent value="questions" className="space-y-4">
          {unansweredQuestions.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  Aktuell gibt es keine offenen Feedbackfragen.
                </p>
              </CardContent>
            </Card>
          ) : (
            unansweredQuestions.map((question) => (
              <Card key={question.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{question.question_text}</CardTitle>
                  <CardDescription>
                    Verfügbar bis {question.active_until ? format(new Date(question.active_until), "dd.MM.yyyy HH:mm", { locale: de }) : "unbegrenzt"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {question.type === "text" && (
                    <Textarea
                      placeholder="Deine Antwort..."
                      value={answers[question.id] || ""}
                      onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })}
                      rows={4}
                    />
                  )}
                  
                  {question.type === "multiple_choice" && question.options && (
                    <RadioGroup
                      value={answers[question.id]}
                      onValueChange={(value) => setAnswers({ ...answers, [question.id]: value })}
                    >
                      {(question.options as string[]).map((option, idx) => (
                        <div key={idx} className="flex items-center space-x-2">
                          <RadioGroupItem value={option} id={`${question.id}-${idx}`} />
                          <Label htmlFor={`${question.id}-${idx}`}>{option}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  )}
                  
                  {question.type === "mood" && (
                    <div className="space-y-4">
                      <div className="flex justify-center">
                        {getMoodEmoji(parseInt(answers[question.id] || "5"))}
                      </div>
                      <Slider
                        min={1}
                        max={10}
                        step={1}
                        defaultValue={[5]}
                        value={answers[question.id] ? [parseInt(answers[question.id])] : undefined}
                        onValueChange={(value) => setAnswers({ ...answers, [question.id]: value[0].toString() })}
                      />
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Ganz schlecht</span>
                        <span>Fantastisch</span>
                      </div>
                    </div>
                  )}
                  
                  <Button 
                    onClick={() => handleSubmitAnswer(question.id, question.type)}
                    disabled={question.type !== "mood" && !answers[question.id]}
                  >
                    Absenden
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="mood" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Täglicher Mood-Tracker</CardTitle>
              <CardDescription>Wie fühlst du dich heute?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-center">
                {getMoodEmoji(moodValue[0])}
              </div>
              <Slider
                min={1}
                max={10}
                step={1}
                value={moodValue}
                onValueChange={setMoodValue}
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Ganz schlecht</span>
                <span>Fantastisch</span>
              </div>
              <Button 
                onClick={() => submitMoodMutation.mutate(moodValue[0])}
                className="w-full"
              >
                Stimmung speichern
              </Button>
            </CardContent>
          </Card>

          {chartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Stimmungsverlauf</CardTitle>
                <CardDescription>Deine Stimmung der letzten 30 Tage</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[1, 10]} />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="stimmung" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {!myAnswers || myAnswers.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  Du hast noch keine Feedbacks abgegeben.
                </p>
              </CardContent>
            </Card>
          ) : (
            myAnswers.map((answer) => (
              <Card key={answer.id}>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {answer.feedback_questions?.question_text}
                  </CardTitle>
                  <CardDescription>
                    {format(new Date(answer.created_at), "dd.MM.yyyy HH:mm", { locale: de })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {answer.feedback_questions?.type === "mood" ? (
                    <div className="flex items-center gap-2">
                      {getMoodEmoji(answer.mood_value || 5)}
                      <span className="font-medium">Stimmung: {answer.mood_value}/10</span>
                    </div>
                  ) : (
                    <p className="text-sm">{answer.answer_text}</p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}