import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  BookOpen, 
  Target, 
  MessageSquare, 
  Calendar, 
  Briefcase, 
  FileText,
  CheckCircle2,
  TrendingUp,
  Shield,
  Zap,
  Heart
} from "lucide-react";
import logo from "@/assets/logoquidz.png";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in">
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 blur-3xl rounded-full"></div>
              <img src={logo} alt="QUIDZ Logo" className="w-32 h-32 object-contain relative z-10 hover-scale" />
            </div>
          </div>
          
          <div className="space-y-4">
            <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              QUIDZ
            </h1>
            <p className="text-2xl md:text-3xl font-semibold text-foreground">
              Berufsintegrationsprogramm
            </p>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Ihre umfassende digitale Plattform für Ausbildung, persönliche Entwicklung und Karriereaufbau. 
              Alles was Sie brauchen, zentral und übersichtlich organisiert.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button 
              size="lg" 
              onClick={() => navigate("/auth")}
              className="text-lg px-8 shadow-glow hover-scale"
            >
              <CheckCircle2 className="w-5 h-5 mr-2" />
              Jetzt starten
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => navigate("/auth")}
              className="text-lg px-8 hover-scale"
            >
              Anmelden
            </Button>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-24 max-w-4xl mx-auto">
          <Card className="text-center shadow-card hover-scale">
            <CardContent className="pt-6">
              <div className="text-4xl font-bold text-primary mb-2">100%</div>
              <p className="text-muted-foreground">Digital</p>
            </CardContent>
          </Card>
          <Card className="text-center shadow-card hover-scale">
            <CardContent className="pt-6">
              <div className="text-4xl font-bold text-secondary mb-2">24/7</div>
              <p className="text-muted-foreground">Verfügbar</p>
            </CardContent>
          </Card>
          <Card className="text-center shadow-card hover-scale">
            <CardContent className="pt-6">
              <div className="text-4xl font-bold text-accent mb-2">∞</div>
              <p className="text-muted-foreground">Möglichkeiten</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Features */}
        <div className="mt-32 max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Alle Funktionen auf einen Blick
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Eine vollständige Plattform für Ihre berufliche Entwicklung und Organisation
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Aufgabenverwaltung */}
            <Card className="shadow-card hover:shadow-glow transition-all hover-scale group">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Target className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Aufgabenverwaltung</CardTitle>
                <CardDescription>
                  Behalten Sie den Überblick über alle Aufgaben und Deadlines. 
                  Mit Prioritäten, Kategorien und Status-Tracking.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Portfolio */}
            <Card className="shadow-card hover:shadow-glow transition-all hover-scale group">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-secondary/20 to-secondary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Briefcase className="w-6 h-6 text-secondary" />
                </div>
                <CardTitle>Portfolio & Projekte</CardTitle>
                <CardDescription>
                  Erstellen Sie Ihr persönliches Portfolio. Präsentieren Sie Ihre Projekte 
                  mit Bildern, Beschreibungen und Links.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Dokumente */}
            <Card className="shadow-card hover:shadow-glow transition-all hover-scale group">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-accent/20 to-accent/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <FileText className="w-6 h-6 text-accent" />
                </div>
                <CardTitle>Dokumentenverwaltung</CardTitle>
                <CardDescription>
                  Zugriff auf alle wichtigen Dokumente und Unterlagen. 
                  Organisiert nach Kategorien und durchsuchbar.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Chat */}
            <Card className="shadow-card hover:shadow-glow transition-all hover-scale group">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <MessageSquare className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Team-Chat</CardTitle>
                <CardDescription>
                  Kommunizieren Sie direkt mit Ihrem Team und Coach. 
                  Echtzeit-Messaging für schnelle Abstimmungen.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Abwesenheiten */}
            <Card className="shadow-card hover:shadow-glow transition-all hover-scale group">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-secondary/20 to-accent/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Calendar className="w-6 h-6 text-secondary" />
                </div>
                <CardTitle>Abwesenheitsverwaltung</CardTitle>
                <CardDescription>
                  Verwalten Sie Ihre Abwesenheiten einfach und transparent. 
                  Mit Genehmigungsstatus und Übersicht.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Betreuung */}
            <Card className="shadow-card hover:shadow-glow transition-all hover-scale group">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-accent/20 to-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Users className="w-6 h-6 text-accent" />
                </div>
                <CardTitle>Persönliche Betreuung</CardTitle>
                <CardDescription>
                  Individuelle Unterstützung durch Ihr Betreuungsteam. 
                  Coaching und Feedback genau dann, wenn Sie es brauchen.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="mt-32 max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ihre Vorteile
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex gap-4 p-6 rounded-xl bg-card border shadow-card hover-scale">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Fortschritt sichtbar machen</h3>
                <p className="text-muted-foreground">
                  Verfolgen Sie Ihre Entwicklung mit übersichtlichen Dashboards und Progress-Tracking.
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-6 rounded-xl bg-card border shadow-card hover-scale">
              <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center flex-shrink-0">
                <Zap className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Effizient & Zeitsparend</h3>
                <p className="text-muted-foreground">
                  Alle wichtigen Informationen an einem Ort. Keine verstreuten Dokumente mehr.
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-6 rounded-xl bg-card border shadow-card hover-scale">
              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                <Shield className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Sicher & Zuverlässig</h3>
                <p className="text-muted-foreground">
                  Ihre Daten sind geschützt und jederzeit verfügbar. DSGVO-konform.
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-6 rounded-xl bg-card border shadow-card hover-scale">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Heart className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Benutzerfreundlich</h3>
                <p className="text-muted-foreground">
                  Intuitive Bedienung, moderne Oberfläche. Einfach zu nutzen, auch ohne Vorkenntnisse.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-32 max-w-4xl mx-auto">
          <Card className="bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 border-primary/20 shadow-glow">
            <CardContent className="p-12 text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Bereit durchzustarten?
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                Werden Sie Teil von QUIDZ und nutzen Sie alle Funktionen für Ihre berufliche Entwicklung.
              </p>
              <Button 
                size="lg" 
                onClick={() => navigate("/auth")}
                className="text-lg px-12 shadow-glow hover-scale"
              >
                Kostenlos registrieren
              </Button>
            </CardContent>
          </Card>
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
