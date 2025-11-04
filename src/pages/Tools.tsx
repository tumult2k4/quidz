import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wrench, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface Tool {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  web_link: string;
}

const Tools = () => {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTools = async () => {
      const { data, error } = await supabase
        .from("tools")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        toast.error("Fehler beim Laden der Werkzeuge");
        console.error(error);
        return;
      }

      setTools(data || []);
      setLoading(false);
    };

    fetchTools();
  }, []);

  if (loading) {
    return <div className="p-8">Lädt...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Wrench className="w-8 h-8 text-primary" />
          Werkzeuge
        </h1>
        <p className="text-muted-foreground mt-2">
          Hilfreiche Werkzeuge für Ihre Arbeit
        </p>
      </div>

      {tools.length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="p-12 text-center text-muted-foreground">
            <Wrench className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>Noch keine Werkzeuge verfügbar</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {tools.map((tool) => (
            <Card key={tool.id} className="shadow-card hover:shadow-lg transition-shadow group">
              <CardHeader className="p-3">
                {tool.image_url && (
                  <img 
                    src={tool.image_url} 
                    alt={tool.title} 
                    className="w-full h-20 object-cover rounded mb-2"
                  />
                )}
                <CardTitle className="text-sm flex items-center gap-1">
                  <Wrench className="w-3 h-3 text-primary flex-shrink-0" />
                  <span className="truncate">{tool.title}</span>
                </CardTitle>
                {tool.description && (
                  <CardDescription className="text-xs line-clamp-2">
                    {tool.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <a 
                  href={tool.web_link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full"
                >
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full text-xs group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Öffnen
                  </Button>
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Tools;
