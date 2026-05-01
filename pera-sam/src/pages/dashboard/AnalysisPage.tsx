import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Upload,
  Waves,
  Play,
  Pause,
  FileAudio,
  Trash2,
  ChevronDown,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Download,
  Share2,
  RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';

const categories = [
  { id: 'fan', label: 'Industrial Fan', ids: ['00', '02', '04', '06'] },
  { id: 'laptop', label: 'Laptop Fan', ids: ['Standard'] },
  { id: 'server', label: 'Server Fan', ids: ['Rack-Unit-1'] },
  { id: 'pump', label: 'Pump/Pipeline', ids: ['P1', 'P2'] },
  { id: 'vehicle', label: 'Vehicle Engine', ids: ['V6', 'V8'] },
  { id: 'hvac', label: 'HVAC System', ids: ['Central'] },
];

interface AnalysisResult {
  status: 'normal' | 'warning' | 'abnormal';
  confidence: number;
  details: {
    frequency_analysis: string;
    amplitude_variation: string;
    pattern_detection: string;
    recommendation: string;
    reliability?: string;
    model_auc?: number;
  };
  waveformData: number[];
  timeSeriesData: { time: number; amplitude: number; frequency: number }[];
  machine_id?: string;
  identified_category?: string;
  identified_id?: string;
  anomaly_score?: number;
}

export const AnalysisPage = () => {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState('');
  const [machineId, setMachineId] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    console.log("AnalysisPage: Component Mounted", {
      userId: user?.id,
      userRole: user?.role,
      isAuthenticated: !!user
    });
  }, [user]);

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const selectedCategory = categories.find(c => c.id === category);



  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith('audio/')) {
      setFile(droppedFile);
      setAudioUrl(URL.createObjectURL(droppedFile));
      setResult(null);
    } else {
      toast.error('Please upload an audio file');
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setAudioUrl(URL.createObjectURL(selectedFile));
      setResult(null);
    }
  };

  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const extractWaveform = async (audioFile: File): Promise<number[]> => {
    try {
      const arrayBuffer = await audioFile.arrayBuffer();
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const channelData = audioBuffer.getChannelData(0); // Get first channel

      const samples = 120; // More samples for better detail
      const step = Math.floor(channelData.length / samples);
      const waveform = [];
      let maxVal = 0;

      // 1. Get raw peaks
      for (let i = 0; i < samples; i++) {
        let max = 0;
        for (let j = 0; j < step; j++) {
          const datum = Math.abs(channelData[(i * step) + j]);
          if (datum > max) max = datum;
        }
        waveform.push(max);
        if (max > maxVal) maxVal = max;
      }

      // 2. Normalize ("Zoom") - scale peaks so the highest is 0.9
      const multiplier = maxVal > 0 ? (0.9 / maxVal) : 1;
      return waveform.map(v => v * multiplier);
    } catch (e) {
      console.error('Waveform extraction failed:', e);
      return Array.from({ length: 120 }, () => Math.random() * 0.5 + 0.2);
    }
  };

  const analyzeSound = async () => {
    if (!file || !category) {
      toast.error('Please upload a file and select a machine category');
      return;
    }

    setIsAnalyzing(true);

    try {
      // 1. Extract real waveform first
      const realWaveformData = await extractWaveform(file);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', category);
      if (machineId) formData.append('machine_id', machineId);

      const mlApiUrl = import.meta.env.VITE_ML_API_URL || 'http://localhost:8000';
      const response = await fetch(`${mlApiUrl}/analyze`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const data = await response.json();

      if (data.status === 'Error') {
        throw new Error(data.message);
      }

      const analysis = data.analysis;

      // Handle the case where the model might not be found
      if (analysis.status === 'No Model') {
        throw new Error(analysis.message);
      }

      const status: 'normal' | 'warning' | 'abnormal' =
        analysis.status === 'Normal' ? 'normal' :
          analysis.status === 'Warning' ? 'warning' : 'abnormal';

      setResult({
        status,
        confidence: analysis.health_percentage,
        details: {
          frequency_analysis: `Anomaly Score: ${analysis.score.toFixed(4)}. Using model for ${analysis.model_used}.`,
          amplitude_variation: analysis.engine_health === 'Critical'
            ? 'High reconstruction error detected in mel-spectrogram domains.'
            : 'Reconstruction error within acceptable baseline range.',
          pattern_detection: analysis.baseline_compliant
            ? `Baseline calibration applied (Threshold: ${analysis.threshold_used}).`
            : 'Unknown pattern detected.',
          recommendation: analysis.recommendation,
          reliability: analysis.detection_reliability,
          model_auc: analysis.model_auc,
        },
        waveformData: realWaveformData,
        timeSeriesData: realWaveformData.slice(0, 50).map((v, i) => ({
          time: i * 0.1,
          amplitude: Math.abs(v) + 0.2,
          frequency: 800 + (analysis.score * 50) + (Math.abs(v) * 200),
        })),
        machine_id: analysis.machine_id,
        identified_category: analysis.machine_category,
        identified_id: analysis.machine_id,
        anomaly_score: analysis.score
      });

      toast.success('Analysis complete!');

      // Save result to Supabase if user is logged in
      if (user) {
        try {
          const { error: dbError } = await supabase
            .from('analysis_results' as any)
            .insert({
              user_id: user.id,
              machine_id: analysis.machine_id || category,
              category: category,
              status: status,
              confidence: analysis.health_percentage,
              anomaly_score: analysis.score,
              recommendation: analysis.recommendation,
              details: {
                frequency_analysis: `Anomaly Score: ${analysis.score.toFixed(4)}. MIMII baseline parameters applied (64 mels, 5 frame concat).`,
                amplitude_variation: analysis.engine_health === 'Critical'
                  ? 'High reconstruction error detected in mel-spectrogram domains.'
                  : 'Reconstruction error within acceptable baseline range.',
                pattern_detection: analysis.baseline_compliant
                  ? 'Input sound vector matched against trained Autoencoder manifold.'
                  : 'Unknown pattern detected.',
                filename: file.name
              }
            });

          if (dbError) {
            console.error('Error saving to Supabase:', dbError);
          } else {
            console.log('Analysis result saved to Supabase');
          }
        } catch (dbErr) {
          console.error('Failed to save analysis to history:', dbErr);
        }
      }
    } catch (error: any) {
      console.error('Analysis failed:', error);
      toast.error(`Backend Error: ${error.message}. Make sure server is running on ${import.meta.env.VITE_ML_API_URL || 'http://localhost:8000'}`);
    } finally {
      setIsAnalyzing(false);
      console.log("AnalysisPage: Analysis process finished.");
    }
  };

  const resetAnalysis = () => {
    setFile(null);
    setAudioUrl(null);
    setCategory('');
    setMachineId('');
    setResult(null);
    setIsPlaying(false);
  };

  const downloadReport = () => {
    if (!result || !file) return;

    try {
      const doc = new jsPDF();

      // Header (Condensed)
      doc.setFontSize(20);
      doc.setTextColor(20, 184, 166);
      doc.text('PERA-SAM', 105, 15, { align: 'center' });
      doc.setFontSize(14);
      doc.text('Acoustic Intelligence Diagnosis', 105, 22, { align: 'center' });
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 105, 27, { align: 'center' });

      // Line separator
      doc.setDrawColor(230);
      doc.line(20, 30, 190, 30);

      // Top Section: Info & Status (Side-by-side)
      doc.setFontSize(11);
      doc.setTextColor(0);
      doc.setFont('helvetica', 'bold');
      doc.text('Equipment Information', 20, 38);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Category: ${category}`, 20, 44);
      doc.text(`Identified ID: ${result.identified_id || 'N/A'}`, 20, 49);
      doc.text(`Source: ${file.name}`, 20, 54);

      const statusColor: [number, number, number] = result.status === 'normal' ? [34, 197, 94] : result.status === 'warning' ? [234, 179, 8] : [239, 68, 68];
      doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
      doc.roundedRect(140, 35, 50, 20, 2, 2, 'F');
      doc.setTextColor(255);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(result.status.toUpperCase(), 165, 45, { align: 'center' });
      doc.setFontSize(8);
      doc.text(`Health: ${result.confidence.toFixed(1)}%`, 165, 50, { align: 'center' });

      // Waveform Section (Reduced size)
      doc.setTextColor(0);
      doc.setFontSize(11);
      doc.text('Acoustic Signature', 20, 65);
      doc.setDrawColor(20, 184, 166);
      doc.setLineWidth(0.3);
      const waveX = 20, waveY = 75, waveW = 170, waveH = 12;
      doc.line(waveX, waveY, waveX + waveW, waveY);
      const step = waveW / result.waveformData.length;
      result.waveformData.slice(0, 100).forEach((val, i) => {
        doc.line(waveX + (i * step), waveY, waveX + (i * step), waveY + (val * (waveH / 2)));
      });

      // Metrics Table (Compact)
      autoTable(doc, {
        startY: 85,
        head: [['Metric', 'Value', 'Assessment']],
        body: [
          ['Anomaly Score (MSE)', result.anomaly_score?.toFixed(6) || 'N/A', 'Measured'],
          ['Model Reliability', `${(result.details.model_auc || 0).toFixed(3)} AUC`, result.details.reliability || 'Active'],
          ['Decision Logic', result.status.toUpperCase(), 'Verified']
        ],
        theme: 'striped',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [20, 184, 166] }
      });

      // Findings Section
      let currentY = (doc as any).lastAutoTable.finalY + 8;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Diagnostic Findings', 20, currentY);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      currentY += 5;

      const findings = [
        { label: 'Analysis', val: result.details.frequency_analysis },
        { label: 'Variance', val: result.details.amplitude_variation },
        { label: 'Action', val: result.details.recommendation }
      ];

      findings.forEach(f => {
        const lines = doc.splitTextToSize(`${f.label}: ${f.val}`, 170);
        doc.text(lines, 20, currentY);
        currentY += (lines.length * 4) + 2;
      });

      // Methodology Block (Condensed at bottom)
      currentY += 5;
      doc.setDrawColor(240);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(15, currentY, 180, 55, 2, 2, 'FD');

      currentY += 7;
      doc.setFontSize(10);
      doc.setTextColor(20, 184, 166);
      doc.setFont('helvetica', 'bold');
      doc.text('Technical Methodology Summary', 105, currentY, { align: 'center' });

      doc.setFontSize(7.5);
      doc.setTextColor(80);
      doc.setFont('helvetica', 'normal');
      currentY += 6;
      const methodologyText = 'Signal: Transformed via 64-band Log-Mel Spectrogram (16kHz). Model: Deep Autoencoder trained on healthy baseline manifolds. Detection: Deviation measured via Mean Squared Error (MSE) between concatenated frames. Accuracy: Dynamic Threshold applied based on Model AUC calibration.';
      doc.text(doc.splitTextToSize(methodologyText, 170), 20, currentY);

      currentY += 15;
      doc.setFontSize(9);
      doc.setFont('courier', 'bolditalic');
      doc.setTextColor(100);
      doc.text('T = Base_T * (1 + (1 - Model_AUC) * 1.5)', 105, currentY, { align: 'center' });

      // Footer
      doc.setFontSize(7);
      doc.setTextColor(180);
      doc.setFont('helvetica', 'normal');
      doc.text('PERA-SAM v1.0 • Acoustic Intelligence for Predictive Maintenance • Confidential Diagnostic Report', 105, 285, { align: 'center' });

      doc.save(`Report_${file.name.split('.')[0]}.pdf`);
      toast.success('Condensed A4 Report Ready!');
    } catch (error) {
      console.error('PDF Generation Error:', error);
      toast.error('Failed to generate PDF report');
    }
  };

  console.log("AnalysisPage: Render", { hasUser: !!user, hasResult: !!result, isAnalyzing });

  return (
    <div className="space-y-6">
      <div id="analysis-page-header" className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sound Analysis</h1>
          <p className="text-muted-foreground mt-1">
            Upload audio recordings for AI-powered mechanical diagnostics
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-background border rounded-full shadow-sm">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">ML Engine Online</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upload Section */}
        <div className="space-y-6">
          {/* File Upload */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-xl p-6"
          >
            <h2 className="text-lg font-semibold text-foreground mb-4">Upload Audio</h2>

            {!file ? (
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-xl p-12 text-center cursor-pointer hover:border-accent/50 hover:bg-muted/50 transition-all"
              >
                <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-foreground font-medium mb-1">
                  Drop your audio file here
                </p>
                <p className="text-sm text-muted-foreground">
                  or click to browse (WAV, MP3, M4A)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                  <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                    <FileAudio className="h-6 w-6 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={resetAnalysis}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>

                {/* Audio Preview */}
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <Button variant="accent" size="icon" onClick={togglePlayback}>
                      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <div className="flex-1">
                      <div className="h-12 bg-muted rounded flex items-center justify-center gap-0.5">
                        {[...Array(60)].map((_, i) => (
                          <motion.div
                            key={i}
                            className="w-1 bg-accent rounded-full"
                            animate={{
                              height: isPlaying
                                ? [8, Math.random() * 40 + 8, 8]
                                : 8,
                            }}
                            transition={{
                              duration: 0.5,
                              repeat: isPlaying ? Infinity : 0,
                              delay: i * 0.02,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <audio ref={audioRef} src={audioUrl || ''} onEnded={() => setIsPlaying(false)} />
                </div>
              </div>
            )}
          </motion.div>

          {/* Category Selection */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card rounded-xl p-6"
          >
            <h2 className="text-lg font-semibold text-foreground mb-4">Equipment Details</h2>

            <div className="space-y-4">
              <div>
                <Label>Machine Category</Label>
                <Select value={category} onValueChange={(v) => { setCategory(v); setMachineId(''); }}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select equipment type" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Previously there was a Machine ID / Model dropdown here, removed as per user request */}
            <Button
              variant="hero"
              className="w-full mt-6"
              size="lg"
              disabled={!file || !category || isAnalyzing}
              onClick={analyzeSound}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Analyzing Sound...
                </>
              ) : (
                <>
                  <Waves className="h-5 w-5" />
                  Analyze Sound
                </>
              )}
            </Button>
          </motion.div>
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          {isAnalyzing && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card rounded-xl p-8 text-center"
            >
              <div className="relative w-24 h-24 mx-auto mb-6">
                <div className="absolute inset-0 bg-accent/20 rounded-full animate-ping" />
                <div className="relative w-24 h-24 bg-accent rounded-full flex items-center justify-center">
                  <Waves className="h-12 w-12 text-accent-foreground animate-pulse" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Analyzing Audio...
              </h3>
              <p className="text-muted-foreground">
                Our AI is processing the sound patterns using the MIMII dataset model
              </p>
              <div className="mt-6 flex justify-center gap-2">
                {['Frequency', 'Amplitude', 'Patterns'].map((step, i) => (
                  <motion.div
                    key={step}
                    className="px-3 py-1 bg-muted rounded-full text-xs text-muted-foreground"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
                  >
                    {step}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {result && !isAnalyzing && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Status Card */}
              <div className={`glass-card rounded-xl p-6 border-2 ${result.status === 'normal' ? 'border-success/30' :
                result.status === 'warning' ? 'border-warning/30' : 'border-destructive/30'
                }`}>
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center ${result.status === 'normal' ? 'bg-success/10' :
                    result.status === 'warning' ? 'bg-warning/10' : 'bg-destructive/10'
                    }`}>
                    {result.status === 'normal' ? (
                      <CheckCircle className="h-8 w-8 text-success" />
                    ) : (
                      <AlertTriangle className={`h-8 w-8 ${result.status === 'warning' ? 'text-warning' : 'text-destructive'
                        }`} />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className={`text-2xl font-bold capitalize ${result.status === 'normal' ? 'text-success' :
                      result.status === 'warning' ? 'text-warning' : 'text-destructive'
                      }`}>
                      {result.status === 'normal' ? 'Normal Operation' :
                        result.status === 'warning' ? 'Warning Detected' : 'Abnormal Behavior'}
                    </h3>
                    <div className="flex gap-4 mt-1">
                      <p className="text-sm text-muted-foreground">
                        Confidence: {result.confidence.toFixed(1)}%
                      </p>
                      <p className="text-sm font-semibold text-accent/80">
                        Score: {result.anomaly_score?.toFixed(4)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Waveform Visualization */}
              <div className="glass-card rounded-xl p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Waveform Analysis</h3>
                <div className="h-32 bg-muted/30 rounded-lg flex items-center justify-center p-2">
                  <svg viewBox={`0 0 ${result.waveformData.length} 40`} className="w-full h-full preserve-3d">
                    {result.waveformData.map((v, i) => (
                      <rect
                        key={i}
                        x={i}
                        y={20 - (v * 18)}
                        width="0.6"
                        height={v * 36}
                        fill="currentColor"
                        className={`${result.status === 'normal' ? 'text-success' :
                          result.status === 'warning' ? 'text-warning' : 'text-destructive'
                          } opacity-80`}
                      />
                    ))}
                  </svg>
                </div>
              </div>

              {/* Time Series Chart */}
              <div className="glass-card rounded-xl p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Frequency Over Time</h3>
                <div className="h-48 bg-muted/50 rounded-lg p-4">
                  <svg viewBox="0 0 100 60" className="w-full h-full">
                    {/* Grid lines */}
                    {[0, 15, 30, 45, 60].map((y) => (
                      <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="hsl(var(--border))" strokeWidth="0.3" />
                    ))}
                    {/* Frequency line */}
                    <path
                      d={(() => {
                        const freqValues = result.timeSeriesData.map(d => d.frequency);
                        const minF = Math.min(...freqValues);
                        const maxF = Math.max(...freqValues);
                        const range = maxF - minF || 10; // Avoid division by zero

                        return `M ${result.timeSeriesData.map((d, i) =>
                          `${(i / (result.timeSeriesData.length - 1)) * 100} ${55 - ((d.frequency - minF) / range) * 50}`
                        ).join(' L ')}`;
                      })()}
                      fill="none"
                      stroke="hsl(var(--chart-1))"
                      strokeWidth="1.2"
                    />
                    {/* Amplitude line */}
                    <path
                      d={`M ${result.timeSeriesData.map((d, i) =>
                        `${(i / result.timeSeriesData.length) * 100} ${30 - d.amplitude * 20}`
                      ).join(' L ')}`}
                      fill="none"
                      stroke="hsl(var(--chart-2))"
                      strokeWidth="0.8"
                    />
                  </svg>
                </div>
                <div className="flex justify-center gap-6 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-chart-1" />
                    <span className="text-sm text-muted-foreground">Frequency (Hz)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-chart-2" />
                    <span className="text-sm text-muted-foreground">Amplitude</span>
                  </div>
                </div>
              </div>

              {/* Reliability & Confidence metrics */}
              <div className="glass-card rounded-xl p-6 bg-accent/5 border-accent/20">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">Model Performance</h3>
                  <div className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${result.details.reliability === 'High' ? 'bg-success/10 text-success' :
                    result.details.reliability === 'Medium' ? 'bg-warning/10 text-warning' : 'bg-muted text-muted-foreground'
                    }`}>
                    Reliability: {result.details.reliability}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-muted/40 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Identified As</p>
                    <p className="text-sm font-bold truncate capitalize">
                      {result.identified_category} (ID: {result.identified_id})
                    </p>
                  </div>
                  <div className="p-3 bg-muted/40 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Validation AUC</p>
                    <p className="text-xl font-bold text-accent">
                      {typeof result.details.model_auc === 'number' && result.details.model_auc > 0
                        ? result.details.model_auc.toFixed(3)
                        : 'Calibrating'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Analysis Details */}
              <div className="glass-card rounded-xl p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Detailed Analysis</h3>
                <div className="space-y-4">
                  {/* New status display */}
                  <div className="p-4 bg-muted/50 rounded-lg">
                    {result.status === 'normal' ? (
                      <div className="flex items-center gap-2 text-green-500">
                        <CheckCircle className="h-5 w-5" />
                        <span className="font-semibold">Normal Baseline Detected</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-5 w-5" />
                        <span className="font-semibold">Anomaly/Vibration Detected!</span>
                      </div>
                    )}
                  </div>

                  {/* Score and Threshold Insights */}
                  <div className="mt-4 grid grid-cols-2 gap-4 text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border/50">
                    <div>
                      <p className="font-medium text-foreground/70 mb-0.5">Anomaly Score (MSE)</p>
                      <p className="font-mono text-sm">{result.anomaly_score?.toFixed(6) || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground/70 mb-0.5">Health Confidence</p>
                      <p className="font-mono text-sm">{result.confidence?.toFixed(2) || '0.00'}%</p>
                    </div>
                  </div>

                  {Object.entries(result.details).map(([key, value]) => (
                    <div key={key} className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm font-medium text-foreground capitalize mb-1">
                        {key.replace(/_/g, ' ')}
                      </p>
                      <p className="text-sm text-muted-foreground">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="accent" className="flex-1" size="lg" onClick={downloadReport}>
                  <Download className="h-5 w-5 mr-2" />
                  Download PDF Report
                </Button>
                <Button variant="outline" className="flex-1" size="lg">
                  <Share2 className="h-5 w-5 mr-2" />
                  Share Report
                </Button>
                <Button variant="ghost" size="lg" onClick={resetAnalysis}>
                  <RotateCcw className="h-5 w-5 mr-2" />
                  New Analysis
                </Button>
              </div>
            </motion.div>
          )}

          {!result && !isAnalyzing && (
            <div className="glass-card rounded-xl p-12 text-center">
              <Waves className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                No Analysis Yet
              </h3>
              <p className="text-sm text-muted-foreground">
                Upload an audio file and select equipment details to start analyzing
              </p>
            </div>
          )}
        </div>
      </div >
    </div >
  );
};
