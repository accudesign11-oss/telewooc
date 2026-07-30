
-- Add foreign key constraints for user_id columns to ensure data integrity
-- This ensures that when a user is deleted, their data is also deleted

-- activity_log
ALTER TABLE public.activity_log
DROP CONSTRAINT IF EXISTS activity_log_user_id_fkey;

ALTER TABLE public.activity_log
ADD CONSTRAINT activity_log_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ai_requests
ALTER TABLE public.ai_requests
DROP CONSTRAINT IF EXISTS ai_requests_user_id_fkey;

ALTER TABLE public.ai_requests
ADD CONSTRAINT ai_requests_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- draft_products
ALTER TABLE public.draft_products
DROP CONSTRAINT IF EXISTS draft_products_user_id_fkey;

ALTER TABLE public.draft_products
ADD CONSTRAINT draft_products_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- notifications
ALTER TABLE public.notifications
DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;

ALTER TABLE public.notifications
ADD CONSTRAINT notifications_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- product_templates
ALTER TABLE public.product_templates
DROP CONSTRAINT IF EXISTS product_templates_user_id_fkey;

ALTER TABLE public.product_templates
ADD CONSTRAINT product_templates_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- profiles
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add unique constraint on profiles.user_id to ensure one profile per user
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_user_id_unique;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);

-- scheduled_products
ALTER TABLE public.scheduled_products
DROP CONSTRAINT IF EXISTS scheduled_products_user_id_fkey;

ALTER TABLE public.scheduled_products
ADD CONSTRAINT scheduled_products_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- telegram_posts
ALTER TABLE public.telegram_posts
DROP CONSTRAINT IF EXISTS telegram_posts_user_id_fkey;

ALTER TABLE public.telegram_posts
ADD CONSTRAINT telegram_posts_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- user_roles
ALTER TABLE public.user_roles
DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;

ALTER TABLE public.user_roles
ADD CONSTRAINT user_roles_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- wc_categories_cache
ALTER TABLE public.wc_categories_cache
DROP CONSTRAINT IF EXISTS wc_categories_cache_user_id_fkey;

ALTER TABLE public.wc_categories_cache
ADD CONSTRAINT wc_categories_cache_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
