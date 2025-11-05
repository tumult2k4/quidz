-- Create table for AI assistant settings
CREATE TABLE IF NOT EXISTS public.ai_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_name text NOT NULL DEFAULT 'KI Assistent',
  system_prompt text DEFAULT 'Du bist ein hilfreicher KI-Assistent.',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;

-- Admins can manage AI settings
CREATE POLICY "Admins can manage AI settings"
ON public.ai_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Everyone can view AI settings
CREATE POLICY "Everyone can view AI settings"
ON public.ai_settings
FOR SELECT
USING (true);

-- Insert default settings
INSERT INTO public.ai_settings (bot_name, system_prompt)
VALUES ('KI Assistent', 'Du bist ein hilfreicher KI-Assistent für die QUIDZ-Plattform. Antworte auf Deutsch und sei freundlich und professionell.')
ON CONFLICT DO NOTHING;

-- Create table for AI chat messages
CREATE TABLE IF NOT EXISTS public.ai_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can view their own messages
CREATE POLICY "Users can view their own AI messages"
ON public.ai_chat_messages
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own messages
CREATE POLICY "Users can create their own AI messages"
ON public.ai_chat_messages
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own messages
CREATE POLICY "Users can delete their own AI messages"
ON public.ai_chat_messages
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_user_id ON public.ai_chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_created_at ON public.ai_chat_messages(created_at);