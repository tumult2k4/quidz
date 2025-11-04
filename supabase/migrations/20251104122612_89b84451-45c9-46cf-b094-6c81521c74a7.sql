-- Erweitere tasks Tabelle für Links, Bild und Datei
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS links TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS assign_to_all BOOLEAN DEFAULT false;

-- Entferne github_url aus projects Tabelle
ALTER TABLE public.projects 
DROP COLUMN IF EXISTS github_url;

-- Erstelle Tabelle für Projekt-Dokumente
CREATE TABLE IF NOT EXISTS public.project_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS für project_documents
ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view project documents"
ON public.project_documents
FOR SELECT
USING (true);

CREATE POLICY "Users can manage their project documents"
ON public.project_documents
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = project_documents.project_id
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all project documents"
ON public.project_documents
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Erstelle Tabelle für Werkzeuge
CREATE TABLE IF NOT EXISTS public.tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  web_link TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS für tools
ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view tools"
ON public.tools
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage tools"
ON public.tools
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Trigger für updated_at
CREATE TRIGGER update_tools_updated_at
BEFORE UPDATE ON public.tools
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();