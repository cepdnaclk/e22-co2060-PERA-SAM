import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ChevronRight,
  ChevronLeft,
  User,
  MapPin,
  Phone,
  Waves,
  Droplets,
  Cog,
  Gauge,
  CircleDot,
  Wrench,
  Upload,
  Image as ImageIcon,
  Sparkles,
  Loader2,
  CheckCircle,
  Trash2,
  AlertCircle,
  Building2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ServiceProvider {
  id: string;
  name: string;
  address: string;
}

interface Props {
  provider: ServiceProvider;
  onClose: () => void;
  onSuccess: () => void;
}

type RepairCategory =
  | 'fan'
  | 'pump'
  | 'slider'
  | 'valve'
  | 'vehicle_bearing'
  | '';

interface UploadedPhoto {
  file: File;
  preview: string;
  aiAnalyzed?: boolean;
}

interface EquipmentDetails {
  // Fan
  fanId: string;
  fanInstallLocation: string;
  // Pump
  pumpType: string;
  pumpBrand: string;
  // Slider / Slide Rail
  sliderType: string;
  sliderLength: string;
  // Valve
  valveType: string;
  valveMaterial: string;
  // Vehicle Bearing
  bearingType: string;
  vehicleType: string;
  vehicleBrand: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const repairCategories = [
  { id: 'fan',             label: 'Industrial Fan',     icon: Waves,     color: 'from-teal-500/20 to-teal-600/10' },
  { id: 'pump',            label: 'Industrial Pump',    icon: Droplets,  color: 'from-blue-500/20 to-blue-600/10' },
  { id: 'slider',          label: 'Slide Rail',         icon: Cog,       color: 'from-violet-500/20 to-violet-600/10' },
  { id: 'valve',           label: 'Industrial Valve',   icon: Gauge,     color: 'from-amber-500/20 to-amber-600/10' },
  { id: 'vehicle_bearing', label: 'Vehicle Bearing',    icon: CircleDot, color: 'from-rose-500/20 to-rose-600/10' },
];

const fanIds = ['id_00', 'id_02', 'id_04', 'id_06'];
const fanInstallLocations = ['Production Line', 'HVAC / Ventilation', 'Server Room', 'Clean Room', 'Other'];

const pumpTypes = [
  'Centrifugal Pump', 'Submersible Pump', 'Jet Pump', 'Sump Pump',
  'Booster Pump', 'Industrial High-Pressure Pump', 'Water Pump (Domestic)',
];

const sliderTypes = ['Ball Screw Slide', 'Linear Rail', 'Dovetail Slide', 'Telescopic Rail', 'Roller Slide', 'Other'];
const sliderLengths = ['< 200 mm', '200–500 mm', '500 mm–1 m', '1 m–2 m', '> 2 m'];

const valveTypes = ['Gate Valve', 'Ball Valve', 'Globe Valve', 'Check Valve', 'Butterfly Valve', 'Safety / Relief Valve', 'Solenoid Valve'];
const valveMaterials = ['Cast Iron', 'Carbon Steel', 'Stainless Steel', 'Brass', 'PVC', 'Bronze', 'Other'];

const bearingTypes = ['Ball Bearing', 'Roller Bearing', 'Tapered Roller', 'Needle Bearing', 'Thrust Bearing', 'Other'];
const vehicleTypes = ['Car', 'Van', 'Truck', 'Bus', 'Three-Wheeler', 'Motorcycle', 'SUV / Jeep'];
const vehicleBrands = [
  'Toyota', 'Nissan', 'Honda', 'Suzuki', 'Mitsubishi', 'Mazda',
  'BMW', 'Mercedes-Benz', 'Hyundai', 'Kia', 'Ford', 'Subaru',
  'Isuzu', 'Tata', 'Bajaj', 'Hero', 'TVS', 'Other',
];

// ─── Helper ───────────────────────────────────────────────────────────────────

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

// ─── Component ────────────────────────────────────────────────────────────────

export const RequestRepairModal = ({ provider, onClose, onSuccess }: Props) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  // Step 1 — Customer Details
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Step 2 — Equipment
  const [category, setCategory] = useState<RepairCategory>('');
  const [description, setDescription] = useState('');
  const [equipment, setEquipment] = useState<EquipmentDetails>({
    fanId: '', fanInstallLocation: '',
    pumpType: '', pumpBrand: '',
    sliderType: '', sliderLength: '',
    valveType: '', valveMaterial: '',
    bearingType: '', vehicleType: '', vehicleBrand: '',
  });

  // Step 3 — Photos
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [aiFields, setAiFields] = useState<string[]>([]); // tracks which fields were AI-filled

  // ── Derived ──────────────────────────────────────────────────────────────────

  const step1Valid = customerName.trim() !== '';
  const step2Valid = category !== '';

  // ── Equipment field helpers ──────────────────────────────────────────────────

  const eq = (field: keyof EquipmentDetails) => equipment[field];
  const setEq = (field: keyof EquipmentDetails, value: string) =>
    setEquipment(prev => ({ ...prev, [field]: value }));

  // ── Photo handling ────────────────────────────────────────────────────────────

  const addPhotos = (files: FileList | null) => {
    if (!files) return;
    const newPhotos: UploadedPhoto[] = [];
    Array.from(files).slice(0, 5 - photos.length).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      newPhotos.push({ file, preview: URL.createObjectURL(file) });
    });
    setPhotos(prev => [...prev, ...newPhotos].slice(0, 5));
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    addPhotos(e.dataTransfer.files);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos]);

  // ── Gemini Vision AI ──────────────────────────────────────────────────────────

  const runAiAnalysis = async () => {
    if (photos.length === 0) {
      toast.error('Please upload at least one photo first');
      return;
    }
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      toast.error('Gemini API key not configured. Add VITE_GEMINI_API_KEY to your .env file.');
      return;
    }

    setAiLoading(true);
    try {
      const base64 = await fileToBase64(photos[0].file);
      const mimeType = photos[0].file.type;

      const prompt = `You are an industrial equipment analysis assistant. Look at this image and identify the equipment.
Return ONLY a valid JSON object (no markdown, no code block) with these exact keys:
{
  "equipmentType": "one of: fan, pump, slider, valve, vehicle_bearing, or unknown",
  "fanId": "id_00|id_02|id_04|id_06 or empty",
  "fanInstallLocation": "install location or empty",
  "pumpType": "pump type or empty",
  "pumpBrand": "pump brand or empty",
  "sliderType": "slider/rail type or empty",
  "valveType": "valve type or empty",
  "valveMaterial": "valve material or empty",
  "bearingType": "bearing type or empty",
  "vehicleType": "Car|Van|Truck|Bus|Three-Wheeler|Motorcycle|SUV / Jeep or empty",
  "vehicleBrand": "vehicle brand or empty",
  "additionalInfo": "any other relevant info in 1 sentence"
}`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: prompt },
                { inlineData: { mimeType, data: base64 } },
              ],
            }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 512 },
          }),
        }
      );

      if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);
      const data = await res.json();
      const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Parse JSON from response (strip any markdown wrapper)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Could not parse AI response');
      const parsed = JSON.parse(jsonMatch[0]);

      const filled: string[] = [];

      // Apply detected values
      if (parsed.equipmentType && parsed.equipmentType !== 'unknown') {
        const map: Record<string, RepairCategory> = {
          fan: 'fan', pump: 'pump', slider: 'slider',
          valve: 'valve', vehicle_bearing: 'vehicle_bearing',
        };
        if (map[parsed.equipmentType]) {
          setCategory(map[parsed.equipmentType]);
          filled.push('category');
        }
      }

      setEquipment(prev => {
        const next = { ...prev };
        const applyField = (field: keyof EquipmentDetails, val?: string) => {
          if (val && val.trim()) { next[field] = val.trim(); filled.push(field); }
        };
        applyField('fanId', parsed.fanId);
        applyField('fanInstallLocation', parsed.fanInstallLocation);
        applyField('pumpType', parsed.pumpType);
        applyField('pumpBrand', parsed.pumpBrand);
        applyField('sliderType', parsed.sliderType);
        applyField('valveType', parsed.valveType);
        applyField('valveMaterial', parsed.valveMaterial);
        applyField('bearingType', parsed.bearingType);
        applyField('vehicleType', parsed.vehicleType);
        applyField('vehicleBrand', parsed.vehicleBrand);
        return next;
      });

      if (parsed.additionalInfo && !description) {
        setDescription(parsed.additionalInfo);
        filled.push('description');
      }

      setAiFields(filled);
      setPhotos(prev => prev.map((p, i) => i === 0 ? { ...p, aiAnalyzed: true } : p));
      toast.success(`✨ AI detected ${filled.length} field(s) from your photo!`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error('AI analysis error:', err);
      toast.error('AI analysis failed. Please fill in details manually.');
    } finally {
      setAiLoading(false);
    }
  };

  // ── Build description string ─────────────────────────────────────────────────

  const buildDescription = (): string => {
    const lines: string[] = [];
    // Always include customer name as first line — used as fallback display in company dashboard
    lines.push(`Customer Name: ${customerName.trim() || 'Not provided'}`);
    if (description) lines.push(`Issue: ${description}`);
    if (category === 'fan') {
      if (eq('fanId')) lines.push(`Machine ID: ${eq('fanId')}`);
      if (eq('fanInstallLocation')) lines.push(`Install Location: ${eq('fanInstallLocation')}`);
    }
    if (category === 'pump') {
      if (eq('pumpType')) lines.push(`Pump Type: ${eq('pumpType')}`);
      if (eq('pumpBrand')) lines.push(`Brand: ${eq('pumpBrand')}`);
    }
    if (category === 'slider') {
      if (eq('sliderType')) lines.push(`Slide Rail Type: ${eq('sliderType')}`);
      if (eq('sliderLength')) lines.push(`Rail Length: ${eq('sliderLength')}`);
    }
    if (category === 'valve') {
      if (eq('valveType')) lines.push(`Valve Type: ${eq('valveType')}`);
      if (eq('valveMaterial')) lines.push(`Material: ${eq('valveMaterial')}`);
    }
    if (category === 'vehicle_bearing') {
      if (eq('bearingType')) lines.push(`Bearing Type: ${eq('bearingType')}`);
      if (eq('vehicleType')) lines.push(`Vehicle Type: ${eq('vehicleType')}`);
      if (eq('vehicleBrand')) lines.push(`Vehicle Brand: ${eq('vehicleBrand')}`);
    }
    lines.push(`Customer Address: ${customerAddress || 'Not provided'}`);
    lines.push(`Customer Phone: ${customerPhone || 'Not provided'}`);
    return lines.join('\n');
  };

  // ── Submit ────────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!user) { toast.error('Not logged in'); return; }
    setSubmitting(true);
    try {
      // Upload photos to Supabase Storage
      const photoUrls: string[] = [];
      for (const photo of photos) {
        try {
          const ext = photo.file.name.split('.').pop();
          const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
          const { error: uploadError } = await supabase.storage
            .from('repair-photos')
            .upload(path, photo.file, { contentType: photo.file.type });
          if (!uploadError) {
            const { data: urlData } = supabase.storage.from('repair-photos').getPublicUrl(path);
            if (urlData?.publicUrl) photoUrls.push(urlData.publicUrl);
          }
        } catch {
          // skip failed photo uploads silently
        }
      }

      const machineTypeLabel = repairCategories.find(c => c.id === category)?.label || category;
      const brandLabel =
      category === 'fan'             ? eq('fanId') :
      category === 'pump'            ? eq('pumpBrand') :
      category === 'slider'          ? eq('sliderType') :
      category === 'valve'           ? eq('valveType') :
      category === 'vehicle_bearing' ? eq('bearingType') : '';

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('repair_requests')
        .insert({
          user_id: user.id,
          company_id: provider.id,
          machine_type: machineTypeLabel,
          brand: brandLabel || 'Not specified',
          description: buildDescription(),
          status: 'pending',
          ...(photoUrls.length > 0 ? { photo_urls: photoUrls } : {}),
        });

      if (error) {
        // If photo_urls column doesn't exist, retry without it
        if (error.message?.includes('photo_urls')) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error: retryError } = await (supabase as any)
            .from('repair_requests')
            .insert({
              user_id: user.id,
              company_id: provider.id,
              machine_type: machineTypeLabel,
              brand: brandLabel || 'Not specified',
              description: buildDescription() + (photoUrls.length > 0 ? `\nPhotos: ${photoUrls.join(', ')}` : ''),
              status: 'pending',
            });
          if (retryError) throw retryError;
        } else {
          throw error;
        }
      }

      toast.success('✅ Repair request sent successfully!');
      onSuccess();
      onClose();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error('Submit error:', err);
      toast.error(`Failed to send request: ${err.message || 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Rendered sub-option panels ────────────────────────────────────────────────

  const renderEquipmentSubOptions = () => {
    if (!category) return null;

    const aiClass = (field: string) =>
      aiFields.includes(field)
        ? 'ring-2 ring-yellow-400/60 bg-yellow-400/5'
        : '';

    return (
      <motion.div
        key={category}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4 pt-2"
      >
        {/* ── Fan ── */}
        {category === 'fan' && (
          <>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Machine ID</Label>
              <Select value={eq('fanId')} onValueChange={v => setEq('fanId', v)}>
                <SelectTrigger className={aiClass('fanId')}>
                  <SelectValue placeholder="Select machine ID…" />
                </SelectTrigger>
                <SelectContent className="z-[10000]">
                  {fanIds.map(id => <SelectItem key={id} value={id}>{id}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Install Location</Label>
              <Select value={eq('fanInstallLocation')} onValueChange={v => setEq('fanInstallLocation', v)}>
                <SelectTrigger className={aiClass('fanInstallLocation')}>
                  <SelectValue placeholder="Select location…" />
                </SelectTrigger>
                <SelectContent className="z-[10000]">
                  {fanInstallLocations.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {/* ── Pump ── */}
        {category === 'pump' && (
          <>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Pump Type</Label>
              <Select value={eq('pumpType')} onValueChange={v => setEq('pumpType', v)}>
                <SelectTrigger className={aiClass('pumpType')}>
                  <SelectValue placeholder="Select pump type…" />
                </SelectTrigger>
                <SelectContent className="z-[10000]">
                  {pumpTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Brand / Manufacturer</Label>
              <Input
                placeholder="e.g. Grundfos, Wilo, Kirloskar…"
                value={eq('pumpBrand')}
                onChange={e => setEq('pumpBrand', e.target.value)}
                className={aiClass('pumpBrand')}
              />
            </div>
          </>
        )}

        {/* ── Slider / Slide Rail ── */}
        {category === 'slider' && (
          <>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Slide Rail Type</Label>
              <Select value={eq('sliderType')} onValueChange={v => setEq('sliderType', v)}>
                <SelectTrigger className={aiClass('sliderType')}>
                  <SelectValue placeholder="Select type…" />
                </SelectTrigger>
                <SelectContent className="z-[10000]">
                  {sliderTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Rail Length</Label>
              <Select value={eq('sliderLength')} onValueChange={v => setEq('sliderLength', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select length range…" />
                </SelectTrigger>
                <SelectContent className="z-[10000]">
                  {sliderLengths.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {/* ── Valve ── */}
        {category === 'valve' && (
          <>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Valve Type</Label>
              <Select value={eq('valveType')} onValueChange={v => setEq('valveType', v)}>
                <SelectTrigger className={aiClass('valveType')}>
                  <SelectValue placeholder="Select valve type…" />
                </SelectTrigger>
                <SelectContent className="z-[10000]">
                  {valveTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Valve Material</Label>
              <Select value={eq('valveMaterial')} onValueChange={v => setEq('valveMaterial', v)}>
                <SelectTrigger className={aiClass('valveMaterial')}>
                  <SelectValue placeholder="Select material…" />
                </SelectTrigger>
                <SelectContent className="z-[10000]">
                  {valveMaterials.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {/* ── Vehicle Bearing (placeholder) ── */}
        {category === 'vehicle_bearing' && (
          <>
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-xs text-amber-400 font-medium flex items-center gap-2">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                Vehicle Bearing ML model is coming soon. Please describe the issue manually below.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Bearing Type</Label>
              <Select value={eq('bearingType')} onValueChange={v => setEq('bearingType', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select bearing type…" />
                </SelectTrigger>
                <SelectContent className="z-[10000]">
                  {bearingTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Vehicle Type</Label>
                <Select value={eq('vehicleType')} onValueChange={v => setEq('vehicleType', v)}>
                  <SelectTrigger className={aiClass('vehicleType')}>
                    <SelectValue placeholder="Type…" />
                  </SelectTrigger>
                  <SelectContent className="z-[10000]">
                    {vehicleTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Vehicle Brand</Label>
                <Select value={eq('vehicleBrand')} onValueChange={v => setEq('vehicleBrand', v)}>
                  <SelectTrigger className={aiClass('vehicleBrand')}>
                    <SelectValue placeholder="Brand…" />
                  </SelectTrigger>
                  <SelectContent className="z-[10000]">
                    {vehicleBrands.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </>
        )}

        {/* Issue Description */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Issue Description</Label>
          <textarea
            rows={3}
            placeholder="Describe the problem or symptoms you are experiencing…"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className={`flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 resize-none ${aiClass('description')}`}
          />
        </div>

        {aiFields.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-yellow-500 bg-yellow-500/10 rounded-lg px-3 py-2 border border-yellow-500/20">
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            <span>{aiFields.length} field(s) auto-filled by AI — review and edit as needed.</span>
          </div>
        )}
      </motion.div>
    );
  };

  // ── Main render ───────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 border-b border-border/50">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
              <Wrench className="h-5 w-5 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-foreground">Request Repair</h2>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 truncate">
                <Building2 className="h-3 w-3 shrink-0" />
                {provider.name}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mt-4">
            {[1, 2, 3].map(s => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all ${
                  step === s
                    ? 'bg-accent text-accent-foreground shadow-lg shadow-accent/30'
                    : step > s
                    ? 'bg-accent/20 text-accent'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {step > s ? <CheckCircle className="h-3.5 w-3.5" /> : s}
                </div>
                <span className={`text-[10px] font-medium hidden sm:block ${step === s ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {s === 1 ? 'Your Details' : s === 2 ? 'Equipment' : 'Photos & AI'}
                </span>
                {s < 3 && <div className={`flex-1 h-0.5 rounded-full transition-all ${step > s ? 'bg-accent/50' : 'bg-muted'}`} />}
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 max-h-[55vh] overflow-y-auto custom-scrollbar">
          <AnimatePresence mode="wait">
            {/* ── Step 1 ── */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <p className="text-sm text-muted-foreground">
                  Confirm your contact details. The service provider will use these to reach you.
                </p>

                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-sm font-medium">
                    <User className="h-3.5 w-3.5 text-accent" />
                    Full Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="Your full name"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    id="repair-customer-name"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-sm font-medium">
                    <MapPin className="h-3.5 w-3.5 text-accent" />
                    Address / Location
                  </Label>
                  <Input
                    placeholder="e.g. 123 Kandy Rd, Peradeniya"
                    value={customerAddress}
                    onChange={e => setCustomerAddress(e.target.value)}
                    id="repair-customer-address"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-sm font-medium">
                    <Phone className="h-3.5 w-3.5 text-accent" />
                    Phone Number
                  </Label>
                  <Input
                    placeholder="e.g. 077 123 4567"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    id="repair-customer-phone"
                    type="tel"
                  />
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="text-xs text-muted-foreground flex items-start gap-2">
                    <AlertCircle className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
                    Your request will be sent to <strong className="text-foreground">{provider.name}</strong> at {provider.address}.
                  </p>
                </div>
              </motion.div>
            )}

            {/* ── Step 2 ── */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <p className="text-sm text-muted-foreground">
                  Select the type of equipment that needs repair.
                </p>

                {/* Category grid */}
                <div className="grid grid-cols-3 gap-2">
                  {repairCategories.map(cat => {
                    const Icon = cat.icon;
                    const isSelected = category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        id={`repair-cat-${cat.id}`}
                        onClick={() => setCategory(cat.id as RepairCategory)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-center transition-all duration-200 ${
                          isSelected
                            ? 'border-accent bg-accent/10 shadow-md shadow-accent/20'
                            : 'border-border bg-gradient-to-br hover:border-accent/40 hover:bg-muted/50'
                        } ${cat.color}`}
                      >
                        <Icon className={`h-5 w-5 ${isSelected ? 'text-accent' : 'text-muted-foreground'}`} />
                        <span className={`text-[10px] font-semibold leading-tight ${isSelected ? 'text-accent' : 'text-muted-foreground'}`}>
                          {cat.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Sub-options */}
                <AnimatePresence mode="wait">
                  {renderEquipmentSubOptions()}
                </AnimatePresence>
              </motion.div>
            )}

            {/* ── Step 3 ── */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Attach photos of the equipment (optional, up to 5).
                  </p>
                  <span className="text-xs text-muted-foreground">{photos.length}/5</span>
                </div>

                {/* Drop zone */}
                <div
                  ref={dropRef}
                  onDrop={handleDrop}
                  onDragOver={e => e.preventDefault()}
                  onClick={() => photos.length < 5 && fileInputRef.current?.click()}
                  className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
                    photos.length >= 5
                      ? 'border-border opacity-50 cursor-not-allowed'
                      : 'border-border hover:border-accent hover:bg-accent/5'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={e => addPhotos(e.target.files)}
                    id="repair-photo-upload"
                  />
                  <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-medium text-foreground">
                    {photos.length >= 5 ? 'Maximum photos reached' : 'Drop photos here or click to browse'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WEBP up to 10MB each</p>
                </div>

                {/* Photo thumbnails */}
                {photos.length > 0 && (
                  <div className="grid grid-cols-5 gap-2">
                    {photos.map((photo, i) => (
                      <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-border">
                        <img src={photo.preview} alt="" className="w-full h-full object-cover" />
                        {photo.aiAnalyzed && (
                          <div className="absolute top-1 left-1">
                            <div className="w-4 h-4 rounded-full bg-yellow-400 flex items-center justify-center">
                              <Sparkles className="h-2.5 w-2.5 text-yellow-900" />
                            </div>
                          </div>
                        )}
                        <button
                          onClick={() => removePhoto(i)}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        >
                          <Trash2 className="h-4 w-4 text-white" />
                        </button>
                      </div>
                    ))}
                    {photos.length < 5 && (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-accent flex items-center justify-center transition-colors"
                      >
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                )}

                {/* AI Button */}
                <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-yellow-500" />
                    <p className="text-sm font-semibold text-foreground">AI Auto-Fill from Photo</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Upload a photo of your equipment and our AI will automatically detect the type, brand, and model — saving you time.
                  </p>
                  <Button
                    id="repair-ai-analyze"
                    variant="outline"
                    size="sm"
                    className="w-full border-yellow-500/40 text-yellow-600 hover:bg-yellow-500/10 hover:text-yellow-600"
                    onClick={runAiAnalysis}
                    disabled={aiLoading || photos.length === 0 || !import.meta.env.VITE_GEMINI_API_KEY}
                  >
                    {aiLoading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                        Analyzing with AI…
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5 mr-2" />
                        {!import.meta.env.VITE_GEMINI_API_KEY
                          ? 'AI Key Not Configured'
                          : photos.length === 0
                          ? 'Upload a photo first'
                          : '✨ Auto-detect Equipment from Photo'}
                      </>
                    )}
                  </Button>
                  {!import.meta.env.VITE_GEMINI_API_KEY && (
                    <p className="text-[10px] text-muted-foreground text-center">
                      Add <code className="bg-muted px-1 rounded">VITE_GEMINI_API_KEY</code> to your .env to enable AI
                    </p>
                  )}
                </div>

                {/* Summary */}
                <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Request Summary</p>
                  <div className="grid grid-cols-2 gap-y-1.5 gap-x-4 text-xs">
                    <span className="text-muted-foreground">Provider</span>
                    <span className="font-medium text-foreground truncate">{provider.name}</span>
                    <span className="text-muted-foreground">Customer</span>
                    <span className="font-medium text-foreground truncate">{customerName}</span>
                    <span className="text-muted-foreground">Equipment</span>
                    <span className="font-medium text-foreground">
                      {repairCategories.find(c => c.id === category)?.label || '—'}
                    </span>
                    {photos.length > 0 && (
                      <>
                        <span className="text-muted-foreground">Photos</span>
                        <span className="font-medium text-foreground">{photos.length} attached</span>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border/50 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={step === 1 ? onClose : () => setStep(s => s - 1)}
            disabled={submitting}
            id="repair-modal-back"
          >
            {step === 1 ? (
              <><X className="h-4 w-4 mr-1.5" />Cancel</>
            ) : (
              <><ChevronLeft className="h-4 w-4 mr-1.5" />Back</>
            )}
          </Button>

          {step < 3 ? (
            <Button
              variant="accent"
              size="sm"
              id={`repair-modal-next-${step}`}
              onClick={() => setStep(s => s + 1)}
              disabled={step === 1 ? !step1Valid : !step2Valid}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1.5" />
            </Button>
          ) : (
            <Button
              variant="accent"
              size="sm"
              id="repair-modal-submit"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending…</>
              ) : (
                <><CheckCircle className="h-4 w-4 mr-2" />Send Request</>
              )}
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
