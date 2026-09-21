import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  MapPin,
  Phone,
  ChevronRight,
  Plus,
  CheckCircle,
  XCircle,
  Loader2,
  Waves,
  MessageSquare,
  Sparkles,
  Building2,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { RequestChatDialog } from '@/components/RequestChatDialog';
import { getScheduledInfo } from '@/lib/appointment-utils';

interface Appointment {
  id: string;
  user_id: string;
  company_id: string;
  machine_type: string;
  brand: string;
  status: 'pending' | 'accepted' | 'completed' | 'declined';
  description: string;
  created_at: string;
  scheduled_date?: string | null;
  scheduled_time_slot?: string | null;
  user_profile?: {
    name: string;
    phone: string;
    address: string;
  };
  company_profile?: {
    company_name: string;
    name?: string;
    phone: string;
    address: string;
  };
}

export const AppointmentsPage = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedAppointment, setSelectedAppointment] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatRequestId, setChatRequestId] = useState<string | null>(null);
  const [chatOtherName, setChatOtherName] = useState<string>('');

  const isCompany = user?.role === 'company';

  const fetchAppointments = async () => {
    if (!user) return;
    try {
      setLoading(true);

      let query = (supabase as any).from('repair_requests').select(`
        *,
        user_profile:user_id (
          name,
          phone,
          address
        ),
        company_profile:company_id (
          company_name,
          name,
          phone,
          address
        )
      `);

      if (isCompany) {
        query = query.eq('company_id', user.id);
      } else {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setAppointments(data || []);
    } catch (err) {
      console.error('Error fetching appointments:', err);
      toast.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();

    if (!user) return;

    // Listen for realtime updates to appointments & requests
    const channel = supabase
      .channel('appointments-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'repair_requests',
          filter: `${isCompany ? 'company_id' : 'user_id'}=eq.${user.id}`,
        },
        () => {
          fetchAppointments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isCompany]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'bg-success/10 text-success border-success/20';
      case 'pending': return 'bg-warning/10 text-warning border-warning/20';
      case 'declined': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'completed': return 'bg-info/10 text-info border-info/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // Collect all dates that have scheduled appointments or created requests
  const datesWithAppointments = appointments
    .map(app => {
      const info = getScheduledInfo(app);
      return info.date;
    })
    .filter((d): d is Date => d !== null);

  // Filter appointments for the selected calendar date
  const filteredAppointments = appointments.filter(app => {
    if (!selectedDate) return true;
    const info = getScheduledInfo(app);
    if (!info.date) return false;
    return (
      info.date.getDate() === selectedDate.getDate() &&
      info.date.getMonth() === selectedDate.getMonth() &&
      info.date.getFullYear() === selectedDate.getFullYear()
    );
  });

  const handleOpenChat = (app: Appointment, e: React.MouseEvent) => {
    e.stopPropagation();
    const otherName = isCompany
      ? app.user_profile?.name || 'Customer'
      : app.company_profile?.company_name || app.company_profile?.name || 'Service Provider';
    setChatRequestId(app.id);
    setChatOtherName(otherName);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-2">
        <Loader2 className="h-10 w-10 text-accent animate-spin" />
        <p className="text-sm text-muted-foreground">Loading appointments & schedules...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Appointments & Schedules</h1>
          <p className="text-muted-foreground mt-1">
            {isCompany
              ? 'Manage confirmed repair appointments and technician schedules'
              : 'Track your confirmed service dates, technician schedules, and requests'}
          </p>
        </div>
        {!loading && appointments.length > 0 && !isCompany && (
          <Button variant="accent" onClick={() => window.location.href = '/dashboard/map'}>
            <Plus className="h-4 w-4 mr-2" />
            Find More Services
          </Button>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-xl p-4 flex flex-col gap-3"
        >
          <div className="flex items-center justify-between pb-2 border-b border-border/40">
            <h2 className="font-bold text-sm text-foreground flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-accent" />
              Service Calendar
            </h2>
            <span className="text-[11px] text-muted-foreground">
              {appointments.length} total entries
            </span>
          </div>

          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            modifiers={{
              hasAppointment: datesWithAppointments,
            }}
            modifiersClassNames={{
              hasAppointment: 'font-bold text-accent underline decoration-accent decoration-2',
            }}
            className="rounded-md mx-auto"
          />

          <div className="p-3 bg-muted/40 rounded-lg border border-border/40">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">
                {selectedDate?.toLocaleDateString('en-US', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </p>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                filteredAppointments.length > 0 ? 'bg-accent/15 text-accent' : 'bg-muted text-muted-foreground'
              }`}>
                {filteredAppointments.length} scheduled
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredAppointments.length > 0
                ? 'Dates underlined in accent have scheduled service appointments.'
                : 'No appointments scheduled on this selected date.'}
            </p>
          </div>
        </motion.div>

        {/* Appointments List for Selected Date */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-muted-foreground">
              Showing {filteredAppointments.length} appointment{filteredAppointments.length === 1 ? '' : 's'} for {selectedDate?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </p>
            {appointments.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 text-accent"
                onClick={() => setSelectedDate(undefined)}
              >
                Show all appointments
              </Button>
            )}
          </div>

          {filteredAppointments.map((appointment, index) => {
            const scheduledInfo = getScheduledInfo(appointment);
            const otherName = isCompany
              ? appointment.user_profile?.name || 'Customer'
              : appointment.company_profile?.company_name || appointment.company_profile?.name || 'Service Provider';
            const otherPhone = isCompany
              ? appointment.user_profile?.phone
              : appointment.company_profile?.phone;
            const otherAddress = isCompany
              ? appointment.user_profile?.address
              : appointment.company_profile?.address;

            return (
              <motion.div
                key={appointment.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`glass-card rounded-xl p-5 cursor-pointer transition-all hover:shadow-card-hover ${
                  selectedAppointment === appointment.id ? 'ring-2 ring-accent' : ''
                }`}
                onClick={() => setSelectedAppointment(
                  selectedAppointment === appointment.id ? null : appointment.id
                )}
              >
                <div className="flex items-start gap-4">
                  {/* Date Badge */}
                  <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${
                    appointment.status === 'accepted' ? 'bg-success/15 text-success' : 'bg-accent/10 text-accent'
                  }`}>
                    <span className="text-[10px] uppercase font-semibold">
                      {scheduledInfo.date
                        ? scheduledInfo.date.toLocaleDateString('en-US', { month: 'short' })
                        : 'N/A'}
                    </span>
                    <span className="text-xl font-bold leading-tight">
                      {scheduledInfo.date ? scheduledInfo.date.getDate() : '--'}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">{appointment.machine_type}</h3>
                        {appointment.brand && (
                          <span className="text-xs text-muted-foreground">({appointment.brand})</span>
                        )}
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusColor(appointment.status)}`}>
                        {appointment.status === 'accepted' && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {appointment.status === 'accepted' ? 'Confirmed Appointment' : appointment.status}
                      </span>
                    </div>

                    {/* Confirmed Schedule Notice */}
                    {scheduledInfo.isExplicit && (
                      <div className="mt-1.5 flex items-center gap-2 text-xs font-semibold text-success bg-success/10 px-2.5 py-1 rounded-md w-fit">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>
                          {isCompany ? 'Scheduled Repair:' : 'Company Approved Date:'}{' '}
                          {scheduledInfo.date?.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                          {scheduledInfo.timeSlot ? ` • ${scheduledInfo.timeSlot}` : ''}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {scheduledInfo.timeSlot || new Date(appointment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="flex items-center gap-1">
                        {isCompany ? <User className="h-3.5 w-3.5" /> : <Building2 className="h-3.5 w-3.5" />}
                        {otherName}
                      </span>
                      {otherAddress && (
                        <span className="flex items-center gap-1 truncate max-w-xs">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{otherAddress}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform flex-shrink-0 ${
                    selectedAppointment === appointment.id ? 'rotate-90' : ''
                  }`} />
                </div>

                {/* Expanded Details */}
                {selectedAppointment === appointment.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-4 pt-4 border-t border-border/50 space-y-3"
                  >
                    <div className="grid md:grid-cols-2 gap-3">
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Mobile Contact</p>
                        <p className="text-sm font-bold text-accent flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          {otherPhone || 'Not provided'}
                        </p>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Appointment Timing</p>
                        <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <Clock className="h-4 w-4 text-accent" />
                          {scheduledInfo.timeSlot || 'Standard working hours'}
                        </p>
                      </div>
                    </div>

                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Issue / Service Details</p>
                      <p className="text-xs text-foreground whitespace-pre-wrap">{appointment.description}</p>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => handleOpenChat(appointment, e)}
                        className="gap-1.5 text-xs"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-accent" />
                        Chat & Coordinate
                      </Button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}

          {filteredAppointments.length === 0 && appointments.length > 0 && (
            <div className="glass-card rounded-xl p-8 text-center bg-muted/20 border-dashed">
              <CalendarIcon className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">No appointments scheduled on this date</p>
              <p className="text-xs text-muted-foreground mt-1">Select an underlined date on the calendar or view all appointments.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 text-xs"
                onClick={() => setSelectedDate(undefined)}
              >
                View All Appointments
              </Button>
            </div>
          )}

          {appointments.length === 0 && (
            <div className="glass-card rounded-xl p-12 text-center">
              <Waves className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground font-semibold">No appointments or service requests yet</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                {isCompany
                  ? 'When users request repairs and propose appointments, approved dates will appear here.'
                  : 'You can browse certified technicians in Find Services, chat, and schedule repairs.'}
              </p>
              {!isCompany && (
                <Button variant="accent" className="mt-4" onClick={() => window.location.href = '/dashboard/map'}>
                  <Plus className="h-4 w-4 mr-2" />
                  Find Service Providers
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Chat Dialog */}
      {chatRequestId && (
        <RequestChatDialog
          isOpen={!!chatRequestId}
          onClose={() => {
            setChatRequestId(null);
            setChatOtherName('');
          }}
          requestId={chatRequestId}
          isCompany={isCompany}
          otherPartyName={chatOtherName}
        />
      )}
    </div>
  );
};
