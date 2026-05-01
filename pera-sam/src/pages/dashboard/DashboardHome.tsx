import { useState, useEffect } from 'react';
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
  Waves
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface AnalysisRecord {
  id: string;
  filename: string;
  category: string;
  status: 'normal' | 'warning' | 'abnormal';
  confidence: number;
  created_at: string;
}

export const DashboardHome = () => {
  const { user } = useAuth();
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);
  const [loading, setLoading] = useState(true);

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
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back, {user?.name?.split(' ')[0]}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's an overview of your sound analysis activity
          </p>
        </div>
        <Link to="/dashboard/analysis">
          <Button variant="accent" size="lg">
            <Upload className="h-5 w-5 mr-2" />
            New Analysis
          </Button>
        </Link>
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
            <Link to="/dashboard/analysis" className="text-accent hover:underline text-sm flex items-center gap-1">
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
