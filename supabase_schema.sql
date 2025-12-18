-- Create Recipes Table
create table public.recipes (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  image_url text,
  macros_json jsonb, -- { calories: 100, protein: 10, ... }
  pregnancy_tags_array text[], -- ['Iron-Rich', 'Nausea']
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create User Logs Table
create table public.user_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null, -- Assumes Supabase Auth
  recipe_id uuid references public.recipes not null,
  action text check (action in ('liked', 'passed')),
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS (Row Level Security) - Basic Policy
alter table public.recipes enable row level security;
create policy "Public recipes are viewable by everyone"
  on public.recipes for select
  using ( true );

alter table public.user_logs enable row level security;
create policy "Users can insert their own logs"
  on public.user_logs for insert
  with check ( auth.uid() = user_id );

-- Insert Mock Data
insert into public.recipes (title, image_url, macros_json, pregnancy_tags_array)
values
  ('Ginger & Lemon Smoothie', 'https://images.unsplash.com/photo-1623594638708-o6g67493.jpg', '{"calories": 150, "protein": 2, "carbs": 30, "fat": 1}', ARRAY['Nausea Relief', 'Hydration']),
  ('Salmon Quinoa Bowl', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c.jpg', '{"calories": 450, "protein": 35, "carbs": 40, "fat": 15}', ARRAY['Omega-3', 'High Protein']),
  ('Spinach & Berry Salad', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd.jpg', '{"calories": 220, "protein": 5, "carbs": 25, "fat": 10}', ARRAY['Folic Acid', 'Fiber']);
