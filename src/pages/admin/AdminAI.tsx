import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Bot, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AdminAI = () => {
  const [botName, setBotName] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from('ai_settings')
      .select('*')
      .limit(1)
      .single();

    if (data) {
      setSettingsId(data.id);
      setBotName(data.bot_name);
      setSystemPrompt(data.system_prompt || '');
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      if (settingsId) {
        const { error } = await supabase
          .from('ai_settings')
          .update({
            bot_name: botName,
            system_prompt: systemPrompt,
            updated_at: new Date().toISOString(),
          })
          .eq('id', settingsId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('ai_settings')
          .insert({
            bot_name: botName,
            system_prompt: systemPrompt,
          });

        if (error) throw error;
      }

      toast({
        title: "Erfolg",
        description: "KI-Einstellungen wurden gespeichert.",
      });
      
      fetchSettings();
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast({
        title: "Fehler",
        description: "Die Einstellungen konnten nicht gespeichert werden.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">KI Assistent Einstellungen</h1>
        <p className="text-muted-foreground">Konfiguriere den KI-Assistenten</p>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>Bot-Konfiguration</CardTitle>
              <CardDescription>Passe den Namen und das Verhalten des Bots an</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="botName">Bot Name</Label>
            <Input
              id="botName"
              value={botName}
              onChange={(e) => setBotName(e.target.value)}
              placeholder="z.B. QUIDZ Assistent"
            />
            <p className="text-xs text-muted-foreground">
              Der Name, unter dem der Bot den Teilnehmern angezeigt wird
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="systemPrompt">System Prompt</Label>
            <Textarea
              id="systemPrompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Du bist ein hilfreicher KI-Assistent..."
              rows={8}
            />
            <p className="text-xs text-muted-foreground">
              Definiere das Verhalten und die Persönlichkeit des Bots
            </p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="font-medium text-sm mb-2">OpenAI API Key</h4>
            <p className="text-xs text-muted-foreground">
              Der OpenAI API Key wurde bereits in den Projekt-Secrets konfiguriert.
              Bei Bedarf kann er in den Einstellungen aktualisiert werden.
            </p>
          </div>

          <Button onClick={handleSave} disabled={loading}>
            <Save className="w-4 h-4 mr-2" />
            {loading ? "Wird gespeichert..." : "Einstellungen speichern"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAI;