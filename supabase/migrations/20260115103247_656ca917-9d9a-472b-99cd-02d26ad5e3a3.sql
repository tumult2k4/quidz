-- Create a junction table for project-skill relationships
CREATE TABLE public.project_skills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, skill_id)
);

-- Enable Row Level Security
ALTER TABLE public.project_skills ENABLE ROW LEVEL SECURITY;

-- Users can view project skills for their own projects or published projects
CREATE POLICY "Users can view project skills for accessible projects"
ON public.project_skills
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = project_skills.project_id 
    AND (projects.published = true OR projects.user_id = auth.uid())
  )
);

-- Users can manage skills on their own projects
CREATE POLICY "Users can manage skills on their projects"
ON public.project_skills
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = project_skills.project_id 
    AND projects.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = project_skills.project_id 
    AND projects.user_id = auth.uid()
  )
);

-- Admins can manage all project skills
CREATE POLICY "Admins can manage all project skills"
ON public.project_skills
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Coaches can view all project skills
CREATE POLICY "Coaches can view all project skills"
ON public.project_skills
FOR SELECT
USING (has_role(auth.uid(), 'coach'::app_role));