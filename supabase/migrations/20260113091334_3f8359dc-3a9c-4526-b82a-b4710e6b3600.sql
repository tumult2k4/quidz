-- Allow coaches to view all profiles
CREATE POLICY "Coaches can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (has_role(auth.uid(), 'coach'::app_role));

-- Allow coaches to view all absences
CREATE POLICY "Coaches can view all absences" 
ON public.absences 
FOR SELECT 
USING (has_role(auth.uid(), 'coach'::app_role));

-- Allow coaches to view all learning progress
CREATE POLICY "Coaches can view all progress" 
ON public.learning_progress 
FOR SELECT 
USING (has_role(auth.uid(), 'coach'::app_role));

-- Allow coaches to view all projects
CREATE POLICY "Coaches can view all projects" 
ON public.projects 
FOR SELECT 
USING (has_role(auth.uid(), 'coach'::app_role));

-- Allow coaches to view all feedback answers
CREATE POLICY "Coaches can view all answers" 
ON public.feedback_answers 
FOR SELECT 
USING (has_role(auth.uid(), 'coach'::app_role));

-- Allow coaches to view all badges
CREATE POLICY "Coaches can view all badges" 
ON public.badges 
FOR SELECT 
USING (has_role(auth.uid(), 'coach'::app_role));

-- Allow coaches to view all mood entries
CREATE POLICY "Coaches can view all mood entries" 
ON public.mood_entries 
FOR SELECT 
USING (has_role(auth.uid(), 'coach'::app_role));

-- Allow coaches to view user roles (to filter participants)
CREATE POLICY "Coaches can view all roles" 
ON public.user_roles 
FOR SELECT 
USING (has_role(auth.uid(), 'coach'::app_role));