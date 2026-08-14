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
  Building2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { RequestChatDialog } from '@/components/RequestChatDialog';
import { ReportGeneratorModal } from '@/components/ReportGeneratorModal';

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
    avatar_url?: string;
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
  const [filter, setFilter] = useState<string | null>(null);
  const [chatRequestId, setChatRequestId] = useState<string | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [reportRequest, setReportRequest] = useState<RepairRequest | null>(null);

  const isCompany = user?.role === 'company';

  const fetchRequests = async () => {
    if (!user) return;
    try {
      setLoading(true);

      // Step 1: fetch the repair requests
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: requestData, error: requestError } = await (supabase as any)
        .from('repair_requests')
        .select('*')
        .eq(isCompany ? 'company_id' : 'user_id', user.id)
        .order('created_at', { ascending: false });

      console.log('[RequestsPage] Step1 requestData:', requestData, 'error:', requestError);

      if (requestError) throw requestError;
      if (!requestData || requestData.length === 0) {
        setRequests([]);
        return;
      }

      // Step 2: collect the IDs of the other party
      const otherPartyIds: string[] = [
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...new Set((requestData as any[]).map((r: any) => isCompany ? r.user_id : r.company_id).filter(Boolean))
      ];
      console.log('[RequestsPage] Step2 otherPartyIds:', otherPartyIds);

      // Step 3: batch-fetch their profiles (name, phone, avatar_url) — bypasses RLS via SECURITY DEFINER RPC
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let profileMap: Record<string, { name: string; phone: string | null; avatar_url: string | null }> = {};
      if (otherPartyIds.length > 0) {
        // Try via SECURITY DEFINER RPC first (guaranteed to bypass RLS)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: rpcData, error: rpcError } = await (supabase as any)
          .rpc('get_profiles_for_requests', { user_ids: otherPartyIds });

        console.log('[RequestsPage] Step3 RPC profileData:', rpcData, 'error:', rpcError);

        if (!rpcError && rpcData && (rpcData as any[]).length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (rpcData as any[]).forEach((p: any) => {
            profileMap[p.id] = { name: p.name, phone: p.phone, avatar_url: p.avatar_url };
          });
        } else {
          // Fallback: direct query (works if RLS "Authenticated users can view all profiles" is active)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: profileData, error: profileError } = await (supabase as any)
            .from('profiles')
            .select('id, name, phone, avatar_url')
            .in('id', otherPartyIds);

          console.log('[RequestsPage] Step3 direct profileData:', profileData, 'error:', profileError);

          if (profileData) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (profileData as any[]).forEach((p: any) => {
              profileMap[p.id] = { name: p.name, phone: p.phone, avatar_url: p.avatar_url };
            });
          }
        }
      }

      console.log('[RequestsPage] Step3 profileMap:', profileMap);

      // Step 4: merge profile data into each request
      // If profile fetch failed (e.g. RLS), extract name from the description as last resort fallback
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const merged = (requestData as any[]).map((r: any) => {
        const profileId = isCompany ? r.user_id : r.company_id;
        const profile = profileMap[profileId] || null;

        // Last-resort: parse "Customer Name: ..." from description if profiles couldn't be loaded
        let fallbackName: string | null = null;
        if (!profile?.name && r.description) {
          const nameMatch = (r.description as string).match(/Customer Name:\s*(.+)/);
          if (nameMatch) fallbackName = nameMatch[1].trim();
        }

        return {
          ...r,
          profiles: profile
            ? profile
            : fallbackName
            ? { name: fallbackName, phone: null, avatar_url: null }
            : null,
        };
      });

      console.log('[RequestsPage] Step4 merged:', merged);

      setRequests(merged as RepairRequest[]);
    } catch (err) {
      console.error('Error fetching requests:', err);
      toast.error('Failed to load repair requests');
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCounts = async () => {
    if (!user) return;
    try {
      // Fetch all unread messages meant for this user across all their requests
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('request_messages')
        .select('request_id')
        .eq('is_read', false)
        .neq('sender_id', user.id);

      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data?.forEach((msg: any) => {
        counts[msg.request_id] = (counts[msg.request_id] || 0) + 1;
      });
      setUnreadCounts(counts);
    } catch (err) {
      console.error('Error fetching unread counts:', err);
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchUnreadCounts();
    
    if (!user) return;

    // Subscribe to realtime updates for this user's/company's requests
    const channel = supabase
      .channel('requests-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'repair_requests',
          filter: `${isCompany ? 'company_id' : 'user_id'}=eq.${user.id}`,
        },
        (payload) => {
          fetchRequests();
          if (payload.eventType === 'INSERT') {
            toast.info(isCompany ? 'You have a new repair request!' : 'Your repair request was submitted successfully.');
          } else if (payload.eventType === 'UPDATE') {
            toast.info('A repair request was updated.');
          }
        }
      )
      .subscribe();

    // Subscribe to realtime updates for unread messages
    const msgChannel = supabase
      .channel('unread-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'request_messages',
        },
        () => {
          // Re-fetch unread counts whenever messages change (inserted/updated)
          fetchUnreadCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(msgChannel);
    };
  }, [user, isCompany]); // Removed fetchRequests from dependency array to avoid infinite loop

  const updateRequestStatus = async (requestId: string, newStatus: string) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    { id: 'pending', label: 'Pending', value: requests.filter(r => r.status === 'pending').length.toString(), color: 'text-warning' },
    { id: 'accepted', label: 'In Progress', value: requests.filter(r => r.status === 'accepted').length.toString(), color: 'text-info' },
    { id: 'completed', label: 'Completed', value: requests.filter(r => r.status === 'completed').length.toString(), color: 'text-success' },
    {
      id: 'this_week',
      label: 'This Week',
      value: requests.filter(r => {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        return new Date(r.created_at) > oneWeekAgo;
      }).length.toString(),
      color: 'text-foreground'
    },
  ];

  const filteredRequests = requests.filter(r => {
    if (!filter) return true;
    if (filter === 'this_week') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      return new Date(r.created_at) > oneWeekAgo;
    }
    return r.status === filter;
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
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {isCompany ? 'Repair Requests' : 'My Requests'}
        </h1>
        <p className="text-muted-foreground mt-1">
          {isCompany ? 'Manage incoming service requests from users' : 'Track the status of your repair requests'}
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
            className={`glass-card rounded-xl p-4 cursor-pointer hover:shadow-card-hover transition-all ${filter === stat.id ? 'ring-2 ring-accent bg-accent/5' : ''
              }`}
            onClick={() => setFilter(filter === stat.id ? null : stat.id)}
          >
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {filteredRequests.map((request, index) => (
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
              <div className="w-12 h-12 bg-muted rounded-full overflow-hidden flex items-center justify-center flex-shrink-0">
                {request.profiles?.avatar_url ? (
                  <img src={request.profiles.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : isCompany ? (
                  <User className="h-6 w-6 text-muted-foreground" />
                ) : (
                  <Building2 className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-foreground">
                    {request.profiles?.name || (isCompany ? 'Unknown User' : 'Unknown Company')}
                  </h3>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(request.status)}`}>
                    {getStatusIcon(request.status)}
                    {request.status}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {request.machine_type} {request.brand ? `• ${request.brand}` : ''}
                </p>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                  {parseDescription(request.description)['Issue'] || (request.description?.includes(':') ? 'Tap to view details' : request.description || 'No description')}
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
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const photoUrls: string[] = (request as any).photo_urls?.length
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
                            {parsed['Issue'] || (request.description && !request.description.includes(':') ? request.description : 'No additional issue description provided.')}
                          </p>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                            <Phone className="h-3 w-3" /> Contact
                          </p>
                          <p className="text-sm font-bold text-accent">
                            {parsed['Customer Phone'] || request.profiles?.phone || 'Not provided'}
                          </p>
                          {isCompany && parsed['Customer Address'] && (
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
                      {isCompany && request.status === 'pending' && (
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
                          <Button 
                            variant="outline" 
                            className="flex-1 relative"
                            onClick={(e) => {
                              e.stopPropagation();
                              setChatRequestId(request.id);
                            }}
                          >
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Message User
                            {unreadCounts[request.id] > 0 && (
                              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
                              </span>
                            )}
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
                      {isCompany && request.status === 'accepted' && (
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
                          <Button 
                            variant="outline" 
                            className="flex-1 relative"
                            onClick={(e) => {
                              e.stopPropagation();
                              setChatRequestId(request.id);
                            }}
                          >
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Chat
                            {unreadCounts[request.id] > 0 && (
                              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
                              </span>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={(e) => { e.stopPropagation(); setReportRequest(request); }}
                            title="Generate Service Report"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      {isCompany && request.status === 'completed' && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            className="flex-1 gap-2"
                            onClick={(e) => { e.stopPropagation(); setReportRequest(request); }}
                          >
                            <FileText className="h-4 w-4" />
                            Generate Report
                          </Button>
                        </div>
                      )}
                      {!isCompany && (
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            className="flex-1 relative"
                            onClick={(e) => {
                              e.stopPropagation();
                              setChatRequestId(request.id);
                            }}
                          >
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Message Company
                            {unreadCounts[request.id] > 0 && (
                              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
                              </span>
                            )}
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

      {filteredRequests.length === 0 && (
        <div className="glass-card rounded-xl p-12 text-center">
          <Waves className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">No repair requests found</p>
          <p className="text-sm text-muted-foreground mt-1">
            {filter ? `No requests match the "${stats.find(s => s.id === filter)?.label}" filter.` : 'Requests from users will appear here'}
          </p>
        </div>
      )}

      {chatRequestId && (
        <RequestChatDialog
          isOpen={!!chatRequestId}
          onClose={() => setChatRequestId(null)}
          requestId={chatRequestId}
          isCompany={isCompany}
          otherPartyName={
            requests.find(r => r.id === chatRequestId)?.profiles?.name || (isCompany ? 'User' : 'Company')
          }
        />
      )}

      {reportRequest && (
        <ReportGeneratorModal
          onClose={() => setReportRequest(null)}
          companyName={user?.companyName || user?.name || 'Service Company'}
          companyAddress={user?.address || ''}
          customerName={reportRequest.profiles?.name || parseDescription(reportRequest.description)['Customer Name'] || ''}
          customerPhone={reportRequest.profiles?.phone || parseDescription(reportRequest.description)['Customer Phone'] || ''}
          machineType={reportRequest.machine_type}
          brand={reportRequest.brand}
          issueDescription={parseDescription(reportRequest.description)['Issue'] || reportRequest.description || ''}
        />
      )}
    </div>
  );
};
