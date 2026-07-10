import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader2, User, Building2 } from 'lucide-react';
import { toast } from 'sonner';

interface Message {
  id: string;
  request_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  profiles?: {
    name: string;
    avatar_url: string | null;
  };
}

interface RequestChatDialogProps {
  requestId: string | null;
  isOpen: boolean;
  onClose: () => void;
  otherPartyName?: string;
  isCompany: boolean;
}

export function RequestChatDialog({ requestId, isOpen, onClose, otherPartyName, isCompany }: RequestChatDialogProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !requestId || !user) return;

    const fetchMessages = async () => {
      setLoading(true);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any)
          .from('request_messages')
          .select(`
            *,
            profiles:sender_id (name, avatar_url)
          `)
          .eq('request_id', requestId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setMessages(data || []);
        
        // Mark as read immediately when opened
        markMessagesAsRead();
      } catch (err) {
        console.error('Error fetching messages:', err);
        toast.error('Failed to load messages');
      } finally {
        setLoading(false);
        scrollToBottom();
      }
    };

    fetchMessages();

    const channel = supabase
      .channel(`chat_${requestId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'request_messages',
          filter: `request_id=eq.${requestId}`,
        },
        async (payload) => {
          // Fetch the sender profile for the new message
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data, error } = await (supabase as any)
              .from('profiles')
              .select('name, avatar_url')
              .eq('id', payload.new.sender_id)
              .single();
              
            const newMsg = {
              ...payload.new,
              profiles: data || { name: 'Unknown', avatar_url: null }
            } as Message;
            
            setMessages((prev) => {
              // Avoid duplicates if we just sent it
              if (prev.some(m => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
            scrollToBottom();
            
            // Mark new incoming messages as read if we are looking at them
            if (payload.new.sender_id !== user.id) {
              markMessagesAsRead();
            }
          } catch(e) {
            console.error('Error fetching sender profile for realtime message:', e);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, requestId, user]);

  const markMessagesAsRead = async () => {
    if (!requestId || !user) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('request_messages')
        .update({ is_read: true })
        .eq('request_id', requestId)
        .eq('is_read', false)
        .neq('sender_id', user.id);
    } catch (e) {
      console.error('Failed to mark messages as read:', e);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 100);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !requestId || !user) return;

    setSending(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('request_messages')
        .insert({
          request_id: requestId,
          sender_id: user.id,
          content: newMessage.trim(),
        });

      if (error) throw error;
      setNewMessage('');
      scrollToBottom();
    } catch (err) {
      console.error('Error sending message:', err);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md md:max-w-lg flex flex-col h-[80vh] max-h-[600px] p-0 overflow-hidden bg-background border-border">
        <DialogHeader className="p-4 border-b border-border flex-shrink-0 bg-muted/30">
          <DialogTitle className="text-lg flex items-center gap-2">
            {!isCompany ? <Building2 className="w-5 h-5 text-muted-foreground" /> : <User className="w-5 h-5 text-muted-foreground" />}
            Chat with {otherPartyName || (isCompany ? 'User' : 'Company')}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 p-4" viewportRef={scrollRef}>
          {loading ? (
            <div className="flex items-center justify-center h-full min-h-[200px]">
              <Loader2 className="h-8 w-8 text-accent animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-muted-foreground">
              <p>No messages yet.</p>
              <p className="text-sm">Start the conversation!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => {
                const isMe = msg.sender_id === user?.id;
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-4`}>
                    {!isMe && (
                      <div className="w-8 h-8 rounded-full bg-muted overflow-hidden flex-shrink-0 mr-2 mt-auto">
                        {msg.profiles?.avatar_url ? (
                          <img src={msg.profiles.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-accent/20 text-accent text-xs font-bold">
                            {msg.profiles?.name?.charAt(0).toUpperCase() || '?'}
                          </div>
                        )}
                      </div>
                    )}
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${isMe ? 'bg-accent text-accent-foreground rounded-br-sm' : 'bg-muted/80 text-foreground rounded-bl-sm'}`}>
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                      <p className={`text-[10px] mt-1 ${isMe ? 'text-accent-foreground/70' : 'text-muted-foreground'} text-right`}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <div className="p-4 border-t border-border bg-background">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 bg-muted/50 border-transparent focus-visible:ring-accent"
              disabled={sending || loading}
            />
            <Button type="submit" size="icon" variant="accent" disabled={!newMessage.trim() || sending || loading} className="shrink-0 rounded-full">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
