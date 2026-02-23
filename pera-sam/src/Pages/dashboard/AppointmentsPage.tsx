import { useState } from 'react';
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
  XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';

// Demo appointments
const demoAppointments = [
  {
    id: '1',
    userName: 'John Smith',
    userPhone: '+1 555-0123',
    serviceType: 'Laptop Fan Repair',
    date: '2024-01-20',
    time: '10:00 AM',
    status: 'confirmed',
    address: '123 Tech Street, San Francisco, CA',
    notes: 'Dell XPS 15 - Fan making loud noise',
  },
  {
    id: '2',
    userName: 'Sarah Johnson',
    userPhone: '+1 555-0456',
    serviceType: 'Vehicle Engine Diagnostics',
    date: '2024-01-20',
    time: '2:00 PM',
    status: 'pending',
    address: '456 Motor Ave, San Francisco, CA',
    notes: 'Toyota Camry 2020 - Engine ticking',
  },
  {
    id: '3',
    userName: 'Mike Wilson',
    userPhone: '+1 555-0789',
    serviceType: 'Server Maintenance',
    date: '2024-01-22',
    time: '9:00 AM',
    status: 'confirmed',
    address: '789 Data Center Blvd, Oakland, CA',
    notes: 'HP ProLiant server rack inspection',
  },
];

export const AppointmentsPage = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedAppointment, setSelectedAppointment] = useState<string | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-success/10 text-success border-success/20';
      case 'pending': return 'bg-warning/10 text-warning border-warning/20';
      case 'cancelled': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Appointments</h1>
          <p className="text-muted-foreground mt-1">
            Manage your scheduled service appointments
          </p>
        </div>
        <Button variant="accent">
          <Plus className="h-4 w-4 mr-2" />
          New Appointment
        </Button>
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
              2 appointments scheduled
            </p>
          </div>
        </motion.div>

        {/* Appointments List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-4 mb-4">
            <p className="text-sm text-muted-foreground">
              Showing {demoAppointments.length} appointments
            </p>
          </div>

          {demoAppointments.map((appointment, index) => (
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
                <div className="w-14 h-14 bg-accent/10 rounded-xl flex flex-col items-center justify-center flex-shrink-0">
                  <span className="text-xs text-muted-foreground">
                    {new Date(appointment.date).toLocaleDateString('en-US', { month: 'short' })}
                  </span>
                  <span className="text-lg font-bold text-accent">
                    {new Date(appointment.date).getDate()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-foreground">{appointment.serviceType}</h3>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(appointment.status)}`}>
                      {appointment.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {appointment.time}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5" />
                      {appointment.userName}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{appointment.address}</span>
                  </p>
                </div>
                <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform flex-shrink-0 ${
                  selectedAppointment === appointment.id ? 'rotate-90' : ''
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
                      <p className="text-xs text-muted-foreground mb-1">Contact</p>
                      <p className="text-sm text-foreground flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        {appointment.userPhone}
                      </p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Notes</p>
                      <p className="text-sm text-foreground">{appointment.notes}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {appointment.status === 'pending' && (
                      <>
                        <Button variant="accent" className="flex-1">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Confirm
                        </Button>
                        <Button variant="outline" className="flex-1">
                          Reschedule
                        </Button>
                        <Button variant="ghost">
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {appointment.status === 'confirmed' && (
                      <>
                        <Button variant="accent" className="flex-1">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Start Service
                        </Button>
                        <Button variant="outline" className="flex-1">
                          <Phone className="h-4 w-4 mr-2" />
                          Call Client
                        </Button>
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}

          {demoAppointments.length === 0 && (
            <div className="glass-card rounded-xl p-12 text-center">
              <CalendarIcon className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">No appointments scheduled</p>
              <Button variant="accent" className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Schedule Appointment
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
