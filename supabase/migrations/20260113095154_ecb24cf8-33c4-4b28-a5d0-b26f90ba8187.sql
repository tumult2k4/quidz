-- Allow coaches to manage all tasks (create, update, delete)
CREATE POLICY "Coaches can manage all tasks"
ON public.tasks
FOR ALL
USING (has_role(auth.uid(), 'coach'::app_role))
WITH CHECK (has_role(auth.uid(), 'coach'::app_role));

-- Allow coaches to view all tasks
CREATE POLICY "Coaches can view all tasks"
ON public.tasks
FOR SELECT
USING (has_role(auth.uid(), 'coach'::app_role));