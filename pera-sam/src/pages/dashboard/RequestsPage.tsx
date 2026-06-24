import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  User,
  ChevronRight,
  Waves,
  MapPin,
  Loader2,
  Image as ImageIcon,
  Phone,
  FileText,
  Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

interface RepairRequest {
  id: string;
  user_id: string;
  company_id: string;
  machine_type: string;
  brand: string;
  status: 'pending' | 'accepted' | 'completed' | 'declined';
  description: string;
  analysis_id: string | null;
  photo_urls?: string[];
  created_at: string;
  profiles: {
    name: string;
    phone: string;
  };
}

/** Parse the multi-line description into labelled key-value pairs */
const parseDescription = (desc: string): Record<string, string> => {
  const result: Record<string, string> = {};
  if (!desc) return result;
  desc.split('\n').forEach(line => {
    const colonIdx = line.indexOf(':');
    if (colonIdx > -1) {
      const key = line.slice(0, colonIdx).trim();
      const val = line.slice(colonIdx + 1).trim();
      if (key && val) result[key] = val;
    }
  });
  return result;
};

/** Extract photo URLs embedded in description as a fallback */
const extractPhotosFromDescription = (desc: string): string[] => {
  const match = desc?.match(/Photos:\s*(.+)/);
  if (!match) return [];
  return match[1].split(',').map(u => u.trim()).filter(u => u.startsWith('http'));
};

export const RequestsPage = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<RepairRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);

  const fetchRequests = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('repair_requests')
        .select(`
          *,
          profiles:user_id (
            name,
            phone
          )
        `)
        .eq('company_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data as any[] || []);
    } catch (err) {
      console.error('Error fetching requests:', err);
      toast.error('Failed to load repair requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [user]);

  const updateRequestStatus = async (requestId: string, newStatus: string) => {
    try {
      const { error } = await (supabase as any)
        .from('repair_requests')
        .update({ status: newStatus })
        .eq('id', requestId);

      if (error) throw error;
      toast.success(`Request marked as ${newStatus}`);
      fetchRequests();
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error('Failed to update request status');
    }
  };

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

  // Dynamic stats calculation
  const stats = [
    { label: 'Pending', value: requests.filter(r => r.status === 'pending').length.toString(), color: 'text-warning' },
    { label: 'In Progress', value: requests.filter(r => r.status === 'accepted').length.toString(), color: 'text-info' },
    { label: 'Completed', value: requests.filter(r => r.status === 'completed').length.toString(), color: 'text-success' },
    {
      label: 'This Week',
      value: requests.filter(r => {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        return new Date(r.created_at) > oneWeekAgo;
      }).length.toString(),
      color: 'text-foreground'
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-12 w-12 text-accent animate-spin" />
      </div>
    );
  }

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
        {stats.map((stat, i) => (
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
        {requests.map((request, index) => (
          <motion.div
            key={request.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`glass-card rounded-xl p-5 cursor-pointer transition-all hover:shadow-card-hover ${selectedRequest === request.id ? 'ring-2 ring-accent' : ''
              }`}
            onClick={() => setSelectedRequest(selectedRequest === request.id ? null : request.id)}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                <User className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-foreground">{request.profiles?.name || 'Unknown User'}</h3>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(request.status)}`}>
                    {getStatusIcon(request.status)}
                    {request.status}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {request.machine_type} {request.brand ? `• ${request.brand}` : ''}
                </p>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                  {request.description}
                </p>
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  {request.analysis_id && <span>Analysis: {request.analysis_id.slice(0, 8)}</span>}
                  <span>{new Date(request.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform ${selectedRequest === request.id ? 'rotate-90' : ''
                }`} />
            </div>

            {selectedRequest === request.id && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4 pt-4 border-t border-border"
              >
                {(() => {
                  const parsed = parseDescription(request.description);
                  const photoUrls: string[] = (request as any).photo_urls?.length
                    ? (request as any).photo_urls
                    : extractPhotosFromDescription(request.description);
                  const detailKeys = Object.entries(parsed).filter(
                    ([k]) => !['Issue', 'Customer Address', 'Customer Phone', 'Photos'].includes(k)
                  );
                  return (
                    <div className="space-y-4">
                      {/* Issue + Contact */}
                      <div className="grid md:grid-cols-2 gap-3">
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                            <FileText className="h-3 w-3" /> Issue Description
                          </p>
                          <p className="text-sm text-foreground">
                            {parsed['Issue'] || request.description.split('\n')[0] || 'No description'}
                          </p>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                            <Phone className="h-3 w-3" /> Contact
                          </p>
                          <p className="text-sm font-bold text-accent">
                            {parsed['Customer Phone'] || request.profiles?.phone || 'Not provided'}
                          </p>
                          {parsed['Customer Address'] && (
                            <p className="text-xs text-muted-foreground mt-1 flex items-start gap-1">
                              <MapPin className="h-3 w-3 shrink-0 mt-0.5" />
                              {parsed['Customer Address']}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Equipment Details */}
                      {detailKeys.length > 0 && (
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                            <Tag className="h-3 w-3" /> Equipment Details
                          </p>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                            {detailKeys.map(([k, v]) => (
                              <div key={k}>
                                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{k}</span>
                                <p className="text-xs font-medium text-foreground">{v}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Photo thumbnails */}
                      {photoUrls.length > 0 && (
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                            <ImageIcon className="h-3 w-3" /> Attached Photos ({photoUrls.length})
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {photoUrls.map((url, idx) => (
                              <a
                                key={idx}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-16 h-16 rounded-lg overflow-hidden border border-border hover:border-accent transition-colors"
                              >
                                <img
                                  src={url}
                                  alt={`Photo ${idx + 1}`}
                                  className="w-full h-full object-cover"
                                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Action buttons */}
                      {request.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            variant="accent"
                            className="flex-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateRequestStatus(request.id, 'accepted');
                            }}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Accept Request
                          </Button>
                          <Button variant="outline" className="flex-1">
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Message User
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateRequestStatus(request.id, 'declined');
                            }}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      {request.status === 'accepted' && (
                        <div className="flex gap-2">
                          <Button
                            variant="accent"
                            className="flex-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateRequestStatus(request.id, 'completed');
                            }}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Mark Complete
                          </Button>
                          <Button variant="outline" className="flex-1">
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Chat
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>

      {requests.length === 0 && (
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
