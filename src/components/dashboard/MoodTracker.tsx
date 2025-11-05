import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Smile, Meh, Frown } from "lucide-react";
import { toast } from "sonner";

interface MoodTrackerProps {
  userId: string;
}

const MoodTracker = ({ userId }: MoodTrackerProps) => {
  const [moodValue, setMoodValue] = useState(5);
  const queryClient = useQueryClient();

  const submitMoodMutation = useMutation({
    mutationFn: async (mood: number) => {
      const { error } = await supabase
        .from("mood_entries")
        .insert({
          user_id: userId,
          mood_value: mood,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["moodEntries"] });
      toast.success("Stimmung erfolgreich gespeichert");
      setMoodValue(5);
    },
    onError: () => {
      toast.error("Fehler beim Speichern der Stimmung");
    },
  });

  const getMoodIcon = () => {
    if (moodValue <= 3) return <Frown className="w-8 h-8 text-destructive" />;
    if (moodValue <= 7) return <Meh className="w-8 h-8 text-primary" />;
    return <Smile className="w-8 h-8 text-secondary" />;
  };

  const getMoodLabel = () => {
    if (moodValue <= 3) return "Schlecht";
    if (moodValue <= 5) return "Geht so";
    if (moodValue <= 7) return "Gut";
    return "Sehr gut";
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getMoodIcon()}
          Stimmungs-Tracker
        </CardTitle>
        <CardDescription>Wie fühlst du dich gerade?</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Stimmung:</span>
            <span className="text-2xl font-bold">{moodValue}/10</span>
          </div>
          <div className="text-center">
            <span className="text-lg font-medium">{getMoodLabel()}</span>
          </div>
          <Slider
            value={[moodValue]}
            onValueChange={(value) => setMoodValue(value[0])}
            min={1}
            max={10}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Sehr schlecht</span>
            <span>Sehr gut</span>
          </div>
        </div>
        <Button
          onClick={() => submitMoodMutation.mutate(moodValue)}
          disabled={submitMoodMutation.isPending}
          className="w-full"
        >
          Stimmung speichern
        </Button>
      </CardContent>
    </Card>
  );
};

export default MoodTracker;
