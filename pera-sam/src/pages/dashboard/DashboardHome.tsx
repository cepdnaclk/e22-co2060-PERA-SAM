import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/integrations/supabase/client';
import {
  Activity,
  FileText,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  Upload,
  ChevronRight,
  Waves,
  User,
  Bell,
  MessageSquare,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { ThemeToggle } from '@/components/ThemeToggle';

interface AnalysisRecord {
  id: string;
  filename: string;
  category: string;
  status: 'normal' | 'warning' | 'abnormal';
  confidence: number;
  created_at: string;
}

interface NotificationItem {
  id: string;
  type: 'message' | 'analysis';
  title: string;
  message: string;
  time: string;
  link: string;
  isRead: boolean;
  created_at: string;
}

export const DashboardHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchUnreadMessages = async (): Promise<NotificationItem[]> => {
    if (!user) return [];
    try {
      const { data, error } = await supabase
        .from('request_messages')
        .select('id, content, created_at, request_id')
        .eq('is_read', false)
        .neq('sender_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map((msg: any) => ({
        id: msg.id,
        type: 'message',
        title: 'New Message',
        message: msg.content.length > 50 ? msg.content.slice(0, 50) + '...' : msg.content,
        time: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        link: `/dashboard/requests`,
        isRead: false,
        created_at: msg.created_at
      }));
    } catch (err) {
      console.error('Error fetching unread messages:', err);
      return [];
    }
  };

  const fetchRecentAnalyses = async (): Promise<NotificationItem[]> => {
    if (!user) return [];
    try {
      const { data, error } = await supabase
        .from('analysis_results' as any)
        .select('id, category, status, created_at, details')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      
      const readAnalysisIds: string[] = JSON.parse(localStorage.getItem(`read_analyses_${user.id}`) || '[]');

      return (data || []).map((item: any) => ({
        id: item.id,
        type: 'analysis',
        title: `Analysis: ${item.status.toUpperCase()}`,
        message: `Machine category: ${item.category}`,
        time: new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        link: `/dashboard/history`,
        isRead: readAnalysisIds.includes(item.id),
        created_at: item.created_at
      }));
    } catch (err) {
      console.error('Error fetching recent analyses:', err);
      return [];
    }
  };

  const loadNotifications = async () => {
    const messages = await fetchUnreadMessages();
    const analyses = await fetchRecentAnalyses();
    const combined = [...messages, ...analyses].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    setNotifications(combined);
  };

  const markAnalysesAsRead = (ids: string[]) => {
    if (!user) return;
    const readAnalysisIds: string[] = JSON.parse(localStorage.getItem(`read_analyses_${user.id}`) || '[]');
    const updated = Array.from(new Set([...readAnalysisIds, ...ids]));
    localStorage.setItem(`read_analyses_${user.id}`, JSON.stringify(updated));
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (notif.type === 'message') {
      await supabase
        .from('request_messages')
        .update({ is_read: true })
        .eq('id', notif.id);
    } else if (notif.type === 'analysis') {
      markAnalysesAsRead([notif.id]);
    }
    
    setDropdownOpen(false);
    loadNotifications();
    navigate(notif.link);
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    
    const unreadMsgIds = notifications.filter(n => n.type === 'message' && !n.isRead).map(n => n.id);
    if (unreadMsgIds.length > 0) {
      await supabase
        .from('request_messages')
        .update({ is_read: true })
        .in('id', unreadMsgIds);
    }
    
    const unreadAnalysisIds = notifications.filter(n => n.type === 'analysis' && !n.isRead).map(n => n.id);
    if (unreadAnalysisIds.length > 0) {
      markAnalysesAsRead(unreadAnalysisIds);
    }
    
    loadNotifications();
  };

  useEffect(() => {
    if (!user) return;

    loadNotifications();

    const msgChannel = supabase
      .channel('dashboard-home-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'request_messages',
        },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    const analysisChannel = supabase
      .channel('dashboard-home-analyses')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'analysis_results',
        },
        (payload: any) => {
          if (payload.new && payload.new.user_id === user.id) {
            loadNotifications();
          }
        }
      )
      .subscribe();

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(analysisChannel);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [user]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => {
    const fetchAnalyses = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('analysis_results' as any)
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (data) {
          const formattedData = data.map((item: any) => ({
            id: item.id,
            filename: item.details?.filename || 'Unknown File',
            category: item.category,
            status: item.status,
            confidence: item.confidence,
            created_at: item.created_at
          }));
          setAnalyses(formattedData);
        }
      } catch (err) {
        console.error('Error fetching analyses:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyses();
  }, [user]);

  const totalAnalyses = analyses.length;
  const normalCount = analyses.filter(a => a.status === 'normal').length;
  const issueCount = analyses.filter(a => a.status !== 'normal').length;
  const reportsCount = analyses.length;

  const stats = [
    { icon: Activity, label: 'Total Analyses', value: totalAnalyses.toString(), change: `+${totalAnalyses} total` },
    { icon: CheckCircle, label: 'Normal Detected', value: normalCount.toString(), change: totalAnalyses > 0 ? `${Math.round((normalCount / totalAnalyses) * 100)}%` : '0%' },
    { icon: AlertTriangle, label: 'Issues Found', value: issueCount.toString(), change: totalAnalyses > 0 ? `${Math.round((issueCount / totalAnalyses) * 100)}%` : '0%' },
    { icon: FileText, label: 'Reports Generated', value: reportsCount.toString(), change: `+${reportsCount} total` },
  ];

  const avgTime = totalAnalyses > 0 ? "1.8s" : "0s";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Profile picture circle */}
          <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-accent/30 flex-shrink-0 shadow-lg">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user?.name || 'User'}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center">
                <User className="h-7 w-7 text-accent/60" />
              </div>
            )}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Welcome back, {user?.name?.split(' ')[0]}!
            </h1>
            <p className="text-muted-foreground mt-1">
              Here's an overview of your sound analysis activity
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 relative" ref={dropdownRef}>
          <ThemeToggle />
          
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="relative p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Notifications"
          >
            <Bell className="h-6 w-6" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
              </span>
            )}
          </button>

          <button
            onClick={() => navigate('/dashboard/settings')}
            className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Settings"
          >
            <Settings className="h-6 w-6" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-background/95 backdrop-blur-md border border-border rounded-xl shadow-xl z-50 overflow-hidden py-1">
              <div className="px-4 py-2 border-b border-border flex items-center justify-between">
                <span className="font-semibold text-sm text-foreground">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-accent hover:underline font-medium"
                  >
                    Mark all as read
                  </button>
                )}
              </div>
              
              <div className="max-h-64 overflow-y-auto divide-y divide-border">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground">
                    No new notifications
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`p-3.5 hover:bg-muted/50 transition-colors cursor-pointer flex items-start gap-3 ${!notif.isRead ? 'bg-accent/5' : ''}`}
                    >
                      <div className="mt-0.5">
                        {notif.type === 'message' ? (
                          <MessageSquare className="h-4 w-4 text-accent" />
                        ) : (
                          <Waves className="h-4 w-4 text-success" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1.5">
                          <p className={`text-xs font-semibold truncate ${!notif.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {notif.title}
                          </p>
                          <span className="text-[9px] text-muted-foreground shrink-0">{notif.time}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {notif.message}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            className="glass-card rounded-xl p-6"
          >
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                <stat.icon className="h-6 w-6 text-accent" />
              </div>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                {stat.change}
              </span>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-bold text-foreground">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Analyses */}
        <div className="lg:col-span-2 glass-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-foreground">Recent Analyses</h2>
            <Link to="/dashboard/history" className="text-accent hover:underline text-sm flex items-center gap-1">
              View all <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="space-y-4">
            {analyses.slice(0, 5).map((analysis, index) => (
              <motion.div
                key={analysis.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => navigate('/dashboard/history', { state: { openId: analysis.id } })}
              >
                <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                  <Waves className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{analysis.filename}</p>
                  <p className="text-sm text-muted-foreground">
                    {analysis.category}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${analysis.status === 'normal' ? 'status-normal' :
                    analysis.status === 'warning' ? 'status-warning' : 'status-abnormal'
                    }`}>
                    {analysis.status === 'normal' ? <CheckCircle className="h-3 w-3" /> :
                      analysis.status === 'warning' ? <AlertTriangle className="h-3 w-3" /> :
                        <AlertTriangle className="h-3 w-3" />}
                    {analysis.status}
                  </span>
                  <p className="text-xs text-muted-foreground mt-1">{analysis.confidence.toFixed(1)}% conf.</p>
                </div>
              </motion.div>
            ))}
          </div>

          {!loading && analyses.length === 0 && (
            <div className="text-center py-12">
              <Waves className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No analyses yet</p>
              <Link to="/dashboard/analysis">
                <Button variant="accent" className="mt-4">
                  Start Your First Analysis
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <div className="glass-card rounded-xl p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Link to="/dashboard/analysis" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <Upload className="h-4 w-4 mr-3" />
                  Upload Audio File
                </Button>
              </Link>
              <Link to="/dashboard/map" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <TrendingUp className="h-4 w-4 mr-3" />
                  Find Technicians
                </Button>
              </Link>
              <Link to="/dashboard/settings" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="h-4 w-4 mr-3" />
                  View Reports
                </Button>
              </Link>
            </div>
          </div>

          <div className="glass-card rounded-xl p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">AI Status</h3>
            <div className="flex items-center gap-3 p-3 bg-success/10 rounded-lg">
              <div className="relative">
                <div className="w-3 h-3 bg-success rounded-full" />
                <div className="absolute inset-0 w-3 h-3 bg-success rounded-full animate-ping" />
              </div>
              <div>
                <p className="font-medium text-success">System Online</p>
                <p className="text-xs text-muted-foreground">MIMII Dataset Model v1.0</p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Avg. Analysis Time</span>
                <span className="font-medium">{avgTime}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Categories Supported</span>
                <span className="font-medium">Fan sound</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
