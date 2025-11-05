-- Add foreign key relationships for feedback_answers and mood_entries to profiles
ALTER TABLE public.feedback_answers
ADD CONSTRAINT feedback_answers_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.mood_entries
ADD CONSTRAINT mood_entries_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;