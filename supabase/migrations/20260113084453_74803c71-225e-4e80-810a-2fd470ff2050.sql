-- Allow coaches to create flashcards
DROP POLICY IF EXISTS "Users can create their own flashcards" ON public.flashcards;
CREATE POLICY "Users can create their own flashcards" 
ON public.flashcards 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

-- Allow coaches to manage all flashcards (like admins)
CREATE POLICY "Coaches can manage all flashcards" 
ON public.flashcards 
FOR ALL 
USING (has_role(auth.uid(), 'coach'::app_role))
WITH CHECK (has_role(auth.uid(), 'coach'::app_role));

-- Allow coaches to manage categories
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins and coaches can manage categories" 
ON public.categories 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coach'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coach'::app_role));

-- Allow coaches to manage flashcard tags
DROP POLICY IF EXISTS "Admins can manage all flashcard tags" ON public.flashcard_tags;
CREATE POLICY "Admins and coaches can manage all flashcard tags" 
ON public.flashcard_tags 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coach'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coach'::app_role));

-- Allow coaches to view all flashcards
CREATE POLICY "Coaches can view all flashcards" 
ON public.flashcards 
FOR SELECT 
USING (has_role(auth.uid(), 'coach'::app_role));