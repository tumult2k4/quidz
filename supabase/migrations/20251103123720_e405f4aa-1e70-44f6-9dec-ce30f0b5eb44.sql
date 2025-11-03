-- Create project_categories enum
CREATE TYPE project_category AS ENUM (
  'web_development',
  'mobile_app',
  'design',
  'data_science',
  'machine_learning',
  'other'
);

-- Create projects table
CREATE TABLE public.projects (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category project_category NOT NULL DEFAULT 'other',
  tags text[] DEFAULT ARRAY[]::text[],
  image_url text,
  project_url text,
  github_url text,
  featured boolean DEFAULT false,
  published boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create project_likes table for favorites
CREATE TABLE public.project_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_likes ENABLE ROW LEVEL SECURITY;

-- Projects RLS Policies
-- Everyone can view published projects
CREATE POLICY "Published projects are viewable by everyone"
ON public.projects
FOR SELECT
USING (published = true OR auth.uid() = user_id);

-- Users can create their own projects
CREATE POLICY "Users can create their own projects"
ON public.projects
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own projects
CREATE POLICY "Users can update their own projects"
ON public.projects
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own projects
CREATE POLICY "Users can delete their own projects"
ON public.projects
FOR DELETE
USING (auth.uid() = user_id);

-- Admins can manage all projects
CREATE POLICY "Admins can manage all projects"
ON public.projects
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Project Likes RLS Policies
-- Everyone can view likes
CREATE POLICY "Everyone can view project likes"
ON public.project_likes
FOR SELECT
USING (true);

-- Authenticated users can like projects
CREATE POLICY "Authenticated users can like projects"
ON public.project_likes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can unlike their own likes
CREATE POLICY "Users can unlike projects"
ON public.project_likes
FOR DELETE
USING (auth.uid() = user_id);

-- Create storage bucket for project images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-images',
  'project-images',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
);

-- Storage policies for project images
CREATE POLICY "Project images are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'project-images');

CREATE POLICY "Authenticated users can upload project images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'project-images');

CREATE POLICY "Users can update their own project images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'project-images');

CREATE POLICY "Users can delete their own project images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'project-images');