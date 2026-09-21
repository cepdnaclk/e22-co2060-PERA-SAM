-- Migration to support appointment scheduling, time slots, and chat attachments
-- 1. Add scheduled_date and scheduled_time_slot to repair_requests
ALTER TABLE public.repair_requests 
ADD COLUMN IF NOT EXISTS scheduled_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS scheduled_time_slot TEXT;

-- 2. Add attachment_urls and metadata to request_messages
ALTER TABLE public.request_messages 
ADD COLUMN IF NOT EXISTS attachment_urls TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 3. Create index for scheduled appointments query
CREATE INDEX IF NOT EXISTS idx_repair_requests_scheduled_date ON public.repair_requests(scheduled_date);
