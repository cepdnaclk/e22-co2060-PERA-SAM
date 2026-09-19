-- Add is_read column to track unread messages
ALTER TABLE public.request_messages ADD COLUMN is_read BOOLEAN DEFAULT false NOT NULL;

-- Allow users and companies to update the is_read status of messages for their requests
-- Specifically, they can only update messages where they are NOT the sender (they can only mark received messages as read)
CREATE POLICY "Users can update is_read for received messages"
    ON public.request_messages FOR UPDATE
    USING (
        auth.uid() != sender_id AND
        EXISTS (
            SELECT 1 FROM public.repair_requests rr
            WHERE rr.id = request_messages.request_id
            AND (rr.user_id = auth.uid() OR rr.company_id = auth.uid())
        )
    )
    WITH CHECK (
        auth.uid() != sender_id AND
        EXISTS (
            SELECT 1 FROM public.repair_requests rr
            WHERE rr.id = request_messages.request_id
            AND (rr.user_id = auth.uid() OR rr.company_id = auth.uid())
        )
    );
