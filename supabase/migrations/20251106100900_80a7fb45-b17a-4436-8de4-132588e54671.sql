-- Create categories table for flashcard organization
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  featured BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create flashcards table
CREATE TABLE public.flashcards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  front_text TEXT NOT NULL,
  back_text TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  created_by UUID NOT NULL,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create tags table
CREATE TABLE public.tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create flashcard_tags junction table
CREATE TABLE public.flashcard_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flashcard_id UUID REFERENCES public.flashcards(id) ON DELETE CASCADE NOT NULL,
  tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(flashcard_id, tag_id)
);

-- Create feedbacks table
CREATE TABLE public.flashcard_feedbacks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flashcard_id UUID REFERENCES public.flashcards(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  is_helpful BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create learning_progress table
CREATE TABLE public.learning_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  flashcard_id UUID REFERENCES public.flashcards(id) ON DELETE CASCADE NOT NULL,
  knew_answer BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create badges table
CREATE TABLE public.badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  badge_type TEXT NOT NULL,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcard_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcard_feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

-- RLS Policies for categories
CREATE POLICY "Everyone can view categories"
  ON public.categories FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage categories"
  ON public.categories FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for flashcards
CREATE POLICY "Users can view public flashcards"
  ON public.flashcards FOR SELECT
  USING (is_public = true OR auth.uid() = created_by);

CREATE POLICY "Admins can view all flashcards"
  ON public.flashcards FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create their own flashcards"
  ON public.flashcards FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own flashcards"
  ON public.flashcards FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own flashcards"
  ON public.flashcards FOR DELETE
  USING (auth.uid() = created_by);

CREATE POLICY "Admins can manage all flashcards"
  ON public.flashcards FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for tags
CREATE POLICY "Everyone can view tags"
  ON public.tags FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create tags"
  ON public.tags FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for flashcard_tags
CREATE POLICY "Everyone can view flashcard tags"
  ON public.flashcard_tags FOR SELECT
  USING (true);

CREATE POLICY "Users can manage tags on their flashcards"
  ON public.flashcard_tags FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.flashcards
      WHERE flashcards.id = flashcard_tags.flashcard_id
      AND flashcards.created_by = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all flashcard tags"
  ON public.flashcard_tags FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for flashcard_feedbacks
CREATE POLICY "Users can view all feedbacks"
  ON public.flashcard_feedbacks FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own feedbacks"
  ON public.flashcard_feedbacks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feedbacks"
  ON public.flashcard_feedbacks FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for learning_progress
CREATE POLICY "Users can view their own progress"
  ON public.learning_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all progress"
  ON public.learning_progress FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create their own progress"
  ON public.learning_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for badges
CREATE POLICY "Users can view their own badges"
  ON public.badges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all badges"
  ON public.badges FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create their own badges"
  ON public.badges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all badges"
  ON public.badges FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Create indexes for better performance
CREATE INDEX idx_flashcards_category ON public.flashcards(category_id);
CREATE INDEX idx_flashcards_created_by ON public.flashcards(created_by);
CREATE INDEX idx_flashcards_public ON public.flashcards(is_public);
CREATE INDEX idx_flashcard_tags_flashcard ON public.flashcard_tags(flashcard_id);
CREATE INDEX idx_flashcard_tags_tag ON public.flashcard_tags(tag_id);
CREATE INDEX idx_learning_progress_user ON public.learning_progress(user_id);
CREATE INDEX idx_learning_progress_flashcard ON public.learning_progress(flashcard_id);
CREATE INDEX idx_badges_user ON public.badges(user_id);