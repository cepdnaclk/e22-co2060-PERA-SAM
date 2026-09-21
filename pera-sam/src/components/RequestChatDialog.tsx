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
import { Label } from '@/components/ui/label';
import {
  Send,
  Loader2,
  User,
  Building2,
  Paperclip,
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  X,
  Sparkles,
  ExternalLink,
  ChevronDown,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import {
  encodeAppointmentProposal,
  parseChatMessage,
  saveApprovedAppointment,
  getScheduledInfo,
  AppointmentProposal
} from '@/lib/appointment-utils';

interface Message {
  id: string;
  request_id: string;
  sender_id: string;
  content: string;
  attachment_urls?: string[];
  created_at: string;
  is_read?: boolean;
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

const COMMON_TIME_SLOTS = [
  '09:00 AM - 12:00 PM (Morning)',
  '12:00 PM - 03:00 PM (Early Afternoon)',
  '03:00 PM - 06:00 PM (Late Afternoon)',
  '09:00 AM - 05:00 PM (Full Day Window)',
];

export function RequestChatDialog({ requestId, isOpen, onClose, otherPartyName, isCompany }: RequestChatDialogProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // File attachment state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Lightbox preview state
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Proposal modal state
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [proposalStartDate, setProposalStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [proposalEndDate, setProposalEndDate] = useState('');
  const [proposalTimeSlot, setProposalTimeSlot] = useState(COMMON_TIME_SLOTS[0]);
  const [customTimeSlot, setCustomTimeSlot] = useState('');
  const [isCustomTime, setIsCustomTime] = useState(false);
  const [proposalNote, setProposalNote] = useState('');

  // Company approval modal / selection state
  const [approvingProposal, setApprovingProposal] = useState<AppointmentProposal | null>(null);
  const [confirmingDate, setConfirmingDate] = useState('');
  const [confirmingTime, setConfirmingTime] = useState('');
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);

  // Current request metadata (for scheduled info)
  const [requestDetails, setRequestDetails] = useState<{
    status?: string;
    scheduled_date?: string | null;
    scheduled_time_slot?: string | null;
    description?: string | null;
  } | null>(null);

  // Fetch request details
  const fetchRequestDetails = async () => {
    if (!requestId) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('repair_requests')
        .select('status, scheduled_date, scheduled_time_slot, description')
        .eq('id', requestId)
        .single();
      if (!error && data) {
        setRequestDetails(data);
      }
    } catch (e) {
      console.error('Error fetching request details:', e);
    }
  };

  useEffect(() => {
    if (!isOpen || !requestId || !user) return;

    fetchRequestDetails();

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
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data } = await (supabase as any)
              .from('profiles')
              .select('name, avatar_url')
              .eq('id', payload.new.sender_id)
              .single();

            const newMsg = {
              ...payload.new,
              profiles: data || { name: 'Unknown', avatar_url: null }
            } as Message;

            setMessages((prev) => {
              if (prev.some(m => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
            scrollToBottom();

            if (payload.new.sender_id !== user.id) {
              markMessagesAsRead();
            }

            // Refresh request details in case this was a confirmation
            fetchRequestDetails();
          } catch (e) {
            console.error('Error handling realtime message:', e);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'repair_requests',
          filter: `id=eq.${requestId}`,
        },
        () => {
          fetchRequestDetails();
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

  // Handle image file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (PNG, JPG, WEBP, etc.)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size must be less than 10MB');
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setFilePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Upload image to Supabase Storage or convert to data URL fallback
  const uploadImage = async (file: File): Promise<string> => {
    const ext = file.name.split('.').pop() || 'png';
    const filePath = `chat-attachments/${requestId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('repair-photos')
        .upload(filePath, file, { contentType: file.type });

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('repair-photos')
          .getPublicUrl(filePath);
        if (urlData?.publicUrl) return urlData.publicUrl;
      }
    } catch (e) {
      console.warn('Storage upload attempt failed, using inline data URL fallback:', e);
    }

    // Fallback: compress image to a reasonable data URL so it never fails to send
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  // Send regular text / image message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || !requestId || !user) return;

    setSending(true);
    let uploadedUrl: string | null = null;

    try {
      if (selectedFile) {
        setUploadingImage(true);
        uploadedUrl = await uploadImage(selectedFile);
      }

      let contentToSend = newMessage.trim();
      if (uploadedUrl) {
        contentToSend = `${contentToSend ? contentToSend + '\n' : ''}[[ATTACHMENT:${uploadedUrl}]]`;
      }

      // Try inserting with attachment_urls array first
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const insertPayload: any = {
        request_id: requestId,
        sender_id: user.id,
        content: contentToSend,
      };

      if (uploadedUrl) {
        insertPayload.attachment_urls = [uploadedUrl];
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('request_messages')
        .insert(insertPayload);

      if (error) {
        // If attachment_urls column doesn't exist, retry without that column
        if (error.message?.includes('attachment_urls')) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error: retryError } = await (supabase as any)
            .from('request_messages')
            .insert({
              request_id: requestId,
              sender_id: user.id,
              content: contentToSend,
            });
          if (retryError) throw retryError;
        } else {
          throw error;
        }
      }

      setNewMessage('');
      clearSelectedFile();
      scrollToBottom();
    } catch (err) {
      console.error('Error sending message:', err);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
      setUploadingImage(false);
    }
  };

  // Submit appointment proposal (by user)
  const handleSendProposal = async () => {
    if (!requestId || !user || !proposalStartDate) {
      toast.error('Please choose a valid starting date');
      return;
    }

    const selectedTime = isCustomTime && customTimeSlot.trim() 
      ? customTimeSlot.trim() 
      : proposalTimeSlot;

    const proposal: AppointmentProposal = {
      type: 'appointment_proposal',
      proposalId: `prop_${Date.now()}`,
      startDate: proposalStartDate,
      endDate: proposalEndDate || undefined,
      timeRange: selectedTime,
      note: proposalNote.trim() || undefined,
      status: 'proposed',
    };

    const encodedContent = encodeAppointmentProposal(proposal);

    setSending(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('request_messages')
        .insert({
          request_id: requestId,
          sender_id: user.id,
          content: encodedContent,
        });

      if (error) throw error;
      toast.success('Appointment date & time proposal sent!');
      setShowProposalModal(false);
      setProposalNote('');
      scrollToBottom();
    } catch (err) {
      console.error('Error sending appointment proposal:', err);
      toast.error('Failed to send appointment proposal');
    } finally {
      setSending(false);
    }
  };

  // Open confirmation modal for company
  const handleOpenApproveModal = (proposal: AppointmentProposal) => {
    setApprovingProposal(proposal);
    setConfirmingDate(proposal.startDate);
    setConfirmingTime(proposal.timeRange);
  };

  // Confirm and approve appointment (by company)
  const handleConfirmApproval = async () => {
    if (!approvingProposal || !requestId || !user || !confirmingDate) return;

    setIsSubmittingApproval(true);
    try {
      // 1. Save to repair_requests table
      const res = await saveApprovedAppointment(
        requestId,
        confirmingDate,
        confirmingTime || approvingProposal.timeRange,
        requestDetails?.description || ''
      );

      if (!res.success) {
        throw new Error(res.error || 'Failed to update request');
      }

      // 2. Post a confirmation message in chat
      const confirmationText = `✅ Appointment Confirmed!\nCompany has approved the repair service for ${new Date(confirmingDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })} during ${confirmingTime || approvingProposal.timeRange}.\nThis has been automatically scheduled in the Appointments calendar.`;

      const updatedProposal: AppointmentProposal = {
        ...approvingProposal,
        status: 'accepted',
        confirmedDate: confirmingDate,
        confirmedTime: confirmingTime || approvingProposal.timeRange,
        confirmedBy: user.name || 'Company Technician',
      };

      const encodedUpdate = encodeAppointmentProposal(updatedProposal, confirmationText);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('request_messages')
        .insert({
          request_id: requestId,
          sender_id: user.id,
          content: encodedUpdate,
        });

      toast.success('🎉 Appointment confirmed and added to calendar!');
      setApprovingProposal(null);
      fetchRequestDetails();
      scrollToBottom();
    } catch (err: any) {
      console.error('Error confirming appointment:', err);
      toast.error(`Confirmation failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  // Determine current scheduled badge in header if any
  const scheduledBadge = requestDetails ? getScheduledInfo(requestDetails) : null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-lg md:max-w-2xl flex flex-col h-[85vh] max-h-[700px] p-0 overflow-hidden bg-background border-border shadow-2xl">
          {/* Header */}
          <DialogHeader className="p-4 border-b border-border flex-shrink-0 bg-muted/30 flex flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-accent/15 flex items-center justify-center text-accent font-bold">
                {!isCompany ? <Building2 className="w-5 h-5" /> : <User className="w-5 h-5" />}
              </div>
              <div>
                <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                  {otherPartyName || (isCompany ? 'User' : 'Company')}
                </DialogTitle>
                <p className="text-xs text-muted-foreground">
                  {isCompany ? 'Service Requester' : 'Technician / Service Provider'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {scheduledBadge?.isExplicit && scheduledBadge.date && (
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/10 text-success text-[11px] font-semibold border border-success/20">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>
                    {scheduledBadge.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {scheduledBadge.timeSlot ? ` • ${scheduledBadge.timeSlot}` : ''}
                  </span>
                </div>
              )}

              {/* Propose Appointment Button (Visible to users) */}
              {!isCompany && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowProposalModal(true)}
                  className="text-xs font-semibold gap-1.5 border-accent/40 text-accent hover:bg-accent/10"
                >
                  <CalendarIcon className="w-3.5 h-3.5" />
                  Propose Time
                </Button>
              )}
            </div>
          </DialogHeader>

          {/* Active scheduled alert banner if explicit */}
          {scheduledBadge?.isExplicit && scheduledBadge.date && (
            <div className="px-4 py-2 bg-success/10 border-b border-success/20 flex items-center justify-between text-xs text-success">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>
                  <strong>Confirmed Appointment:</strong> {scheduledBadge.date.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
                  {scheduledBadge.timeSlot ? ` (${scheduledBadge.timeSlot})` : ''}
                </span>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-success/20 rounded">
                Synced to Calendar
              </span>
            </div>
          )}

          {/* Messages Area */}
          <ScrollArea className="flex-1 p-4" viewportRef={scrollRef}>
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[250px] gap-2">
                <Loader2 className="h-8 w-8 text-accent animate-spin" />
                <p className="text-xs text-muted-foreground">Loading conversation...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[250px] text-muted-foreground text-center p-6">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <Sparkles className="w-6 h-6 text-accent" />
                </div>
                <p className="font-semibold text-foreground">No messages yet</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  {isCompany 
                    ? 'Wait for the user or send a message to coordinate service details.' 
                    : 'Send a message, attach photos of the machine, or propose an appointment date!'}
                </p>
                {!isCompany && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowProposalModal(true)}
                    className="mt-4 gap-1.5 text-xs"
                  >
                    <CalendarIcon className="w-3.5 h-3.5" />
                    Propose Service Date & Time
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => {
                  const isMe = msg.sender_id === user?.id;
                  const parsed = parseChatMessage(msg.content, msg.attachment_urls);

                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-3`}>
                      {!isMe && (
                        <div className="w-8 h-8 rounded-full bg-muted overflow-hidden flex-shrink-0 mr-2 mt-auto">
                          {msg.profiles?.avatar_url ? (
                            <img src={msg.profiles.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-accent/20 text-accent text-xs font-bold">
                              {msg.profiles?.name?.charAt(0).toUpperCase() || (isCompany ? 'U' : 'C')}
                            </div>
                          )}
                        </div>
                      )}

                      <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3 shadow-sm ${
                        isMe 
                          ? 'bg-accent text-accent-foreground rounded-br-sm' 
                          : 'bg-muted/80 text-foreground rounded-bl-sm border border-border/40'
                      }`}>
                        {/* Text Content */}
                        {parsed.cleanText && (
                          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                            {parsed.cleanText}
                          </p>
                        )}

                        {/* Image Attachments */}
                        {parsed.attachments.length > 0 && (
                          <div className="mt-2 space-y-2">
                            {parsed.attachments.map((url, idx) => (
                              <div
                                key={idx}
                                onClick={() => setLightboxImage(url)}
                                className="relative rounded-lg overflow-hidden border border-black/10 dark:border-white/10 cursor-pointer group bg-black/5"
                              >
                                <img
                                  src={url}
                                  alt="Attachment"
                                  className="max-h-60 w-full object-cover rounded-lg group-hover:opacity-95 transition-opacity"
                                />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-medium gap-1">
                                  <ExternalLink className="w-4 h-4" />
                                  Click to view
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Appointment Proposal Card */}
                        {parsed.proposal && (
                          <div className={`mt-3 p-3.5 rounded-xl border text-xs ${
                            isMe
                              ? 'bg-accent-foreground/10 border-accent-foreground/20 text-accent-foreground'
                              : 'bg-card border-accent/30 text-foreground'
                          }`}>
                            <div className="flex items-center justify-between gap-2 border-b border-border/20 pb-2 mb-2">
                              <span className="font-bold flex items-center gap-1.5">
                                <CalendarIcon className="w-4 h-4 text-accent" />
                                {parsed.proposal.status === 'accepted'
                                  ? 'Confirmed Appointment'
                                  : 'Proposed Service Window'}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                parsed.proposal.status === 'accepted'
                                  ? 'bg-success/20 text-success'
                                  : 'bg-warning/20 text-warning'
                              }`}>
                                {parsed.proposal.status === 'accepted' ? 'Confirmed' : 'Pending Approval'}
                              </span>
                            </div>

                            <div className="space-y-1.5 my-2">
                              <div className="flex items-start gap-2">
                                <CalendarIcon className="w-3.5 h-3.5 mt-0.5 text-muted-foreground shrink-0" />
                                <div>
                                  <span className="text-[10px] text-muted-foreground uppercase block font-semibold">Date</span>
                                  <span className="font-semibold">
                                    {parsed.proposal.status === 'accepted' && parsed.proposal.confirmedDate
                                      ? new Date(parsed.proposal.confirmedDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
                                      : parsed.proposal.endDate && parsed.proposal.endDate !== parsed.proposal.startDate
                                        ? `${new Date(parsed.proposal.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(parsed.proposal.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                                        : new Date(parsed.proposal.startDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
                                    }
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-start gap-2">
                                <Clock className="w-3.5 h-3.5 mt-0.5 text-muted-foreground shrink-0" />
                                <div>
                                  <span className="text-[10px] text-muted-foreground uppercase block font-semibold">Time Window</span>
                                  <span className="font-semibold">
                                    {parsed.proposal.status === 'accepted' && parsed.proposal.confirmedTime
                                      ? parsed.proposal.confirmedTime
                                      : parsed.proposal.timeRange}
                                  </span>
                                </div>
                              </div>

                              {parsed.proposal.note && (
                                <div className="flex items-start gap-2 pt-1">
                                  <Info className="w-3.5 h-3.5 mt-0.5 text-muted-foreground shrink-0" />
                                  <div>
                                    <span className="text-[10px] text-muted-foreground uppercase block font-semibold">Client Note</span>
                                    <span className="italic">{parsed.proposal.note}</span>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Action for Company: Accept / Confirm Appointment */}
                            {isCompany && parsed.proposal.status === 'proposed' && (
                              <div className="mt-3 pt-2 border-t border-border/20">
                                <Button
                                  size="sm"
                                  variant="accent"
                                  onClick={() => handleOpenApproveModal(parsed.proposal!)}
                                  className="w-full text-xs font-bold gap-1.5"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                  Approve & Confirm Date
                                </Button>
                              </div>
                            )}

                            {/* Confirmation Note */}
                            {parsed.proposal.status === 'accepted' && (
                              <div className="mt-2 pt-2 border-t border-border/20 flex items-center gap-1.5 text-[11px] text-success">
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                <span>Scheduled in Company & User Calendar</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Timestamp */}
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

          {/* Selected image preview bar before sending */}
          {filePreview && (
            <div className="px-4 py-2 bg-muted/40 border-t border-border flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <img
                  src={filePreview}
                  alt="Upload preview"
                  className="w-10 h-10 object-cover rounded-md border border-border"
                />
                <div className="text-xs">
                  <p className="font-medium text-foreground truncate max-w-[200px]">{selectedFile?.name}</p>
                  <p className="text-muted-foreground text-[10px]">
                    {((selectedFile?.size || 0) / 1024).toFixed(0)} KB • Ready to send
                  </p>
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={clearSelectedFile}
                className="h-7 w-7 rounded-full text-muted-foreground hover:text-destructive"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Footer Input Bar */}
          <div className="p-3 sm:p-4 border-t border-border bg-background flex flex-col gap-2">
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={sending || loading}
                title="Attach picture"
                className="shrink-0 rounded-full h-10 w-10 border-border hover:border-accent text-muted-foreground hover:text-accent"
              >
                <Paperclip className="h-4 w-4" />
              </Button>

              {!isCompany && (
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={() => setShowProposalModal(true)}
                  disabled={sending || loading}
                  title="Propose service date and time"
                  className="shrink-0 rounded-full h-10 w-10 border-border hover:border-accent text-muted-foreground hover:text-accent"
                >
                  <CalendarIcon className="h-4 w-4" />
                </Button>
              )}

              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={selectedFile ? "Add an optional caption..." : "Type your message..."}
                className="flex-1 bg-muted/50 border-transparent focus-visible:ring-accent text-sm"
                disabled={sending || loading}
              />

              <Button
                type="submit"
                size="icon"
                variant="accent"
                disabled={(!newMessage.trim() && !selectedFile) || sending || loading}
                className="shrink-0 rounded-full h-10 w-10"
              >
                {sending || uploadingImage ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lightbox / Zoom Image Modal */}
      {lightboxImage && (
        <Dialog open={!!lightboxImage} onOpenChange={() => setLightboxImage(null)}>
          <DialogContent className="max-w-4xl p-2 bg-black/90 border-transparent overflow-hidden flex items-center justify-center">
            <div className="relative max-h-[85vh] w-full flex items-center justify-center">
              <img
                src={lightboxImage}
                alt="Enlarged preview"
                className="max-h-[80vh] max-w-full object-contain rounded"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Appointment Proposal Modal (For User) */}
      <Dialog open={showProposalModal} onOpenChange={setShowProposalModal}>
        <DialogContent className="sm:max-w-md bg-background border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <CalendarIcon className="w-5 h-5 text-accent" />
              Propose Service Date & Time
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Start Date / Preferred Day</Label>
                <Input
                  type="date"
                  value={proposalStartDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setProposalStartDate(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">End Date (Optional Range)</Label>
                <Input
                  type="date"
                  value={proposalEndDate}
                  min={proposalStartDate || new Date().toISOString().split('T')[0]}
                  onChange={(e) => setProposalEndDate(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Preferred Time Window</Label>
              {!isCustomTime ? (
                <div className="space-y-2">
                  <select
                    value={proposalTimeSlot}
                    onChange={(e) => setProposalTimeSlot(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    {COMMON_TIME_SLOTS.map((slot) => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setIsCustomTime(true)}
                    className="text-[11px] text-accent hover:underline flex items-center gap-1"
                  >
                    + Enter custom time range
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    placeholder="e.g. 10:00 AM - 01:00 PM"
                    value={customTimeSlot}
                    onChange={(e) => setCustomTimeSlot(e.target.value)}
                    className="text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setIsCustomTime(false)}
                    className="text-[11px] text-muted-foreground hover:underline"
                  >
                    ← Choose from standard windows
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Note / Availability Details (Optional)</Label>
              <Input
                placeholder="e.g. Factory open between 9 AM and 5 PM"
                value={proposalNote}
                onChange={(e) => setProposalNote(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setShowProposalModal(false)}>
              Cancel
            </Button>
            <Button
              variant="accent"
              size="sm"
              onClick={handleSendProposal}
              disabled={sending || !proposalStartDate}
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />}
              Send Proposal
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Company Confirmation Modal (For Technician / Company) */}
      <Dialog open={!!approvingProposal} onOpenChange={(open) => !open && setApprovingProposal(null)}>
        <DialogContent className="sm:max-w-md bg-background border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <CheckCircle2 className="w-5 h-5 text-accent" />
              Confirm Service Appointment
            </DialogTitle>
          </DialogHeader>

          {approvingProposal && (
            <div className="space-y-4 py-2">
              <div className="p-3 rounded-lg bg-muted/40 border border-border text-xs space-y-1">
                <p className="font-semibold text-foreground">Requested Window by Client:</p>
                <p className="text-muted-foreground">
                  Date(s): {approvingProposal.startDate} {approvingProposal.endDate ? `to ${approvingProposal.endDate}` : ''}
                </p>
                <p className="text-muted-foreground">Time: {approvingProposal.timeRange}</p>
                {approvingProposal.note && <p className="text-muted-foreground italic">Note: {approvingProposal.note}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Select Confirmed Appointment Date</Label>
                <Input
                  type="date"
                  value={confirmingDate}
                  min={approvingProposal.startDate}
                  max={approvingProposal.endDate || approvingProposal.startDate}
                  onChange={(e) => setConfirmingDate(e.target.value)}
                  className="text-xs"
                />
                <p className="text-[10px] text-muted-foreground">
                  Pick the specific date comfortable for your service team within the requested range.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Confirmed Time Slot</Label>
                <Input
                  value={confirmingTime}
                  onChange={(e) => setConfirmingTime(e.target.value)}
                  placeholder="e.g. 09:00 AM - 12:00 PM"
                  className="text-xs"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setApprovingProposal(null)}>
              Cancel
            </Button>
            <Button
              variant="accent"
              size="sm"
              onClick={handleConfirmApproval}
              disabled={isSubmittingApproval || !confirmingDate}
              className="font-bold gap-1.5"
            >
              {isSubmittingApproval ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Confirm & Add to Calendar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
