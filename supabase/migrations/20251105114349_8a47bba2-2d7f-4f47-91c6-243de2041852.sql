-- Fix RLS policies for feedback_answers to allow admins to view all answers
DROP POLICY IF EXISTS "Admins can view all answers" ON public.feedback_answers;

CREATE POLICY "Admins can view all answers"
ON public.feedback_answers
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Fix RLS policies for mood_entries to allow admins to view all mood entries
DROP POLICY IF EXISTS "Admins can view all mood entries" ON public.mood_entries;

CREATE POLICY "Admins can view all mood entries"
ON public.mood_entries
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);