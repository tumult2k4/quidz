-- Create skill categories enum
CREATE TYPE skill_category AS ENUM ('handwerk', 'digital', 'sozial', 'kreativ', 'sonstiges');

-- Create skill status enum  
CREATE TYPE skill_status AS ENUM ('in_pruefung', 'integrationsrelevant', 'validiert', 'abgelehnt');

-- Create skills table
CREATE TABLE public.skills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category skill_category NOT NULL DEFAULT 'sonstiges',
  proof_text TEXT,
  proof_file_url TEXT,
  status skill_status NOT NULL DEFAULT 'in_pruefung',
  is_integration_relevant BOOLEAN DEFAULT false,
  coach_comment TEXT,
  competence_level TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create skill_tasks junction table to link skills with tasks
CREATE TABLE public.skill_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(skill_id, task_id)
);

-- Enable RLS on skills
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;

-- Enable RLS on skill_tasks
ALTER TABLE public.skill_tasks ENABLE ROW LEVEL SECURITY;

-- Skills policies
CREATE POLICY "Users can view their own skills"
ON public.skills FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own skills"
ON public.skills FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own skills"
ON public.skills FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own skills"
ON public.skills FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all skills"
ON public.skills FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Coaches can view all skills"
ON public.skills FOR SELECT
USING (has_role(auth.uid(), 'coach'::app_role));

CREATE POLICY "Coaches can update all skills"
ON public.skills FOR UPDATE
USING (has_role(auth.uid(), 'coach'::app_role));

-- Skill_tasks policies
CREATE POLICY "Users can view their skill tasks"
ON public.skill_tasks FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.skills
  WHERE skills.id = skill_tasks.skill_id
  AND skills.user_id = auth.uid()
));

CREATE POLICY "Admins can manage all skill tasks"
ON public.skill_tasks FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Coaches can manage all skill tasks"
ON public.skill_tasks FOR ALL
USING (has_role(auth.uid(), 'coach'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_skills_updated_at
BEFORE UPDATE ON public.skills
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Add skill-proofs storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('skill-proofs', 'skill-proofs', true);

-- Storage policies for skill proofs
CREATE POLICY "Users can upload their own skill proofs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'skill-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view skill proofs"
ON storage.objects FOR SELECT
USING (bucket_id = 'skill-proofs');

CREATE POLICY "Users can delete their own skill proofs"
ON storage.objects FOR DELETE
USING (bucket_id = 'skill-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);