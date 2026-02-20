-- Add unique constraint on setting_key for upsert support
ALTER TABLE public.app_settings ADD CONSTRAINT app_settings_setting_key_unique UNIQUE (setting_key);

-- Add unique constraint on user_roles for upsert support (user_id only, since one role per user)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_user_id_key'
  ) THEN
    ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- Enable pg_cron and pg_net for scheduled sync
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;