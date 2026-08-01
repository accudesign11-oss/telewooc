CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: ai_provider; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.ai_provider AS ENUM (
    'lovable',
    'gemini',
    'openrouter'
);


--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'user'
);


--
-- Name: draft_product_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.draft_product_status AS ENUM (
    'inbox',
    'draft',
    'ai_processing',
    'ai_processed',
    'review_ready',
    'publishing',
    'published',
    'failed'
);


--
-- Name: notification_level; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.notification_level AS ENUM (
    'success',
    'warning',
    'error',
    'info'
);


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    INSERT INTO public.profiles (user_id, full_name)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');
    
    RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: activity_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ai_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    draft_product_id uuid,
    provider public.ai_provider DEFAULT 'lovable'::public.ai_provider,
    model text,
    prompt text,
    response text,
    status text DEFAULT 'pending'::text,
    latency_ms integer,
    tokens_estimate integer,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ai_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'success'::text, 'failed'::text])))
);


--
-- Name: draft_products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.draft_products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    telegram_post_id uuid,
    name text,
    short_description text,
    long_description text,
    price numeric(10,2),
    sale_price numeric(10,2),
    sku text,
    currency text DEFAULT 'SAR'::text,
    product_type text DEFAULT 'simple'::text,
    status public.draft_product_status DEFAULT 'inbox'::public.draft_product_status,
    categories jsonb DEFAULT '[]'::jsonb,
    tags jsonb DEFAULT '[]'::jsonb,
    original_data jsonb DEFAULT '{}'::jsonb,
    ai_processed_data jsonb DEFAULT '{}'::jsonb,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT draft_products_product_type_check CHECK ((product_type = ANY (ARRAY['simple'::text, 'variable'::text])))
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type text NOT NULL,
    level public.notification_level DEFAULT 'info'::public.notification_level,
    title text NOT NULL,
    body text,
    related_type text,
    related_id uuid,
    link_url text,
    seen_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: product_attributes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_attributes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    draft_product_id uuid NOT NULL,
    name text NOT NULL,
    "values" jsonb DEFAULT '[]'::jsonb,
    is_variation boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: product_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_images (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    draft_product_id uuid NOT NULL,
    source text DEFAULT 'telegram'::text,
    url text NOT NULL,
    local_path text,
    alt_text text,
    is_featured boolean DEFAULT false,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT product_images_source_check CHECK ((source = ANY (ARRAY['telegram'::text, 'manual'::text, 'imgbb'::text, 'url'::text])))
);


--
-- Name: product_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    template_data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: product_variations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_variations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    draft_product_id uuid NOT NULL,
    attributes jsonb DEFAULT '{}'::jsonb NOT NULL,
    price numeric(10,2),
    sale_price numeric(10,2),
    sku text,
    stock_quantity integer,
    image_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    full_name text,
    avatar_url text,
    language text DEFAULT 'ar'::text,
    theme text DEFAULT 'light'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: scheduled_products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scheduled_products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    draft_product_id uuid,
    scheduled_at timestamp with time zone NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    key text NOT NULL,
    value jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: telegram_media; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.telegram_media (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    post_id uuid NOT NULL,
    file_id text NOT NULL,
    file_unique_id text,
    media_type text DEFAULT 'photo'::text,
    local_path text,
    remote_url text,
    is_selected boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT telegram_media_media_type_check CHECK ((media_type = ANY (ARRAY['photo'::text, 'video'::text, 'document'::text])))
);


--
-- Name: telegram_posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.telegram_posts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    source_id uuid NOT NULL,
    message_id bigint NOT NULL,
    chat_id text NOT NULL,
    text text,
    date timestamp with time zone,
    raw_json jsonb,
    is_processed boolean DEFAULT false,
    synced_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: telegram_sources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.telegram_sources (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    chat_id text NOT NULL,
    bot_token text NOT NULL,
    mode text DEFAULT 'polling'::text,
    webhook_url text,
    auto_sync boolean DEFAULT true,
    sync_interval_minutes integer DEFAULT 5,
    include_images_default boolean DEFAULT true,
    is_active boolean DEFAULT true,
    last_synced_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT telegram_sources_mode_check CHECK ((mode = ANY (ARRAY['webhook'::text, 'polling'::text])))
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role DEFAULT 'user'::public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: wc_categories_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wc_categories_cache (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    wc_id integer NOT NULL,
    name text NOT NULL,
    slug text,
    parent_id integer,
    synced_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: wc_mappings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wc_mappings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    draft_product_id uuid NOT NULL,
    wc_product_id bigint NOT NULL,
    wc_permalink text,
    last_synced_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: activity_log activity_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_pkey PRIMARY KEY (id);


--
-- Name: ai_requests ai_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_requests
    ADD CONSTRAINT ai_requests_pkey PRIMARY KEY (id);


--
-- Name: draft_products draft_products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.draft_products
    ADD CONSTRAINT draft_products_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: product_attributes product_attributes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_attributes
    ADD CONSTRAINT product_attributes_pkey PRIMARY KEY (id);


--
-- Name: product_images product_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_images
    ADD CONSTRAINT product_images_pkey PRIMARY KEY (id);


--
-- Name: product_templates product_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_templates
    ADD CONSTRAINT product_templates_pkey PRIMARY KEY (id);


--
-- Name: product_variations product_variations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variations
    ADD CONSTRAINT product_variations_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);


--
-- Name: scheduled_products scheduled_products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_products
    ADD CONSTRAINT scheduled_products_pkey PRIMARY KEY (id);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (id);


--
-- Name: settings settings_user_id_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_user_id_key_key UNIQUE (user_id, key);


--
-- Name: settings settings_user_id_key_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_user_id_key_unique UNIQUE (user_id, key);


--
-- Name: telegram_media telegram_media_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_media
    ADD CONSTRAINT telegram_media_pkey PRIMARY KEY (id);


--
-- Name: telegram_posts telegram_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_posts
    ADD CONSTRAINT telegram_posts_pkey PRIMARY KEY (id);


--
-- Name: telegram_posts telegram_posts_source_id_message_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_posts
    ADD CONSTRAINT telegram_posts_source_id_message_id_key UNIQUE (source_id, message_id);


--
-- Name: telegram_sources telegram_sources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_sources
    ADD CONSTRAINT telegram_sources_pkey PRIMARY KEY (id);


--
-- Name: telegram_sources telegram_sources_user_id_chat_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_sources
    ADD CONSTRAINT telegram_sources_user_id_chat_id_unique UNIQUE (user_id, chat_id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: wc_categories_cache wc_categories_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wc_categories_cache
    ADD CONSTRAINT wc_categories_cache_pkey PRIMARY KEY (id);


--
-- Name: wc_mappings wc_mappings_draft_product_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wc_mappings
    ADD CONSTRAINT wc_mappings_draft_product_id_key UNIQUE (draft_product_id);


--
-- Name: wc_mappings wc_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wc_mappings
    ADD CONSTRAINT wc_mappings_pkey PRIMARY KEY (id);


--
-- Name: idx_activity_log_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_log_user_created ON public.activity_log USING btree (user_id, created_at DESC);


--
-- Name: idx_ai_requests_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_requests_user_id ON public.ai_requests USING btree (user_id);


--
-- Name: idx_draft_products_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_draft_products_status ON public.draft_products USING btree (status);


--
-- Name: idx_draft_products_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_draft_products_user_id ON public.draft_products USING btree (user_id);


--
-- Name: idx_notifications_seen_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_seen_at ON public.notifications USING btree (seen_at);


--
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- Name: idx_scheduled_products_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scheduled_products_status ON public.scheduled_products USING btree (status, scheduled_at);


--
-- Name: idx_telegram_posts_is_processed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_telegram_posts_is_processed ON public.telegram_posts USING btree (is_processed);


--
-- Name: idx_telegram_posts_source_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_telegram_posts_source_id ON public.telegram_posts USING btree (source_id);


--
-- Name: idx_telegram_posts_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_telegram_posts_user_id ON public.telegram_posts USING btree (user_id);


--
-- Name: idx_wc_categories_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wc_categories_user ON public.wc_categories_cache USING btree (user_id, wc_id);


--
-- Name: draft_products update_draft_products_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_draft_products_updated_at BEFORE UPDATE ON public.draft_products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: product_templates update_product_templates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_product_templates_updated_at BEFORE UPDATE ON public.product_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: settings update_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: telegram_sources update_telegram_sources_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_telegram_sources_updated_at BEFORE UPDATE ON public.telegram_sources FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ai_requests ai_requests_draft_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_requests
    ADD CONSTRAINT ai_requests_draft_product_id_fkey FOREIGN KEY (draft_product_id) REFERENCES public.draft_products(id) ON DELETE SET NULL;


--
-- Name: ai_requests ai_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_requests
    ADD CONSTRAINT ai_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: draft_products draft_products_telegram_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.draft_products
    ADD CONSTRAINT draft_products_telegram_post_id_fkey FOREIGN KEY (telegram_post_id) REFERENCES public.telegram_posts(id) ON DELETE SET NULL;


--
-- Name: draft_products draft_products_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.draft_products
    ADD CONSTRAINT draft_products_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: product_attributes product_attributes_draft_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_attributes
    ADD CONSTRAINT product_attributes_draft_product_id_fkey FOREIGN KEY (draft_product_id) REFERENCES public.draft_products(id) ON DELETE CASCADE;


--
-- Name: product_images product_images_draft_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_images
    ADD CONSTRAINT product_images_draft_product_id_fkey FOREIGN KEY (draft_product_id) REFERENCES public.draft_products(id) ON DELETE CASCADE;


--
-- Name: product_variations product_variations_draft_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variations
    ADD CONSTRAINT product_variations_draft_product_id_fkey FOREIGN KEY (draft_product_id) REFERENCES public.draft_products(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: scheduled_products scheduled_products_draft_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_products
    ADD CONSTRAINT scheduled_products_draft_product_id_fkey FOREIGN KEY (draft_product_id) REFERENCES public.draft_products(id) ON DELETE CASCADE;


--
-- Name: settings settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: telegram_media telegram_media_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_media
    ADD CONSTRAINT telegram_media_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.telegram_posts(id) ON DELETE CASCADE;


--
-- Name: telegram_posts telegram_posts_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_posts
    ADD CONSTRAINT telegram_posts_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.telegram_sources(id) ON DELETE CASCADE;


--
-- Name: telegram_posts telegram_posts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_posts
    ADD CONSTRAINT telegram_posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: telegram_sources telegram_sources_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_sources
    ADD CONSTRAINT telegram_sources_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: wc_mappings wc_mappings_draft_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wc_mappings
    ADD CONSTRAINT wc_mappings_draft_product_id_fkey FOREIGN KEY (draft_product_id) REFERENCES public.draft_products(id) ON DELETE CASCADE;


--
-- Name: activity_log Users can create their own activity; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own activity" ON public.activity_log FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: wc_categories_cache Users can create their own categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own categories" ON public.wc_categories_cache FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: scheduled_products Users can create their own scheduled products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own scheduled products" ON public.scheduled_products FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: product_templates Users can create their own templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own templates" ON public.product_templates FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: wc_categories_cache Users can delete their own categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own categories" ON public.wc_categories_cache FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: draft_products Users can delete their own draft products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own draft products" ON public.draft_products FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: notifications Users can delete their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own notifications" ON public.notifications FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: product_attributes Users can delete their own product attributes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own product attributes" ON public.product_attributes FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.draft_products dp
  WHERE ((dp.id = product_attributes.draft_product_id) AND (dp.user_id = auth.uid())))));


--
-- Name: product_images Users can delete their own product images; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own product images" ON public.product_images FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.draft_products dp
  WHERE ((dp.id = product_images.draft_product_id) AND (dp.user_id = auth.uid())))));


--
-- Name: product_variations Users can delete their own product variations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own product variations" ON public.product_variations FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.draft_products dp
  WHERE ((dp.id = product_variations.draft_product_id) AND (dp.user_id = auth.uid())))));


--
-- Name: scheduled_products Users can delete their own scheduled products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own scheduled products" ON public.scheduled_products FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: settings Users can delete their own settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own settings" ON public.settings FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: telegram_media Users can delete their own telegram media; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own telegram media" ON public.telegram_media FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.telegram_posts tp
  WHERE ((tp.id = telegram_media.post_id) AND (tp.user_id = auth.uid())))));


--
-- Name: telegram_posts Users can delete their own telegram posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own telegram posts" ON public.telegram_posts FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: telegram_sources Users can delete their own telegram sources; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own telegram sources" ON public.telegram_sources FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: product_templates Users can delete their own templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own templates" ON public.product_templates FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: wc_mappings Users can delete their own wc mappings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own wc mappings" ON public.wc_mappings FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.draft_products dp
  WHERE ((dp.id = wc_mappings.draft_product_id) AND (dp.user_id = auth.uid())))));


--
-- Name: ai_requests Users can insert their own ai requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own ai requests" ON public.ai_requests FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: draft_products Users can insert their own draft products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own draft products" ON public.draft_products FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: notifications Users can insert their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own notifications" ON public.notifications FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: product_attributes Users can insert their own product attributes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own product attributes" ON public.product_attributes FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.draft_products dp
  WHERE ((dp.id = product_attributes.draft_product_id) AND (dp.user_id = auth.uid())))));


--
-- Name: product_images Users can insert their own product images; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own product images" ON public.product_images FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.draft_products dp
  WHERE ((dp.id = product_images.draft_product_id) AND (dp.user_id = auth.uid())))));


--
-- Name: product_variations Users can insert their own product variations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own product variations" ON public.product_variations FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.draft_products dp
  WHERE ((dp.id = product_variations.draft_product_id) AND (dp.user_id = auth.uid())))));


--
-- Name: profiles Users can insert their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: settings Users can insert their own settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own settings" ON public.settings FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: telegram_media Users can insert their own telegram media; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own telegram media" ON public.telegram_media FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.telegram_posts tp
  WHERE ((tp.id = telegram_media.post_id) AND (tp.user_id = auth.uid())))));


--
-- Name: telegram_posts Users can insert their own telegram posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own telegram posts" ON public.telegram_posts FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: telegram_sources Users can insert their own telegram sources; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own telegram sources" ON public.telegram_sources FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: wc_mappings Users can insert their own wc mappings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own wc mappings" ON public.wc_mappings FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.draft_products dp
  WHERE ((dp.id = wc_mappings.draft_product_id) AND (dp.user_id = auth.uid())))));


--
-- Name: ai_requests Users can update their own ai requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own ai requests" ON public.ai_requests FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: wc_categories_cache Users can update their own categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own categories" ON public.wc_categories_cache FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: draft_products Users can update their own draft products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own draft products" ON public.draft_products FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: notifications Users can update their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: product_attributes Users can update their own product attributes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own product attributes" ON public.product_attributes FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.draft_products dp
  WHERE ((dp.id = product_attributes.draft_product_id) AND (dp.user_id = auth.uid())))));


--
-- Name: product_images Users can update their own product images; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own product images" ON public.product_images FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.draft_products dp
  WHERE ((dp.id = product_images.draft_product_id) AND (dp.user_id = auth.uid())))));


--
-- Name: product_variations Users can update their own product variations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own product variations" ON public.product_variations FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.draft_products dp
  WHERE ((dp.id = product_variations.draft_product_id) AND (dp.user_id = auth.uid())))));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: scheduled_products Users can update their own scheduled products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own scheduled products" ON public.scheduled_products FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: settings Users can update their own settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own settings" ON public.settings FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: telegram_media Users can update their own telegram media; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own telegram media" ON public.telegram_media FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.telegram_posts tp
  WHERE ((tp.id = telegram_media.post_id) AND (tp.user_id = auth.uid())))));


--
-- Name: telegram_posts Users can update their own telegram posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own telegram posts" ON public.telegram_posts FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: telegram_sources Users can update their own telegram sources; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own telegram sources" ON public.telegram_sources FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: product_templates Users can update their own templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own templates" ON public.product_templates FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: wc_mappings Users can update their own wc mappings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own wc mappings" ON public.wc_mappings FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.draft_products dp
  WHERE ((dp.id = wc_mappings.draft_product_id) AND (dp.user_id = auth.uid())))));


--
-- Name: activity_log Users can view their own activity; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own activity" ON public.activity_log FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: ai_requests Users can view their own ai requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own ai requests" ON public.ai_requests FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: wc_categories_cache Users can view their own categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own categories" ON public.wc_categories_cache FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: draft_products Users can view their own draft products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own draft products" ON public.draft_products FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: notifications Users can view their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: product_attributes Users can view their own product attributes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own product attributes" ON public.product_attributes FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.draft_products dp
  WHERE ((dp.id = product_attributes.draft_product_id) AND (dp.user_id = auth.uid())))));


--
-- Name: product_images Users can view their own product images; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own product images" ON public.product_images FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.draft_products dp
  WHERE ((dp.id = product_images.draft_product_id) AND (dp.user_id = auth.uid())))));


--
-- Name: product_variations Users can view their own product variations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own product variations" ON public.product_variations FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.draft_products dp
  WHERE ((dp.id = product_variations.draft_product_id) AND (dp.user_id = auth.uid())))));


--
-- Name: profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: scheduled_products Users can view their own scheduled products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own scheduled products" ON public.scheduled_products FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: settings Users can view their own settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own settings" ON public.settings FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: telegram_media Users can view their own telegram media; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own telegram media" ON public.telegram_media FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.telegram_posts tp
  WHERE ((tp.id = telegram_media.post_id) AND (tp.user_id = auth.uid())))));


--
-- Name: telegram_posts Users can view their own telegram posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own telegram posts" ON public.telegram_posts FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: telegram_sources Users can view their own telegram sources; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own telegram sources" ON public.telegram_sources FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: product_templates Users can view their own templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own templates" ON public.product_templates FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: wc_mappings Users can view their own wc mappings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own wc mappings" ON public.wc_mappings FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.draft_products dp
  WHERE ((dp.id = wc_mappings.draft_product_id) AND (dp.user_id = auth.uid())))));


--
-- Name: activity_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: draft_products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.draft_products ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: product_attributes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_attributes ENABLE ROW LEVEL SECURITY;

--
-- Name: product_images; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

--
-- Name: product_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: product_variations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_variations ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: scheduled_products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.scheduled_products ENABLE ROW LEVEL SECURITY;

--
-- Name: settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

--
-- Name: telegram_media; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.telegram_media ENABLE ROW LEVEL SECURITY;

--
-- Name: telegram_posts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.telegram_posts ENABLE ROW LEVEL SECURITY;

--
-- Name: telegram_sources; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.telegram_sources ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: wc_categories_cache; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wc_categories_cache ENABLE ROW LEVEL SECURITY;

--
-- Name: wc_mappings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wc_mappings ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;