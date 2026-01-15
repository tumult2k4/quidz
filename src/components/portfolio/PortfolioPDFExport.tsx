import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import logoImage from "@/assets/logoquidz.png";

interface Skill {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  competence_level: string | null;
  is_integration_relevant: boolean;
  created_at: string;
}

interface Project {
  id: string;
  title: string;
  description: string | null;
  category: string;
  tags: string[];
  project_url: string | null;
  image_url: string | null;
  created_at: string;
  skills?: { id: string; title: string; category: string }[];
}

interface Profile {
  full_name: string | null;
  email: string;
  avatar_url: string | null;
}

const skillCategoryLabels: Record<string, string> = {
  fachkompetenz: "Fachkompetenz",
  methodenkompetenz: "Methodenkompetenz",
  sozialkompetenz: "Sozialkompetenz",
  selbstkompetenz: "Selbstkompetenz",
  sonstiges: "Sonstiges",
};

const skillStatusLabels: Record<string, string> = {
  in_pruefung: "In Prüfung",
  bestaetigt: "Bestätigt",
  abgelehnt: "Abgelehnt",
};

const projectCategoryLabels: Record<string, string> = {
  web_development: "Web Development",
  mobile_app: "Mobile App",
  design: "Design",
  data_science: "Data Science",
  machine_learning: "Machine Learning",
  other: "Sonstiges",
};

// Helper to convert image URL to base64
const imageToBase64 = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

// Helper to load local image as base64
const loadLocalImage = (src: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = src;
  });
};

export function PortfolioPDFExport() {
  const [exporting, setExporting] = useState(false);

  const generatePDF = async () => {
    setExporting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nicht angemeldet");

      // Fetch profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email, avatar_url")
        .eq("id", user.id)
        .single();

      // Fetch skills
      const { data: skills } = await supabase
        .from("skills")
        .select("*")
        .eq("user_id", user.id)
        .order("category", { ascending: true });

      // Fetch projects
      const { data: projects } = await supabase
        .from("projects")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      // Fetch project skills
      const projectsWithSkills: Project[] = await Promise.all(
        (projects || []).map(async (project) => {
          const { data: skillLinks } = await supabase
            .from("project_skills")
            .select("skill_id")
            .eq("project_id", project.id);

          if (skillLinks && skillLinks.length > 0) {
            const skillIds = skillLinks.map(sl => sl.skill_id);
            const { data: linkedSkills } = await supabase
              .from("skills")
              .select("id, title, category")
              .in("id", skillIds);
            return { ...project, skills: linkedSkills || [] };
          }
          return { ...project, skills: [] };
        })
      );

      // Load logo
      let logoBase64: string | null = null;
      try {
        logoBase64 = await loadLocalImage(logoImage);
      } catch (e) {
        console.warn("Could not load logo:", e);
      }

      // Load avatar
      let avatarBase64: string | null = null;
      if (profile?.avatar_url) {
        avatarBase64 = await imageToBase64(profile.avatar_url);
      }

      // Pre-load project images
      const projectImages: Record<string, string | null> = {};
      for (const project of projectsWithSkills) {
        if (project.image_url) {
          projectImages[project.id] = await imageToBase64(project.image_url);
        }
      }

      // Create PDF
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - 2 * margin;
      let yPos = margin;

      // Colors
      const primaryColor: [number, number, number] = [99, 102, 241]; // Indigo
      const textColor: [number, number, number] = [31, 41, 55];
      const mutedColor: [number, number, number] = [107, 114, 128];
      const accentColor: [number, number, number] = [79, 70, 229];

      // Helper function to check page break
      const checkPageBreak = (neededHeight: number) => {
        if (yPos + neededHeight > pageHeight - margin) {
          pdf.addPage();
          yPos = margin;
          return true;
        }
        return false;
      };

      // Header with gradient-like background
      pdf.setFillColor(...primaryColor);
      pdf.rect(0, 0, pageWidth, 55, "F");

      // Add logo + QUIDZ text in top left corner
      const logoSize = 18;
      if (logoBase64) {
        try {
          pdf.addImage(logoBase64, "PNG", margin, 10, logoSize, logoSize);
        } catch (e) {
          console.warn("Could not add logo to PDF:", e);
        }
      }
      
      // QUIDZ text next to logo
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(24);
      pdf.setFont("helvetica", "bold");
      pdf.text("QUIDZ", margin + logoSize + 4, 23);

      // Subtitle
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "normal");
      pdf.text("Kompetenz-Portfolio", margin + logoSize + 4, 32);

      // Profile info on header with avatar
      if (profile) {
        const rightSide = pageWidth - margin;
        
        // Add avatar if available
        if (avatarBase64) {
          try {
            // Draw circular avatar (approximation with rounded rect)
            pdf.addImage(avatarBase64, "JPEG", rightSide - 25, 12, 25, 25);
          } catch (e) {
            console.warn("Could not add avatar to PDF:", e);
          }
        }

        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        const nameText = profile.full_name || "Unbekannt";
        const nameX = avatarBase64 ? rightSide - 30 - pdf.getTextWidth(nameText) : rightSide - pdf.getTextWidth(nameText);
        pdf.text(nameText, nameX, 25);
        
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        const emailX = avatarBase64 ? rightSide - 30 - pdf.getTextWidth(profile.email) : rightSide - pdf.getTextWidth(profile.email);
        pdf.text(profile.email, emailX, 33);
      }

      yPos = 70;

      // Date
      pdf.setTextColor(...mutedColor);
      pdf.setFontSize(9);
      const dateStr = `Erstellt am: ${new Date().toLocaleDateString("de-DE", { 
        year: "numeric", 
        month: "long", 
        day: "numeric" 
      })}`;
      pdf.text(dateStr, margin, yPos);
      yPos += 15;

      // Skills Section
      if (skills && skills.length > 0) {
        pdf.setTextColor(...accentColor);
        pdf.setFontSize(18);
        pdf.setFont("helvetica", "bold");
        pdf.text("Kompetenzen", margin, yPos);
        yPos += 3;

        // Underline
        pdf.setDrawColor(...primaryColor);
        pdf.setLineWidth(0.5);
        pdf.line(margin, yPos, margin + 50, yPos);
        yPos += 10;

        // Group skills by category
        const skillsByCategory = skills.reduce((acc: Record<string, Skill[]>, skill: Skill) => {
          const cat = skill.category || "sonstiges";
          if (!acc[cat]) acc[cat] = [];
          acc[cat].push(skill);
          return acc;
        }, {});

        for (const [category, categorySkills] of Object.entries(skillsByCategory)) {
          checkPageBreak(30);

          // Category header
          pdf.setFillColor(243, 244, 246);
          pdf.roundedRect(margin, yPos - 4, contentWidth, 10, 2, 2, "F");
          
          pdf.setTextColor(...primaryColor);
          pdf.setFontSize(12);
          pdf.setFont("helvetica", "bold");
          pdf.text(skillCategoryLabels[category] || category, margin + 4, yPos + 3);
          yPos += 14;

          for (const skill of categorySkills) {
            checkPageBreak(25);

            // Skill title
            pdf.setTextColor(...textColor);
            pdf.setFontSize(11);
            pdf.setFont("helvetica", "bold");
            pdf.text(`• ${skill.title}`, margin + 4, yPos);

            // Status badge - only show if status is defined in labels
            const statusText = skillStatusLabels[skill.status];
            if (statusText) {
              const statusColor: [number, number, number] = skill.status === "bestaetigt" 
                ? [34, 197, 94] 
                : skill.status === "abgelehnt" 
                  ? [239, 68, 68] 
                  : [234, 179, 8];
              
              pdf.setFontSize(8);
              pdf.setTextColor(...statusColor);
              const statusX = margin + 8 + pdf.getTextWidth(`• ${skill.title}`);
              pdf.text(`[${statusText}]`, statusX + 3, yPos);
            }
            
            yPos += 5;

            // Description
            if (skill.description) {
              pdf.setTextColor(...mutedColor);
              pdf.setFontSize(9);
              pdf.setFont("helvetica", "normal");
              const descLines = pdf.splitTextToSize(skill.description, contentWidth - 10);
              pdf.text(descLines.slice(0, 2), margin + 8, yPos);
              yPos += descLines.slice(0, 2).length * 4;
            }

            // Competence level
            if (skill.competence_level) {
              pdf.setTextColor(...mutedColor);
              pdf.setFontSize(8);
              pdf.text(`Niveau: ${skill.competence_level}`, margin + 8, yPos);
              yPos += 4;
            }

            yPos += 4;
          }
          yPos += 4;
        }
      }

      // Projects Section
      if (projectsWithSkills && projectsWithSkills.length > 0) {
        checkPageBreak(40);
        yPos += 5;

        pdf.setTextColor(...accentColor);
        pdf.setFontSize(18);
        pdf.setFont("helvetica", "bold");
        pdf.text("Projekte", margin, yPos);
        yPos += 3;

        // Underline
        pdf.setDrawColor(...primaryColor);
        pdf.setLineWidth(0.5);
        pdf.line(margin, yPos, margin + 35, yPos);
        yPos += 12;

        for (const project of projectsWithSkills) {
          // Check if we need space for image + content
          const hasImage = project.image_url && projectImages[project.id];
          const neededHeight = hasImage ? 60 : 40;
          checkPageBreak(neededHeight);

          const projectStartY = yPos;

          // Project image on the left if available
          let textStartX = margin;
          let textWidth = contentWidth;
          
          if (hasImage && projectImages[project.id]) {
            try {
              const imgWidth = 40;
              const imgHeight = 30;
              pdf.addImage(projectImages[project.id]!, "JPEG", margin, yPos, imgWidth, imgHeight);
              textStartX = margin + imgWidth + 6;
              textWidth = contentWidth - imgWidth - 6;
            } catch (e) {
              console.warn("Could not add project image:", e);
            }
          }

          // Project card background
          pdf.setFillColor(249, 250, 251);
          pdf.roundedRect(textStartX, yPos - 2, textWidth, 8, 2, 2, "F");

          // Project title
          pdf.setTextColor(...textColor);
          pdf.setFontSize(12);
          pdf.setFont("helvetica", "bold");
          pdf.text(project.title, textStartX + 4, yPos + 4);

          // Category
          const catLabel = projectCategoryLabels[project.category] || project.category;
          pdf.setTextColor(...primaryColor);
          pdf.setFontSize(8);
          const catX = textStartX + textWidth - pdf.getTextWidth(catLabel) - 4;
          pdf.text(catLabel, catX, yPos + 4);

          yPos += 12;

          // Description
          if (project.description) {
            pdf.setTextColor(...mutedColor);
            pdf.setFontSize(9);
            pdf.setFont("helvetica", "normal");
            const descLines = pdf.splitTextToSize(project.description, textWidth - 8);
            pdf.text(descLines.slice(0, 3), textStartX + 4, yPos);
            yPos += descLines.slice(0, 3).length * 4 + 2;
          }

          // Tags
          if (project.tags && project.tags.length > 0) {
            pdf.setTextColor(...mutedColor);
            pdf.setFontSize(8);
            pdf.text(`Tags: ${project.tags.join(", ")}`, textStartX + 4, yPos);
            yPos += 5;
          }

          // Linked skills
          if (project.skills && project.skills.length > 0) {
            pdf.setTextColor(...accentColor);
            pdf.setFontSize(8);
            const skillNames = project.skills.map(s => s.title).join(", ");
            const skillText = pdf.splitTextToSize(`Verknüpfte Kompetenzen: ${skillNames}`, textWidth - 8);
            pdf.text(skillText.slice(0, 2), textStartX + 4, yPos);
            yPos += skillText.slice(0, 2).length * 4;
          }

          // Project URL
          if (project.project_url) {
            pdf.setTextColor(59, 130, 246);
            pdf.setFontSize(8);
            pdf.text(`Link: ${project.project_url}`, textStartX + 4, yPos);
            yPos += 5;
          }

          // Ensure minimum height if image was taller
          if (hasImage) {
            const minYPos = projectStartY + 35;
            if (yPos < minYPos) yPos = minYPos;
          }

          yPos += 10;
        }
      }

      // Footer
      const footerY = pageHeight - 15;
      pdf.setDrawColor(229, 231, 235);
      pdf.setLineWidth(0.3);
      pdf.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

      pdf.setTextColor(...mutedColor);
      pdf.setFontSize(8);
      pdf.text("Generiert mit QUIDZ - Ihr digitales Kompetenz-Portfolio", margin, footerY);
      
      const pageInfo = `Seite ${pdf.getNumberOfPages()}`;
      pdf.text(pageInfo, pageWidth - margin - pdf.getTextWidth(pageInfo), footerY);

      // Save PDF
      const fileName = `Portfolio_${profile?.full_name?.replace(/\s+/g, "_") || "Export"}_${new Date().toISOString().split("T")[0]}.pdf`;
      pdf.save(fileName);

      toast.success("Portfolio erfolgreich als PDF exportiert!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Fehler beim Erstellen des PDFs");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileDown className="w-5 h-5" />
          Portfolio Export
        </CardTitle>
        <CardDescription>
          Exportieren Sie Ihr komplettes Portfolio mit allen Kompetenzen und Projekten als PDF-Dokument
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={generatePDF} 
          disabled={exporting}
          className="w-full"
          size="lg"
        >
          {exporting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              PDF wird erstellt...
            </>
          ) : (
            <>
              <FileDown className="w-4 h-4 mr-2" />
              Portfolio als PDF herunterladen
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground mt-3 text-center">
          Das PDF enthält alle Ihre Kompetenzen, Projekte und verknüpften Nachweise.
        </p>
      </CardContent>
    </Card>
  );
}
