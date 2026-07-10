-- Create request_messages table
CREATE TABLE IF NOT EXISTS public.request_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    request_id UUID NOT NULL REFERENCES public.repair_requests(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.request_messages ENABLE ROW LEVEL SECURITY;

-- Allow users and companies to view messages for their requests
CREATE POLICY "Users can view messages for their requests"
    ON public.request_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.repair_requests rr
            WHERE rr.id = request_messages.request_id
            AND (rr.user_id = auth.uid() OR rr.company_id = auth.uid())
        )
    );

-- Allow users and companies to insert messages for their requests
CREATE POLICY "Users can insert messages for their requests"
    ON public.request_messages FOR INSERT
    WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM public.repair_requests rr
            WHERE rr.id = request_messages.request_id
            AND (rr.user_id = auth.uid() OR rr.company_id = auth.uid())
        )
    );

-- Add realtime publication for the table so frontend can listen to changes
ALTER PUBLICATION supabase_realtime ADD TABLE public.request_messages;
