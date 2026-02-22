import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
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

const categories = [
  { id: 'laptop', label: 'Laptop Fan', brands: ['Dell', 'HP', 'Lenovo', 'ASUS', 'MacBook', 'Acer'] },
  { id: 'server', label: 'Server Fan', brands: ['HP ProLiant', 'Dell PowerEdge', 'IBM', 'Cisco', 'Supermicro'] },
  { id: 'pump', label: 'Pump/Pipeline', brands: ['Grundfos', 'KSB', 'Sulzer', 'Flowserve', 'Wilo'] },
  { id: 'vehicle', label: 'Vehicle Engine', brands: ['Toyota', 'Honda', 'BMW', 'Mercedes', 'Ford', 'Volkswagen'] },
  { id: 'hvac', label: 'HVAC System', brands: ['Carrier', 'Trane', 'Daikin', 'LG', 'Samsung'] },
  { id: 'industrial', label: 'Industrial Machinery', brands: ['Siemens', 'ABB', 'GE', 'Mitsubishi', 'Schneider'] },
];

interface AnalysisResult {
  status: 'normal' | 'warning' | 'abnormal';
  confidence: number;
  details: {
    frequency_analysis: string;
    amplitude_variation: string;
    pattern_detection: string;
    recommendation: string;
  };
  waveformData: number[];
  timeSeriesData: { time: number; amplitude: number; frequency: number }[];
}

export const AnalysisPage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const analyzeSound = async () => {
    if (!file || !category || !brand) {
      toast.error('Please upload a file and select category/brand');
      return;
    }

    setIsAnalyzing(true);

    // Simulate AI analysis
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Generate demo result based on random simulation
    const random = Math.random();
    const status: 'normal' | 'warning' | 'abnormal' = 
      random > 0.7 ? 'abnormal' : random > 0.4 ? 'warning' : 'normal';
    
    const confidence = status === 'normal' 
      ? 85 + Math.random() * 14 
      : status === 'warning' 
        ? 65 + Math.random() * 20 
        : 75 + Math.random() * 15;

    // Generate waveform data
    const waveformData = Array.from({ length: 100 }, () => Math.random() * 2 - 1);
    
    // Generate time series data
    const timeSeriesData = Array.from({ length: 50 }, (_, i) => ({
      time: i * 0.1,
      amplitude: Math.sin(i * 0.3) * (0.5 + Math.random() * 0.5) + (Math.random() * 0.2),
      frequency: 800 + Math.sin(i * 0.2) * 200 + (Math.random() * 100),
    }));

    setResult({
      status,
      confidence,
      details: {
        frequency_analysis: status === 'normal' 
          ? 'Frequency spectrum within normal operating range (800-1200 Hz)'
          : 'Frequency peaks detected outside normal range, indicating potential bearing wear',
        amplitude_variation: status === 'normal'
          ? 'Amplitude variations are minimal and consistent with normal operation'
          : 'Significant amplitude spikes detected, suggesting mechanical imbalance',
        pattern_detection: status === 'normal'
          ? 'Sound pattern matches healthy equipment signature in MIMII dataset'
          : 'Pattern anomalies detected - 78% correlation with known fault signatures',
        recommendation: status === 'normal'
          ? 'Equipment operating normally. Schedule routine maintenance in 3 months.'
          : status === 'warning'
            ? 'Minor irregularities detected. Recommend inspection within 2 weeks.'
            : 'Immediate attention required. High probability of component failure.',
      },
      waveformData,
      timeSeriesData,
    });

    setIsAnalyzing(false);
    toast.success('Analysis complete!');
  };

  const resetAnalysis = () => {
    setFile(null);
    setAudioUrl(null);
    setCategory('');
    setBrand('');
    setResult(null);
    setIsPlaying(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Sound Analysis</h1>
        <p className="text-muted-foreground mt-1">
          Upload audio recordings for AI-powered mechanical diagnostics
        </p>
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
                <Select value={category} onValueChange={(v) => { setCategory(v); setBrand(''); }}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select category" />
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

              <div>
                <Label>Brand / Model</Label>
                <Select value={brand} onValueChange={setBrand} disabled={!category}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder={category ? "Select brand" : "Select category first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedCategory?.brands.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button 
              variant="hero" 
              className="w-full mt-6" 
              size="lg"
              disabled={!file || !category || !brand || isAnalyzing}
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
              <div className={`glass-card rounded-xl p-6 border-2 ${
                result.status === 'normal' ? 'border-success/30' :
                result.status === 'warning' ? 'border-warning/30' : 'border-destructive/30'
              }`}>
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                    result.status === 'normal' ? 'bg-success/10' :
                    result.status === 'warning' ? 'bg-warning/10' : 'bg-destructive/10'
                  }`}>
                    {result.status === 'normal' ? (
                      <CheckCircle className="h-8 w-8 text-success" />
                    ) : (
                      <AlertTriangle className={`h-8 w-8 ${
                        result.status === 'warning' ? 'text-warning' : 'text-destructive'
                      }`} />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className={`text-2xl font-bold capitalize ${
                      result.status === 'normal' ? 'text-success' :
                      result.status === 'warning' ? 'text-warning' : 'text-destructive'
                    }`}>
                      {result.status === 'normal' ? 'Normal Operation' :
                       result.status === 'warning' ? 'Warning Detected' : 'Abnormal Behavior'}
                    </h3>
                    <p className="text-muted-foreground">
                      Confidence: {result.confidence.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Waveform Visualization */}
              <div className="glass-card rounded-xl p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Waveform Analysis</h3>
                <div className="h-32 bg-muted/50 rounded-lg flex items-center justify-center p-4">
                  <svg viewBox="0 0 100 40" className="w-full h-full">
                    <path
                      d={`M 0 20 ${result.waveformData.map((v, i) => 
                        `L ${i} ${20 + v * 15}`
                      ).join(' ')}`}
                      fill="none"
                      stroke="hsl(var(--accent))"
                      strokeWidth="0.5"
                    />
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
                      d={`M ${result.timeSeriesData.map((d, i) => 
                        `${(i / result.timeSeriesData.length) * 100} ${60 - ((d.frequency - 600) / 600) * 50}`
                      ).join(' L ')}`}
                      fill="none"
                      stroke="hsl(var(--chart-1))"
                      strokeWidth="0.8"
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

              {/* Analysis Details */}
              <div className="glass-card rounded-xl p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Detailed Analysis</h3>
                <div className="space-y-4">
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
                <Button variant="accent" className="flex-1" size="lg">
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
      </div>
    </div>
  );
};
