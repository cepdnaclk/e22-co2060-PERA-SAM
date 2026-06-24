import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/integrations/supabase/client';
import { useLocation } from 'react-router-dom';
import {
  Waves,
  CheckCircle,
  AlertTriangle,
  X,
  Search,
  Filter,
  Clock,
  FileText,
  Download,
  BarChart2,
  ChevronDown,
  Loader2,
  History,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface AnalysisRecord {
  id: string;
  filename: string;
  category: string;
  status: 'normal' | 'warning' | 'abnormal';
  confidence: number;
  anomaly_score: number | null;
  recommendation: string | null;
  machine_id: string | null;
  details: {
    filename?: string;
    frequency_analysis?: string;
    amplitude_variation?: string;
    pattern_detection?: string;
  } | null;
  created_at: string;
}

const statusConfig = {
  normal: {
    label: 'Normal',
    icon: CheckCircle,
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    border: 'border-emerald-500/30',
    glow: 'shadow-emerald-500/10',
  },
  warning: {
    label: 'Warning',
    icon: AlertTriangle,
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    border: 'border-amber-500/30',
    glow: 'shadow-amber-500/10',
  },
  abnormal: {
    label: 'Abnormal',
    icon: AlertTriangle,
    badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    border: 'border-rose-500/30',
    glow: 'shadow-rose-500/10',
  },
};

const categoryLabels: Record<string, string> = {
  fan: 'Industrial Fan',
  laptop: 'Laptop Fan',
  server: 'Server Fan',
  pump: 'Pump/Pipeline',
  vehicle: 'Vehicle Engine',
  hvac: 'HVAC System',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Report Modal ────────────────────────────────────────────────────────────

interface ReportModalProps {
  record: AnalysisRecord;
  onClose: () => void;
}

const ReportModal = ({ record, onClose }: ReportModalProps) => {
  const cfg = statusConfig[record.status];
  const StatusIcon = cfg.icon;

  const downloadPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.setTextColor(20, 184, 166);
    doc.text('PERA-SAM', 105, 15, { align: 'center' });
    doc.setFontSize(14);
    doc.text('Historical Diagnostic Report', 105, 22, { align: 'center' });
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`Report Date: ${formatDate(record.created_at)}`, 105, 27, { align: 'center' });

    doc.setDrawColor(230);
    doc.line(20, 30, 190, 30);

    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text('Equipment Information', 20, 38);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Category: ${categoryLabels[record.category] || record.category}`, 20, 44);
    doc.text(`Machine ID: ${record.machine_id || 'N/A'}`, 20, 49);
    doc.text(`File: ${record.filename}`, 20, 54);

    const statusColor: [number, number, number] =
      record.status === 'normal' ? [34, 197, 94] :
      record.status === 'warning' ? [234, 179, 8] : [239, 68, 68];
    doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.roundedRect(140, 35, 50, 20, 2, 2, 'F');
    doc.setTextColor(255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(record.status.toUpperCase(), 165, 45, { align: 'center' });
    doc.setFontSize(8);
    doc.text(`Health: ${record.confidence.toFixed(1)}%`, 165, 50, { align: 'center' });

    autoTable(doc, {
      startY: 65,
      head: [['Metric', 'Value']],
      body: [
        ['Anomaly Score (MSE)', record.anomaly_score?.toFixed(6) ?? 'N/A'],
        ['Health Confidence', `${record.confidence.toFixed(1)}%`],
        ['Status', record.status.toUpperCase()],
        ['Machine ID', record.machine_id || 'N/A'],
      ],
      theme: 'striped',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [20, 184, 166] },
    });

    let y = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('Diagnostic Findings', 20, y);
    y += 6;
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');

    const findings = [
      { label: 'Frequency Analysis', val: record.details?.frequency_analysis || 'N/A' },
      { label: 'Amplitude Variation', val: record.details?.amplitude_variation || 'N/A' },
      { label: 'Pattern Detection', val: record.details?.pattern_detection || 'N/A' },
      { label: 'Recommendation', val: record.recommendation || 'N/A' },
    ];
    findings.forEach(f => {
      const lines = doc.splitTextToSize(`${f.label}: ${f.val}`, 170);
      doc.text(lines, 20, y);
      y += lines.length * 4 + 3;
    });

    doc.setFontSize(7);
    doc.setTextColor(180);
    doc.setFont('helvetica', 'normal');
    doc.text('PERA-SAM v1.0 • Historical Acoustic Diagnostic Report', 105, 285, { align: 'center' });

    doc.save(`PERA-SAM_History_${record.filename.split('.')[0]}_${record.id.slice(0, 8)}.pdf`);
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        />

        {/* Modal */}
        <motion.div
          className={`relative w-full max-w-2xl max-h-[90vh] overflow-y-auto glass-card rounded-2xl border-2 ${cfg.border} shadow-2xl ${cfg.glow}`}
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-start justify-between p-6 pb-4 bg-card/80 backdrop-blur-md rounded-t-2xl border-b border-border">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                record.status === 'normal' ? 'bg-emerald-500/15' :
                record.status === 'warning' ? 'bg-amber-500/15' : 'bg-rose-500/15'
              }`}>
                <StatusIcon className={`h-7 w-7 ${
                  record.status === 'normal' ? 'text-emerald-400' :
                  record.status === 'warning' ? 'text-amber-400' : 'text-rose-400'
                }`} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  {record.status === 'normal' ? 'Normal Operation' :
                   record.status === 'warning' ? 'Warning Detected' : 'Abnormal Behavior'}
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">{record.filename}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'Status', value: record.status.toUpperCase(), highlight: true },
                { label: 'Health Confidence', value: `${record.confidence.toFixed(1)}%` },
                { label: 'Anomaly Score', value: record.anomaly_score?.toFixed(6) ?? 'N/A' },
                { label: 'Category', value: categoryLabels[record.category] || record.category },
                { label: 'Machine ID', value: record.machine_id || 'N/A' },
                { label: 'Date', value: formatDate(record.created_at) },
              ].map((m) => (
                <div key={m.label} className="p-3 bg-muted/40 rounded-xl border border-border/50">
                  <p className="text-xs text-muted-foreground mb-1">{m.label}</p>
                  <p className={`text-sm font-bold truncate ${m.highlight ? (
                    record.status === 'normal' ? 'text-emerald-400' :
                    record.status === 'warning' ? 'text-amber-400' : 'text-rose-400'
                  ) : 'text-foreground'}`}>{m.value}</p>
                </div>
              ))}
            </div>

            {/* Health Bar */}
            <div className="p-4 bg-muted/30 rounded-xl border border-border/50">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground font-medium">Health Score</span>
                <span className="font-bold">{record.confidence.toFixed(1)}%</span>
              </div>
              <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${
                    record.confidence >= 70 ? 'bg-emerald-500' :
                    record.confidence >= 40 ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${record.confidence}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
            </div>

            {/* Diagnostic Details */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-accent" />
                Diagnostic Findings
              </h3>

              {[
                { label: 'Frequency Analysis', value: record.details?.frequency_analysis },
                { label: 'Amplitude Variation', value: record.details?.amplitude_variation },
                { label: 'Pattern Detection', value: record.details?.pattern_detection },
              ].filter(d => d.value).map(d => (
                <div key={d.label} className="p-4 bg-muted/40 rounded-xl border border-border/50">
                  <p className="text-xs font-semibold text-accent/80 mb-1 uppercase tracking-wide">{d.label}</p>
                  <p className="text-sm text-muted-foreground">{d.value}</p>
                </div>
              ))}

              {record.recommendation && (
                <div className={`p-4 rounded-xl border ${
                  record.status === 'normal'
                    ? 'bg-emerald-500/5 border-emerald-500/20'
                    : record.status === 'warning'
                    ? 'bg-amber-500/5 border-amber-500/20'
                    : 'bg-rose-500/5 border-rose-500/20'
                }`}>
                  <p className="text-xs font-semibold text-accent/80 mb-1 uppercase tracking-wide">Recommendation</p>
                  <p className="text-sm text-foreground">{record.recommendation}</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer actions */}
          <div className="p-6 pt-0 flex gap-3">
            <Button variant="accent" className="flex-1" onClick={downloadPDF}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export const HistoryPage = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'normal' | 'warning' | 'abnormal'>('all');
  const [selected, setSelected] = useState<AnalysisRecord | null>(null);
  const [showFilter, setShowFilter] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('analysis_results' as any)
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (data) {
          setAnalyses(
            data.map((item: any) => ({
              id: item.id,
              filename: item.details?.filename || 'Unknown File',
              category: item.category,
              status: item.status,
              confidence: item.confidence,
              anomaly_score: item.anomaly_score ?? null,
              recommendation: item.recommendation ?? null,
              machine_id: item.machine_id ?? null,
              details: item.details ?? null,
              created_at: item.created_at,
            }))
          );
        }
      } catch (err) {
        console.error('Error fetching history:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [user]);

  // Auto-open modal when navigated from dashboard with a specific ID
  useEffect(() => {
    const openId = (location.state as any)?.openId;
    if (openId && analyses.length > 0) {
      const target = analyses.find(a => a.id === openId);
      if (target) setSelected(target);
    }
  }, [location.state, analyses]);

  const filtered = analyses.filter(a => {
    const matchSearch =
      a.filename.toLowerCase().includes(search.toLowerCase()) ||
      (categoryLabels[a.category] || a.category).toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || a.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalCount = analyses.length;
  const normalCount = analyses.filter(a => a.status === 'normal').length;
  const warningCount = analyses.filter(a => a.status === 'warning').length;
  const abnormalCount = analyses.filter(a => a.status === 'abnormal').length;

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <History className="h-8 w-8 text-accent" />
            Analysis History
          </h1>
          <p className="text-muted-foreground mt-1">
            Browse and review all of your previous diagnostic reports
          </p>
        </div>
      </div>

      {/* Summary stats — click to filter */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {([
          { label: 'Total',    value: totalCount,    filterKey: 'all'      as const, color: 'text-foreground',  bg: 'bg-muted/40',        ring: 'ring-foreground/30' },
          { label: 'Normal',   value: normalCount,   filterKey: 'normal'   as const, color: 'text-emerald-400', bg: 'bg-emerald-500/5',    ring: 'ring-emerald-400/60' },
          { label: 'Warning',  value: warningCount,  filterKey: 'warning'  as const, color: 'text-amber-400',   bg: 'bg-amber-500/5',      ring: 'ring-amber-400/60' },
          { label: 'Abnormal', value: abnormalCount, filterKey: 'abnormal' as const, color: 'text-rose-400',    bg: 'bg-rose-500/5',       ring: 'ring-rose-400/60' },
        ] as const).map((s, i) => {
          const isActive = filterStatus === s.filterKey;
          return (
            <motion.button
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              onClick={() => setFilterStatus(s.filterKey)}
              className={`${s.bg} glass-card rounded-xl p-5 border text-left w-full transition-all duration-200 cursor-pointer
                hover:scale-[1.03] active:scale-[0.98]
                ${
                  isActive
                    ? `ring-2 ${s.ring} border-transparent shadow-lg`
                    : 'border-border/50 hover:border-border'
                }`}
            >
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <div className="flex items-center justify-between mt-0.5">
                <p className="text-sm text-muted-foreground">{s.label}</p>
                {isActive && (
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${s.color} bg-current/10`}
                    style={{ backgroundColor: 'transparent', outline: '1px solid currentColor', outlineOffset: '-1px', opacity: 0.8 }}
                  >
                    Active
                  </span>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search bar */}
        <div className="glass-card rounded-xl px-4 py-2 flex items-center gap-3 flex-1">
          <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <input
            type="text"
            placeholder="Search by filename or category…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-muted-foreground hover:text-foreground transition">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter dropdown — standalone so stacking context never clips it */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setShowFilter(v => !v)}
            className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm transition-all h-full ${
              filterStatus !== 'all'
                ? 'bg-accent/10 border-accent/40 text-accent font-semibold shadow-md'
                : 'glass-card border-border/50 text-foreground hover:bg-muted'
            }`}
          >
            <Filter className="h-4 w-4" />
            <span>
              {filterStatus === 'all'
                ? 'All Status'
                : filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)}
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showFilter ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {showFilter && (
              <>
                {/* click-outside overlay */}
                <div
                  className="fixed inset-0 z-[9998]"
                  onClick={() => setShowFilter(false)}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -6 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 z-[9999] bg-card border border-border rounded-xl shadow-2xl min-w-[190px] overflow-hidden"
                  style={{ backdropFilter: 'blur(16px)' }}
                >
                  <div className="p-1">
                    {([
                      { key: 'all'      as const, label: 'All Status', dot: '',                count: analyses.length },
                      { key: 'normal'   as const, label: 'Normal',     dot: 'bg-emerald-400',  count: analyses.filter(a => a.status === 'normal').length },
                      { key: 'warning'  as const, label: 'Warning',    dot: 'bg-amber-400',    count: analyses.filter(a => a.status === 'warning').length },
                      { key: 'abnormal' as const, label: 'Abnormal',   dot: 'bg-rose-400',     count: analyses.filter(a => a.status === 'abnormal').length },
                    ]).map(s => (
                      <button
                        key={s.key}
                        onClick={() => { setFilterStatus(s.key); setShowFilter(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all ${
                          filterStatus === s.key
                            ? 'bg-accent/10 text-accent font-semibold'
                            : 'text-foreground hover:bg-muted'
                        }`}
                      >
                        {s.dot
                          ? <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${s.dot}`} />
                          : <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 border-2 border-muted-foreground/40" />
                        }
                        <span className="flex-1 text-left">{s.label}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                          filterStatus === s.key ? 'bg-accent/20 text-accent' : 'bg-muted text-muted-foreground'
                        }`}>
                          {s.count}
                        </span>
                        {filterStatus === s.key && <CheckCircle className="h-3.5 w-3.5 text-accent flex-shrink-0" />}
                      </button>
                    ))}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* List */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="p-6 border-b border-border flex items-center gap-2">
          <FileText className="h-5 w-5 text-accent" />
          <h2 className="font-semibold text-foreground">
            {filtered.length} {filtered.length === 1 ? 'Record' : 'Records'} Found
          </h2>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-10 w-10 text-accent animate-spin" />
            <p className="text-muted-foreground text-sm">Loading your history…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Waves className="h-16 w-16 text-muted-foreground/30" />
            <p className="text-muted-foreground">
              {analyses.length === 0 ? 'No analyses yet. Run your first analysis!' : 'No records match your filter.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((a, i) => {
              const cfg = statusConfig[a.status];
              const StatusIcon = cfg.icon;

              return (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.04 }}
                  onClick={() => setSelected(a)}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-muted/40 transition-colors cursor-pointer group"
                >
                  {/* Icon */}
                  <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                    <Waves className="h-5 w-5 text-muted-foreground group-hover:text-accent transition-colors" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{a.filename}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">{categoryLabels[a.category] || a.category}</span>
                      <span className="text-muted-foreground/40">•</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(a.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Status badge */}
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.badge}`}>
                      <StatusIcon className="h-3 w-3" />
                      {cfg.label}
                    </span>
                    <span className="text-xs text-muted-foreground">{a.confidence.toFixed(1)}% health</span>
                  </div>

                  {/* Arrow hint */}
                  <ChevronDown className="h-4 w-4 text-muted-foreground/40 -rotate-90 group-hover:text-accent group-hover:translate-x-1 transition-all" />
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Report Modal */}
      {selected && (
        <ReportModal record={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
};
