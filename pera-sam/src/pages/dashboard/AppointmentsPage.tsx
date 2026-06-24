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
  Waves
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

interface Appointment {
  id: string;
  user_id: string;
  company_id: string;
  machine_type: string;
  brand: string;
  status: 'pending' | 'accepted' | 'completed' | 'declined';
  description: string;
  created_at: string;
  user_profile?: {
    name: string;
    phone: string;
    address: string;
  };
  company_profile?: {
    company_name: string;
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

  const fetchAppointments = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const isCompany = user.role === 'company';

      let query = (supabase as any).from('repair_requests').select(`
        *,
        user_profile:user_id (
          name,
          phone,
          address
        ),
        company_profile:company_id (
          company_name,
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
  }, [user]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'bg-success/10 text-success border-success/20';
      case 'pending': return 'bg-warning/10 text-warning border-warning/20';
      case 'declined': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'completed': return 'bg-info/10 text-info border-info/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // Filter by selected date
  const filteredAppointments = appointments.filter(app => {
    if (!selectedDate) return true;
    const appDate = new Date(app.created_at);
    return (
      appDate.getDate() === selectedDate.getDate() &&
      appDate.getMonth() === selectedDate.getMonth() &&
      appDate.getFullYear() === selectedDate.getFullYear()
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-12 w-12 text-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Appointments</h1>
          <p className="text-muted-foreground mt-1">
            {user?.role === 'company'
              ? 'Manage your scheduled service appointments'
              : 'Track your repair requests and appointments'}
          </p>
        </div>
        {!loading && appointments.length > 0 && (
          <Button variant="accent">
            <Plus className="h-4 w-4 mr-2" />
            New Appointment
          </Button>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-xl p-4"
        >
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className="rounded-md"
          />
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium text-foreground">
              {selectedDate?.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredAppointments.length} events scheduled
            </p>
          </div>
        </motion.div>

        {/* Appointments List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-4 mb-4">
            <p className="text-sm text-muted-foreground">
              Showing {filteredAppointments.length} entries for this date
            </p>
          </div>

          {filteredAppointments.map((appointment, index) => (
            <motion.div
              key={appointment.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`glass-card rounded-xl p-5 cursor-pointer transition-all hover:shadow-card-hover ${selectedAppointment === appointment.id ? 'ring-2 ring-accent' : ''
                }`}
              onClick={() => setSelectedAppointment(
                selectedAppointment === appointment.id ? null : appointment.id
              )}
            >
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-accent/10 rounded-xl flex flex-col items-center justify-center flex-shrink-0">
                  <span className="text-xs text-muted-foreground uppercase">
                    {new Date(appointment.created_at).toLocaleDateString('en-US', { month: 'short' })}
                  </span>
                  <span className="text-lg font-bold text-accent">
                    {new Date(appointment.created_at).getDate()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-foreground">{appointment.machine_type}</h3>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(appointment.status)}`}>
                      {appointment.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {new Date(appointment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5" />
                      {user?.role === 'company'
                        ? appointment.user_profile?.name
                        : appointment.company_profile?.company_name}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">
                      {user?.role === 'company'
                        ? appointment.user_profile?.address
                        : appointment.company_profile?.address}
                    </span>
                  </p>
                </div>
                <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform flex-shrink-0 ${selectedAppointment === appointment.id ? 'rotate-90' : ''
                  }`} />
              </div>

              {selectedAppointment === appointment.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 pt-4 border-t border-border"
                >
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Mobile Contact</p>
                      <p className="text-sm font-bold text-accent flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        {user?.role === 'company'
                          ? appointment.user_profile?.phone
                          : appointment.company_profile?.phone}
                      </p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Description</p>
                      <p className="text-sm text-foreground">{appointment.description}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}

          {filteredAppointments.length === 0 && appointments.length > 0 && (
            <div className="glass-card rounded-xl p-8 text-center bg-muted/20 border-dashed">
              <p className="text-muted-foreground">No appointments for this specific date</p>
            </div>
          )}

          {appointments.length === 0 && (
            <div className="glass-card rounded-xl p-12 text-center">
              <Waves className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">No appointments or requests found</p>
              {user?.role === 'normal' && (
                <Button variant="accent" className="mt-4" onClick={() => window.location.href = '/dashboard/map'}>
                  <Plus className="h-4 w-4 mr-2" />
                  Request First Service
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

