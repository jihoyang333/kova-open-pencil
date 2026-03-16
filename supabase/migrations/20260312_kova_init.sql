-- Kova MVP — Initial Schema
-- Generated from KOVA_Cursor_Handoff_v3.md Section 11

create table users (
  id uuid references auth.users primary key,
  email text not null,
  plan text default 'free',
  stripe_customer_id text,
  generations_used integer default 0,
  generations_limit integer default 10,
  created_at timestamptz default now()
);

create table clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

create table brand_profiles (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  primary_color text,
  secondary_color text,
  background_color text,
  accent_color text,
  heading_font text default 'Inter',
  body_font text default 'Inter',
  logo_url text,
  updated_at timestamptz default now()
);

create table emails (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  name text not null,
  campaign_type text,
  design_data jsonb,
  thumbnail_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  campaign_type text,
  fig_file_url text,
  thumbnail_url text,
  is_public boolean default true,
  created_at timestamptz default now()
);
