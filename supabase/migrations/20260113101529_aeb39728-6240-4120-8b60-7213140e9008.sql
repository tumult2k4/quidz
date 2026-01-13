-- Create reports table for IV-compatible documentation
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  coach_id UUID NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  program_type TEXT DEFAULT 'arbeitstraining',
  attendance_summary JSONB DEFAULT '{}'::jsonb,
  attendance_notes TEXT,
  tasks_summary JSONB DEFAULT '{}'::jsonb,
  tasks_notes TEXT,
  skills_summary JSONB DEFAULT '{}'::jsonb,
  skills_notes TEXT,
  learning_summary JSONB DEFAULT '{}'::jsonb,
  learning_notes TEXT,
  behavior_notes TEXT,
  mood_summary TEXT,
  overall_assessment TEXT,
  outlook TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'final')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Only admins and coaches can access reports
CREATE POLICY "Admins can manage all reports"
ON public.reports
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Coaches can manage all reports"
ON public.reports
FOR ALL
USING (has_role(auth.uid(), 'coach'::app_role))
WITH CHECK (has_role(auth.uid(), 'coach'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_reports_updated_at
BEFORE UPDATE ON public.reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();