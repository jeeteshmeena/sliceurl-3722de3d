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
-- Name: api_key_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.api_key_status AS ENUM (
    'active',
    'revoked'
);


--
-- Name: link_health_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.link_health_status AS ENUM (
    'active',
    'low_activity',
    'inactive',
    'broken'
);


--
-- Name: user_persona; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_persona AS ENUM (
    'influencer',
    'marketer',
    'agency',
    'casual'
);


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, avatar_url)
  VALUES (
    new.id,
    COALESCE(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      new.raw_user_meta_data ->> 'display_name'
    ),
    COALESCE(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture'
    )
  );
  RETURN new;
END;
$$;


--
-- Name: increment_clicks_counter(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_clicks_counter() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  PERFORM public.increment_global_counter('total_clicks', 1);
  RETURN NEW;
END;
$$;


--
-- Name: increment_global_counter(text, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_global_counter(counter_name text, increment_by bigint DEFAULT 1) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF counter_name = 'total_links_created' THEN
    UPDATE public.global_counters 
    SET total_links_created = total_links_created + increment_by, updated_at = now()
    WHERE id = 'main';
  ELSIF counter_name = 'total_clicks' THEN
    UPDATE public.global_counters 
    SET total_clicks = total_clicks + increment_by, updated_at = now()
    WHERE id = 'main';
  ELSIF counter_name = 'total_signups' THEN
    UPDATE public.global_counters 
    SET total_signups = total_signups + increment_by, updated_at = now()
    WHERE id = 'main';
  END IF;
END;
$$;


--
-- Name: increment_links_counter(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_links_counter() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  PERFORM public.increment_global_counter('total_links_created', 1);
  RETURN NEW;
END;
$$;


--
-- Name: increment_signup_counter(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_signup_counter() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  PERFORM public.increment_global_counter('total_signups', 1);
  RETURN NEW;
END;
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
-- Name: announcements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.announcements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    message text NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: api_keys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.api_keys (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    key_prefix character varying(8) NOT NULL,
    key_hash text NOT NULL,
    name character varying(100),
    status public.api_key_status DEFAULT 'active'::public.api_key_status NOT NULL,
    rate_limit_daily integer DEFAULT 100 NOT NULL,
    requests_today integer DEFAULT 0 NOT NULL,
    last_request_at timestamp with time zone,
    rate_limit_reset_at timestamp with time zone DEFAULT (CURRENT_DATE + '1 day'::interval) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    revoked_at timestamp with time zone
);


--
-- Name: clicks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clicks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    link_id uuid NOT NULL,
    clicked_at timestamp with time zone DEFAULT now() NOT NULL,
    ip_address text,
    user_agent text,
    referrer text,
    country text,
    city text,
    device_type text,
    browser text,
    os text,
    is_unique boolean DEFAULT true,
    redirected_at timestamp with time zone
);


--
-- Name: folders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.folders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    color text DEFAULT '#6366f1'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: global_counters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.global_counters (
    id text DEFAULT 'main'::text NOT NULL,
    total_links_created bigint DEFAULT 0 NOT NULL,
    total_clicks bigint DEFAULT 0 NOT NULL,
    total_signups bigint DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    original_url text NOT NULL,
    short_code text NOT NULL,
    custom_slug text,
    title text,
    folder_id uuid,
    is_favorite boolean DEFAULT false,
    is_password_protected boolean DEFAULT false,
    password_hash text,
    is_private boolean DEFAULT false,
    expires_at timestamp with time zone,
    max_clicks integer,
    facebook_pixel text,
    google_pixel text,
    custom_og_title text,
    custom_og_description text,
    custom_og_image text,
    custom_favicon text,
    click_count integer DEFAULT 0,
    last_clicked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    health_status public.link_health_status DEFAULT 'active'::public.link_health_status,
    last_health_check timestamp with time zone,
    is_broken boolean DEFAULT false,
    notify_on_broken boolean DEFAULT false,
    api_source boolean DEFAULT false,
    api_key_id uuid,
    is_pinned boolean DEFAULT false,
    utm_enabled boolean DEFAULT false,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    utm_term text,
    utm_content text,
    final_utm_url text,
    safety_status text DEFAULT 'unknown'::text,
    last_scanned_at timestamp with time zone,
    batch_id text,
    order_index integer,
    slice_duration_ms integer,
    CONSTRAINT links_safety_status_check CHECK ((safety_status = ANY (ARRAY['unknown'::text, 'safe'::text, 'blocked'::text])))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    display_name text,
    avatar_url text,
    theme text DEFAULT 'system'::text,
    auto_copy_enabled boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    auto_redirect_enabled boolean DEFAULT false,
    email_alerts_enabled boolean DEFAULT false,
    security_mode text DEFAULT 'warn'::text,
    CONSTRAINT profiles_security_mode_check CHECK ((security_mode = ANY (ARRAY['disabled'::text, 'warn'::text, 'strict'::text])))
);


--
-- Name: qr_designs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.qr_designs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    link_id uuid NOT NULL,
    user_id uuid NOT NULL,
    fg_color text DEFAULT '#000000'::text NOT NULL,
    bg_color text DEFAULT '#ffffff'::text NOT NULL,
    gradient_enabled boolean DEFAULT false NOT NULL,
    gradient_type text DEFAULT 'linear'::text NOT NULL,
    gradient_start text DEFAULT '#000000'::text,
    gradient_end text DEFAULT '#333333'::text,
    shape text DEFAULT 'square'::text NOT NULL,
    corner_radius integer DEFAULT 0 NOT NULL,
    padding integer DEFAULT 20 NOT NULL,
    logo_url text,
    logo_size integer DEFAULT 20 NOT NULL,
    frame_type text,
    frame_text text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_personas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_personas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    persona public.user_persona DEFAULT 'casual'::public.user_persona NOT NULL,
    total_links integer DEFAULT 0 NOT NULL,
    total_clicks integer DEFAULT 0 NOT NULL,
    utm_usage_count integer DEFAULT 0 NOT NULL,
    folder_count integer DEFAULT 0 NOT NULL,
    links_this_week integer DEFAULT 0 NOT NULL,
    last_calculated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: utm_data; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.utm_data (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    link_id uuid NOT NULL,
    user_id uuid NOT NULL,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    utm_term text,
    utm_content text,
    final_url text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: announcements announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_pkey PRIMARY KEY (id);


--
-- Name: api_keys api_keys_key_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_key_hash_key UNIQUE (key_hash);


--
-- Name: api_keys api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_pkey PRIMARY KEY (id);


--
-- Name: clicks clicks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clicks
    ADD CONSTRAINT clicks_pkey PRIMARY KEY (id);


--
-- Name: folders folders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.folders
    ADD CONSTRAINT folders_pkey PRIMARY KEY (id);


--
-- Name: global_counters global_counters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_counters
    ADD CONSTRAINT global_counters_pkey PRIMARY KEY (id);


--
-- Name: links links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.links
    ADD CONSTRAINT links_pkey PRIMARY KEY (id);


--
-- Name: links links_short_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.links
    ADD CONSTRAINT links_short_code_key UNIQUE (short_code);


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
-- Name: qr_designs qr_designs_link_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qr_designs
    ADD CONSTRAINT qr_designs_link_id_key UNIQUE (link_id);


--
-- Name: qr_designs qr_designs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qr_designs
    ADD CONSTRAINT qr_designs_pkey PRIMARY KEY (id);


--
-- Name: user_personas user_personas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_personas
    ADD CONSTRAINT user_personas_pkey PRIMARY KEY (id);


--
-- Name: user_personas user_personas_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_personas
    ADD CONSTRAINT user_personas_user_id_key UNIQUE (user_id);


--
-- Name: utm_data utm_data_link_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.utm_data
    ADD CONSTRAINT utm_data_link_id_key UNIQUE (link_id);


--
-- Name: utm_data utm_data_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.utm_data
    ADD CONSTRAINT utm_data_pkey PRIMARY KEY (id);


--
-- Name: idx_api_keys_key_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_keys_key_hash ON public.api_keys USING btree (key_hash);


--
-- Name: idx_api_keys_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_keys_status ON public.api_keys USING btree (status);


--
-- Name: idx_api_keys_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_keys_user_id ON public.api_keys USING btree (user_id);


--
-- Name: idx_clicks_clicked_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clicks_clicked_at ON public.clicks USING btree (clicked_at);


--
-- Name: idx_clicks_link_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clicks_link_id ON public.clicks USING btree (link_id);


--
-- Name: idx_clicks_redirect_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clicks_redirect_time ON public.clicks USING btree (clicked_at, redirected_at) WHERE (redirected_at IS NOT NULL);


--
-- Name: idx_links_batch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_links_batch_id ON public.links USING btree (batch_id) WHERE (batch_id IS NOT NULL);


--
-- Name: idx_links_health_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_links_health_status ON public.links USING btree (health_status);


--
-- Name: idx_links_last_clicked_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_links_last_clicked_at ON public.links USING btree (last_clicked_at);


--
-- Name: idx_links_short_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_links_short_code ON public.links USING btree (short_code);


--
-- Name: idx_links_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_links_user_id ON public.links USING btree (user_id);


--
-- Name: idx_links_utm_enabled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_links_utm_enabled ON public.links USING btree (utm_enabled) WHERE (utm_enabled = true);


--
-- Name: idx_user_personas_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_personas_user_id ON public.user_personas USING btree (user_id);


--
-- Name: idx_utm_data_link_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_utm_data_link_id ON public.utm_data USING btree (link_id);


--
-- Name: idx_utm_data_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_utm_data_user_id ON public.utm_data USING btree (user_id);


--
-- Name: clicks on_new_click_increment_counter; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_new_click_increment_counter AFTER INSERT ON public.clicks FOR EACH ROW EXECUTE FUNCTION public.increment_clicks_counter();


--
-- Name: links on_new_link_increment_counter; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_new_link_increment_counter AFTER INSERT ON public.links FOR EACH ROW EXECUTE FUNCTION public.increment_links_counter();


--
-- Name: profiles on_new_profile_increment_signup; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_new_profile_increment_signup AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.increment_signup_counter();


--
-- Name: api_keys update_api_keys_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON public.api_keys FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: folders update_folders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_folders_updated_at BEFORE UPDATE ON public.folders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: links update_links_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_links_updated_at BEFORE UPDATE ON public.links FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: qr_designs update_qr_designs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_qr_designs_updated_at BEFORE UPDATE ON public.qr_designs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_personas update_user_personas_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_personas_updated_at BEFORE UPDATE ON public.user_personas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: utm_data update_utm_data_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_utm_data_updated_at BEFORE UPDATE ON public.utm_data FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: clicks clicks_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clicks
    ADD CONSTRAINT clicks_link_id_fkey FOREIGN KEY (link_id) REFERENCES public.links(id) ON DELETE CASCADE;


--
-- Name: links links_api_key_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.links
    ADD CONSTRAINT links_api_key_id_fkey FOREIGN KEY (api_key_id) REFERENCES public.api_keys(id) ON DELETE SET NULL;


--
-- Name: links links_folder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.links
    ADD CONSTRAINT links_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES public.folders(id) ON DELETE SET NULL;


--
-- Name: qr_designs qr_designs_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qr_designs
    ADD CONSTRAINT qr_designs_link_id_fkey FOREIGN KEY (link_id) REFERENCES public.links(id) ON DELETE CASCADE;


--
-- Name: utm_data utm_data_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.utm_data
    ADD CONSTRAINT utm_data_link_id_fkey FOREIGN KEY (link_id) REFERENCES public.links(id) ON DELETE CASCADE;


--
-- Name: clicks Anyone can record clicks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can record clicks" ON public.clicks FOR INSERT WITH CHECK (true);


--
-- Name: announcements Anyone can view active announcements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active announcements" ON public.announcements FOR SELECT USING ((is_active = true));


--
-- Name: global_counters Anyone can view global counters; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view global counters" ON public.global_counters FOR SELECT USING (true);


--
-- Name: clicks Link owners can view click analytics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Link owners can view click analytics" ON public.clicks FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.links
  WHERE ((links.id = clicks.link_id) AND (links.user_id = auth.uid())))));


--
-- Name: utm_data Users can create UTM data for their links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create UTM data for their links" ON public.utm_data FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: links Users can create links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create links" ON public.links FOR INSERT WITH CHECK (true);


--
-- Name: api_keys Users can create their own API keys; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own API keys" ON public.api_keys FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: qr_designs Users can create their own QR designs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own QR designs" ON public.qr_designs FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: folders Users can create their own folders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own folders" ON public.folders FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can create their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: api_keys Users can delete their own API keys; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own API keys" ON public.api_keys FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: qr_designs Users can delete their own QR designs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own QR designs" ON public.qr_designs FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: utm_data Users can delete their own UTM data; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own UTM data" ON public.utm_data FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: folders Users can delete their own folders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own folders" ON public.folders FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: links Users can delete their own links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own links" ON public.links FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: user_personas Users can insert their own persona; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own persona" ON public.user_personas FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: api_keys Users can update their own API keys; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own API keys" ON public.api_keys FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: qr_designs Users can update their own QR designs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own QR designs" ON public.qr_designs FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: utm_data Users can update their own UTM data; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own UTM data" ON public.utm_data FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: folders Users can update their own folders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own folders" ON public.folders FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: links Users can update their own links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own links" ON public.links FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: user_personas Users can update their own persona; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own persona" ON public.user_personas FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: api_keys Users can view their own API keys; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own API keys" ON public.api_keys FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: qr_designs Users can view their own QR designs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own QR designs" ON public.qr_designs FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: utm_data Users can view their own UTM data; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own UTM data" ON public.utm_data FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: folders Users can view their own folders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own folders" ON public.folders FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: links Users can view their own links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own links" ON public.links FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_personas Users can view their own persona; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own persona" ON public.user_personas FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: announcements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

--
-- Name: api_keys; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

--
-- Name: clicks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.clicks ENABLE ROW LEVEL SECURITY;

--
-- Name: folders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;

--
-- Name: global_counters; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.global_counters ENABLE ROW LEVEL SECURITY;

--
-- Name: links; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.links ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: qr_designs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.qr_designs ENABLE ROW LEVEL SECURITY;

--
-- Name: user_personas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_personas ENABLE ROW LEVEL SECURITY;

--
-- Name: utm_data; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.utm_data ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;