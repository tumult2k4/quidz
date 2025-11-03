import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Users, BookOpen, Target } from "lucide-react";
import logo from "@/assets/logoquidz.png";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="flex justify-center">
            <img src={logo} alt="QUIDZ Logo" className="w-32 h-32 object-contain" />
          </div>
          
          <div className="space-y-4">
            <h1 className="text-5xl md:text-7xl font-bold text-foreground">
              QUIDZ
            </h1>
            <p className="text-2xl md:text-3xl font-semibold text-foreground">
              Berufsintegrationsprogramm
            </p>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Ihre digitale Plattform für Ausbildung, Arbeit und persönliche Entwicklung. 
              Verwalten Sie Aufgaben, Termine und Lerninhalte an einem zentralen Ort.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button 
              size="lg" 
              onClick={() => navigate("/auth")}
              className="text-lg px-8"
            >
              Jetzt starten
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => navigate("/auth")}
              className="text-lg px-8"
            >
              Anmelden
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24 max-w-5xl mx-auto">
          <div className="p-6 rounded-xl bg-card border shadow-card hover:shadow-glow transition-all">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Target className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Aufgabenverwaltung</h3>
            <p className="text-muted-foreground">
              Behalten Sie den Überblick über Ihre Aufgaben und Ziele. 
              Verfolgen Sie Ihren Fortschritt in Echtzeit.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-card border shadow-card hover:shadow-glow transition-all">
            <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center mb-4">
              <BookOpen className="w-6 h-6 text-secondary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Lerninhalte</h3>
            <p className="text-muted-foreground">
              Zugriff auf alle wichtigen Dokumente und Unterlagen. 
              Organisiert nach Themen und jederzeit verfügbar.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-card border shadow-card hover:shadow-glow transition-all">
            <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Betreuung</h3>
            <p className="text-muted-foreground">
              Direkte Kommunikation mit Ihrem Coach. 
              Unterstützung genau dann, wenn Sie sie brauchen.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t mt-24">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>© 2025 QUIDZ. Alle Rechte vorbehalten.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
