-- Create feedback_questions table
CREATE TABLE public.feedback_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_text TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('text', 'multiple_choice', 'mood')),
  options JSONB,
  target_user UUID,
  active_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  active_until TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

-- Create feedback_answers table
CREATE TABLE public.feedback_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  question_id UUID NOT NULL REFERENCES public.feedback_questions(id) ON DELETE CASCADE,
  answer_text TEXT,
  mood_value INTEGER CHECK (mood_value >= 1 AND mood_value <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create mood_entries table
CREATE TABLE public.mood_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  mood_value INTEGER NOT NULL CHECK (mood_value >= 1 AND mood_value <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feedback_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mood_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for feedback_questions
CREATE POLICY "Users can view active questions assigned to them"
  ON public.feedback_questions
  FOR SELECT
  USING (
    is_active = true 
    AND (target_user IS NULL OR target_user = auth.uid())
    AND (active_from <= now())
    AND (active_until IS NULL OR active_until >= now())
  );

CREATE POLICY "Admins can view all questions"
  ON public.feedback_questions
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all questions"
  ON public.feedback_questions
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for feedback_answers
CREATE POLICY "Users can view their own answers"
  ON public.feedback_answers
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own answers"
  ON public.feedback_answers
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all answers"
  ON public.feedback_answers
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all answers"
  ON public.feedback_answers
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for mood_entries
CREATE POLICY "Users can view their own mood entries"
  ON public.mood_entries
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own mood entries"
  ON public.mood_entries
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mood entries"
  ON public.mood_entries
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all mood entries"
  ON public.mood_entries
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));