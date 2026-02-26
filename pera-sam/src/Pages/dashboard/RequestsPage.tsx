import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  MessageSquare, 
  Clock,
  CheckCircle,
  XCircle,
  User,
  ChevronRight,
  Waves,
  MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// Demo repair requests
const demoRequests = [
  {
    id: '1',
    userName: 'John Smith',
    userEmail: 'john@example.com',
    machineType: 'Laptop Fan',
    brand: 'Dell XPS 15',
    status: 'pending',
    description: 'Loud rattling noise coming from the laptop fan during high load operations.',
    analysisId: 'AN-001',
    createdAt: '2024-01-15T10:30:00',
    confidence: 87.2,
  },
  {
    id: '2',
    userName: 'Sarah Johnson',
    userEmail: 'sarah@example.com',
    machineType: 'Vehicle Engine',
    brand: 'Toyota Camry',
    status: 'accepted',
    description: 'Engine making unusual ticking sound when cold starting.',
    analysisId: 'AN-002',
    createdAt: '2024-01-14T14:15:00',
    confidence: 92.5,
  },
  {
    id: '3',
    userName: 'Mike Wilson',
    userEmail: 'mike@example.com',
    machineType: 'Server Fan',
    brand: 'HP ProLiant',
    status: 'completed',
    description: 'Server fan vibration detected during peak hours.',
    analysisId: 'AN-003',
    createdAt: '2024-01-13T09:00:00',
    confidence: 78.9,
  },
];

export const RequestsPage = () => {
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-warning/10 text-warning border-warning/20';
      case 'accepted': return 'bg-info/10 text-info border-info/20';
      case 'completed': return 'bg-success/10 text-success border-success/20';
      case 'declined': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'accepted': return <CheckCircle className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'declined': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Repair Requests</h1>
        <p className="text-muted-foreground mt-1">
          Manage incoming service requests from users
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Pending', value: '3', color: 'text-warning' },
          { label: 'In Progress', value: '2', color: 'text-info' },
          { label: 'Completed', value: '15', color: 'text-success' },
          { label: 'This Week', value: '8', color: 'text-foreground' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card rounded-xl p-4"
          >
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {demoRequests.map((request, index) => (
          <motion.div
            key={request.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`glass-card rounded-xl p-5 cursor-pointer transition-all hover:shadow-card-hover ${
              selectedRequest === request.id ? 'ring-2 ring-accent' : ''
            }`}
            onClick={() => setSelectedRequest(selectedRequest === request.id ? null : request.id)}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                <User className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-foreground">{request.userName}</h3>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(request.status)}`}>
                    {getStatusIcon(request.status)}
                    {request.status}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {request.machineType} • {request.brand}
                </p>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                  {request.description}
                </p>
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span>Analysis: {request.analysisId}</span>
                  <span>Confidence: {request.confidence}%</span>
                  <span>{new Date(request.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform ${
                selectedRequest === request.id ? 'rotate-90' : ''
              }`} />
            </div>

            {selectedRequest === request.id && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4 pt-4 border-t border-border"
              >
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Full Description</p>
                    <p className="text-sm text-foreground">{request.description}</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Contact</p>
                    <p className="text-sm text-foreground">{request.userEmail}</p>
                  </div>
                </div>
                {request.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button variant="accent" className="flex-1">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Accept Request
                    </Button>
                    <Button variant="outline" className="flex-1">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Message User
                    </Button>
                    <Button variant="ghost">
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                {request.status === 'accepted' && (
                  <div className="flex gap-2">
                    <Button variant="accent" className="flex-1">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark Complete
                    </Button>
                    <Button variant="outline" className="flex-1">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Chat
                    </Button>
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>

      {demoRequests.length === 0 && (
        <div className="glass-card rounded-xl p-12 text-center">
          <Waves className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">No repair requests yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Requests from users will appear here
          </p>
        </div>
      )}
    </div>
  );
};
