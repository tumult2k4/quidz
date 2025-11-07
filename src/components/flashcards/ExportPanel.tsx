import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileText, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import Papa from "papaparse";

interface Flashcard {
  id: string;
  front_text: string;
  back_text: string;
  category_id: string | null;
  is_public: boolean;
  created_at: string;
  categories?: { name: string } | null;
}

interface ExportPanelProps {
  flashcards: Flashcard[];
  title?: string;
}

export function ExportPanel({ flashcards, title = "Meine Lernkarten" }: ExportPanelProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const exportToPDF = () => {
    setLoading(true);
    try {
      const doc = new jsPDF();
      const pageHeight = doc.internal.pageSize.height;
      let yPosition = 20;

      // Title
      doc.setFontSize(18);
      doc.text(title, 20, yPosition);
      yPosition += 15;

      doc.setFontSize(10);
      doc.text(`Exportiert am: ${new Date().toLocaleDateString("de-DE")}`, 20, yPosition);
      yPosition += 15;

      // Flashcards
      doc.setFontSize(12);
      flashcards.forEach((card, index) => {
        // Check if we need a new page
        if (yPosition > pageHeight - 40) {
          doc.addPage();
          yPosition = 20;
        }

        // Card number
        doc.setFont("helvetica", "bold");
        doc.text(`Karte ${index + 1}`, 20, yPosition);
        yPosition += 7;

        // Category
        if (card.categories?.name) {
          doc.setFont("helvetica", "italic");
          doc.setFontSize(10);
          doc.text(`Kategorie: ${card.categories.name}`, 20, yPosition);
          yPosition += 7;
        }

        // Question
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text("Frage:", 20, yPosition);
        yPosition += 5;
        doc.setFont("helvetica", "normal");
        const frontLines = doc.splitTextToSize(card.front_text, 170);
        doc.text(frontLines, 20, yPosition);
        yPosition += frontLines.length * 5 + 5;

        // Answer
        doc.setFont("helvetica", "bold");
        doc.text("Antwort:", 20, yPosition);
        yPosition += 5;
        doc.setFont("helvetica", "normal");
        const backLines = doc.splitTextToSize(card.back_text, 170);
        doc.text(backLines, 20, yPosition);
        yPosition += backLines.length * 5 + 10;
      });

      doc.save(`${title.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`);
      
      toast({
        title: "Export erfolgreich",
        description: "PDF wurde heruntergeladen",
      });
    } catch (error) {
      toast({
        title: "Fehler",
        description: "PDF konnte nicht erstellt werden",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    setLoading(true);
    try {
      const csvData = flashcards.map((card) => ({
        Frage: card.front_text,
        Antwort: card.back_text,
        Kategorie: card.categories?.name || "Keine Kategorie",
        Öffentlich: card.is_public ? "Ja" : "Nein",
        Erstellt: new Date(card.created_at).toLocaleDateString("de-DE"),
      }));

      const csv = Papa.unparse(csvData, {
        delimiter: ";",
        header: true,
      });

      const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `${title.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export erfolgreich",
        description: "CSV wurde heruntergeladen",
      });
    } catch (error) {
      toast({
        title: "Fehler",
        description: "CSV konnte nicht erstellt werden",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (flashcards.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Export
        </CardTitle>
      </CardHeader>
      <CardContent className="flex gap-2">
        <Button
          variant="outline"
          onClick={exportToPDF}
          disabled={loading}
          className="flex-1"
        >
          <FileText className="h-4 w-4 mr-2" />
          Als PDF
        </Button>
        <Button
          variant="outline"
          onClick={exportToCSV}
          disabled={loading}
          className="flex-1"
        >
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Als CSV
        </Button>
      </CardContent>
    </Card>
  );
}
