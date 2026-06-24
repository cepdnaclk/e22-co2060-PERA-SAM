import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ChevronRight,
  ChevronLeft,
  User,
  MapPin,
  Phone,
  Laptop,
  Car,
  Wind,
  Droplets,
  Server,
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
  | 'laptop'
  | 'vehicle'
  | 'hvac'
  | 'piping'
  | 'pump'
  | 'server'
  | '';

interface UploadedPhoto {
  file: File;
  preview: string;
  aiAnalyzed?: boolean;
}

interface EquipmentDetails {
  // Laptop
  laptopBrand: string;
  laptopModel: string;
  // Vehicle
  vehicleType: string;
  vehicleFuelType: string;
  vehicleBrand: string;
  vehicleModel: string;
  // HVAC
  hvacSystemType: string;
  hvacCapacity: string;
  hvacBrand: string;
  // Piping
  pipingType: string;
  pipingMaterial: string;
  // Pump
  pumpType: string;
  pumpBrand: string;
  // Server
  serverType: string;
  serverBrand: string;
  serverSpec: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const repairCategories = [
  { id: 'laptop', label: 'Laptop / PC', icon: Laptop, color: 'from-blue-500/20 to-blue-600/10' },
  { id: 'vehicle', label: 'Vehicle Parts', icon: Car, color: 'from-orange-500/20 to-orange-600/10' },
  { id: 'hvac', label: 'HVAC System', icon: Wind, color: 'from-cyan-500/20 to-cyan-600/10' },
  { id: 'piping', label: 'Piping / Plumbing', icon: Wrench, color: 'from-green-500/20 to-green-600/10' },
  { id: 'pump', label: 'Pumps', icon: Droplets, color: 'from-indigo-500/20 to-indigo-600/10' },
  { id: 'server', label: 'Server Machine', icon: Server, color: 'from-purple-500/20 to-purple-600/10' },
];

const laptopBrands = [
  'Dell', 'HP', 'Lenovo', 'Asus', 'Acer', 'Apple (Mac)',
  'Samsung', 'MSI', 'Toshiba', 'Huawei', 'LG Gram', 'Razer', 'Other',
];

const vehicleTypes = ['Car', 'Van', 'Truck', 'Bus', 'Three-Wheeler', 'Motorcycle', 'SUV / Jeep'];
const vehicleFuelTypes = ['Petrol', 'Diesel', 'Electric', 'Hybrid (Petrol-Electric)', 'CNG'];
const vehicleBrands = [
  'Toyota', 'Nissan', 'Honda', 'Suzuki', 'Mitsubishi', 'Mazda',
  'BMW', 'Mercedes-Benz', 'Hyundai', 'Kia', 'Ford', 'Subaru',
  'Isuzu', 'Tata', 'Bajaj', 'Hero', 'TVS', 'Other',
];

const hvacSystemTypes = [
  'Split Air Conditioner', 'Cassette AC', 'Central / Ducted AC',
  'Ductless Mini-Split', 'Chiller Unit', 'Rooftop Package Unit',
  'Ventilation / Exhaust Fan', 'Heat Pump', 'VRF / VRV System',
];
const hvacCapacities = [
  '0.75 Ton (9,000 BTU)', '1.0 Ton (12,000 BTU)', '1.5 Ton (18,000 BTU)',
  '2.0 Ton (24,000 BTU)', '2.5 Ton (30,000 BTU)', '3.0 Ton (36,000 BTU)',
  '4.0+ Ton (Industrial)',
];
const hvacBrands = [
  'Carrier', 'Daikin', 'Mitsubishi Electric', 'LG', 'Samsung',
  'Hitachi', 'Panasonic', 'Midea', 'Gree', 'Haier', 'York', 'Other',
];

const pipingTypes = [
  'Water Supply / Cold Water', 'Hot Water / Steam', 'Drainage / Sewage',
  'Gas Line', 'Industrial Process Piping', 'Irrigation / Garden',
];
const pipingMaterials = ['PVC', 'CPVC', 'Galvanized Steel', 'Copper', 'Cast Iron', 'HDPE', 'Other'];

const pumpTypes = [
  'Centrifugal Pump', 'Submersible Pump', 'Jet Pump', 'Sump Pump',
  'Booster Pump', 'Industrial High-Pressure Pump', 'Water Pump (Domestic)',
];

const serverTypes = ['Tower Server', 'Rack-Mount Server', 'Blade Server', 'Micro / Edge Server'];
const serverBrands = [
  'Dell EMC (PowerEdge)', 'HP Enterprise (ProLiant)', 'IBM', 'Cisco UCS',
  'Supermicro', 'Lenovo ThinkSystem', 'Fujitsu PRIMERGY', 'Other',
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
    laptopBrand: '', laptopModel: '',
    vehicleType: '', vehicleFuelType: '', vehicleBrand: '', vehicleModel: '',
    hvacSystemType: '', hvacCapacity: '', hvacBrand: '',
    pipingType: '', pipingMaterial: '',
    pumpType: '', pumpBrand: '',
    serverType: '', serverBrand: '', serverSpec: '',
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

      const prompt = `You are an equipment analysis assistant. Look at this image and identify the equipment.
Return ONLY a valid JSON object (no markdown, no code block) with these exact keys:
{
  "equipmentType": "one of: laptop, vehicle, hvac, piping, pump, server, or unknown",
  "laptopBrand": "brand name if laptop, else empty string",
  "laptopModel": "model/version if laptop, else empty string",
  "vehicleType": "Car|Van|Truck|Bus|Three-Wheeler|Motorcycle|SUV / Jeep or empty",
  "vehicleBrand": "vehicle brand or empty",
  "vehicleModel": "vehicle model or empty",
  "vehicleFuelType": "Petrol|Diesel|Electric|Hybrid (Petrol-Electric)|CNG or empty",
  "hvacSystemType": "HVAC type or empty",
  "hvacBrand": "HVAC brand or empty",
  "pumpType": "pump type or empty",
  "serverBrand": "server brand or empty",
  "serverType": "Tower Server|Rack-Mount Server|Blade Server|Micro / Edge Server or empty",
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
          laptop: 'laptop', vehicle: 'vehicle', hvac: 'hvac',
          piping: 'piping', pump: 'pump', server: 'server',
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
        applyField('laptopBrand', parsed.laptopBrand);
        applyField('laptopModel', parsed.laptopModel);
        applyField('vehicleType', parsed.vehicleType);
        applyField('vehicleBrand', parsed.vehicleBrand);
        applyField('vehicleModel', parsed.vehicleModel);
        applyField('vehicleFuelType', parsed.vehicleFuelType);
        applyField('hvacSystemType', parsed.hvacSystemType);
        applyField('hvacBrand', parsed.hvacBrand);
        applyField('pumpType', parsed.pumpType);
        applyField('serverBrand', parsed.serverBrand);
        applyField('serverType', parsed.serverType);
        return next;
      });

      if (parsed.additionalInfo && !description) {
        setDescription(parsed.additionalInfo);
        filled.push('description');
      }

      setAiFields(filled);
      setPhotos(prev => prev.map((p, i) => i === 0 ? { ...p, aiAnalyzed: true } : p));
      toast.success(`✨ AI detected ${filled.length} field(s) from your photo!`);
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
    if (description) lines.push(`Issue: ${description}`);
    if (category === 'laptop') {
      if (eq('laptopBrand')) lines.push(`Brand: ${eq('laptopBrand')}`);
      if (eq('laptopModel')) lines.push(`Model/Version: ${eq('laptopModel')}`);
    }
    if (category === 'vehicle') {
      if (eq('vehicleType')) lines.push(`Vehicle Type: ${eq('vehicleType')}`);
      if (eq('vehicleFuelType')) lines.push(`Fuel Type: ${eq('vehicleFuelType')}`);
      if (eq('vehicleBrand')) lines.push(`Brand: ${eq('vehicleBrand')}`);
      if (eq('vehicleModel')) lines.push(`Model: ${eq('vehicleModel')}`);
    }
    if (category === 'hvac') {
      if (eq('hvacSystemType')) lines.push(`HVAC Type: ${eq('hvacSystemType')}`);
      if (eq('hvacCapacity')) lines.push(`Capacity: ${eq('hvacCapacity')}`);
      if (eq('hvacBrand')) lines.push(`Brand: ${eq('hvacBrand')}`);
    }
    if (category === 'piping') {
      if (eq('pipingType')) lines.push(`Piping Type: ${eq('pipingType')}`);
      if (eq('pipingMaterial')) lines.push(`Material: ${eq('pipingMaterial')}`);
    }
    if (category === 'pump') {
      if (eq('pumpType')) lines.push(`Pump Type: ${eq('pumpType')}`);
      if (eq('pumpBrand')) lines.push(`Brand: ${eq('pumpBrand')}`);
    }
    if (category === 'server') {
      if (eq('serverType')) lines.push(`Server Type: ${eq('serverType')}`);
      if (eq('serverBrand')) lines.push(`Brand: ${eq('serverBrand')}`);
      if (eq('serverSpec')) lines.push(`Spec: ${eq('serverSpec')}`);
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
        category === 'laptop' ? eq('laptopBrand') :
        category === 'vehicle' ? eq('vehicleBrand') :
        category === 'hvac' ? eq('hvacBrand') :
        category === 'pump' ? eq('pumpBrand') :
        category === 'server' ? eq('serverBrand') : '';

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
        {/* ── Laptop ── */}
        {category === 'laptop' && (
          <>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Laptop Brand</Label>
              <Select value={eq('laptopBrand')} onValueChange={v => setEq('laptopBrand', v)}>
                <SelectTrigger className={aiClass('laptopBrand')}>
                  <SelectValue placeholder="Select brand…" />
                </SelectTrigger>
                <SelectContent className="z-[10000]">
                  {laptopBrands.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Model / Version</Label>
              <Input
                placeholder="e.g. Dell Inspiron 15, HP Pavilion 14…"
                value={eq('laptopModel')}
                onChange={e => setEq('laptopModel', e.target.value)}
                className={aiClass('laptopModel')}
              />
            </div>
          </>
        )}

        {/* ── Vehicle ── */}
        {category === 'vehicle' && (
          <>
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
                <Label className="text-sm font-medium">Fuel Type</Label>
                <Select value={eq('vehicleFuelType')} onValueChange={v => setEq('vehicleFuelType', v)}>
                  <SelectTrigger className={aiClass('vehicleFuelType')}>
                    <SelectValue placeholder="Fuel…" />
                  </SelectTrigger>
                  <SelectContent className="z-[10000]">
                    {vehicleFuelTypes.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Brand</Label>
              <Select value={eq('vehicleBrand')} onValueChange={v => setEq('vehicleBrand', v)}>
                <SelectTrigger className={aiClass('vehicleBrand')}>
                  <SelectValue placeholder="Select brand…" />
                </SelectTrigger>
                <SelectContent className="z-[10000]">
                  {vehicleBrands.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Model</Label>
              <Input
                placeholder="e.g. Toyota Corolla 2019, Suzuki Alto…"
                value={eq('vehicleModel')}
                onChange={e => setEq('vehicleModel', e.target.value)}
                className={aiClass('vehicleModel')}
              />
            </div>
          </>
        )}

        {/* ── HVAC ── */}
        {category === 'hvac' && (
          <>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">System Type</Label>
              <Select value={eq('hvacSystemType')} onValueChange={v => setEq('hvacSystemType', v)}>
                <SelectTrigger className={aiClass('hvacSystemType')}>
                  <SelectValue placeholder="Select system type…" />
                </SelectTrigger>
                <SelectContent className="z-[10000]">
                  {hvacSystemTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Capacity</Label>
                <Select value={eq('hvacCapacity')} onValueChange={v => setEq('hvacCapacity', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Capacity…" />
                  </SelectTrigger>
                  <SelectContent className="z-[10000]">
                    {hvacCapacities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Brand</Label>
                <Select value={eq('hvacBrand')} onValueChange={v => setEq('hvacBrand', v)}>
                  <SelectTrigger className={aiClass('hvacBrand')}>
                    <SelectValue placeholder="Brand…" />
                  </SelectTrigger>
                  <SelectContent className="z-[10000]">
                    {hvacBrands.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </>
        )}

        {/* ── Piping ── */}
        {category === 'piping' && (
          <>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Piping / Plumbing Type</Label>
              <Select value={eq('pipingType')} onValueChange={v => setEq('pipingType', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type…" />
                </SelectTrigger>
                <SelectContent className="z-[10000]">
                  {pipingTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Pipe Material</Label>
              <Select value={eq('pipingMaterial')} onValueChange={v => setEq('pipingMaterial', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select material…" />
                </SelectTrigger>
                <SelectContent className="z-[10000]">
                  {pipingMaterials.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
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

        {/* ── Server ── */}
        {category === 'server' && (
          <>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Server Type</Label>
              <Select value={eq('serverType')} onValueChange={v => setEq('serverType', v)}>
                <SelectTrigger className={aiClass('serverType')}>
                  <SelectValue placeholder="Select server type…" />
                </SelectTrigger>
                <SelectContent className="z-[10000]">
                  {serverTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Brand / Manufacturer</Label>
              <Select value={eq('serverBrand')} onValueChange={v => setEq('serverBrand', v)}>
                <SelectTrigger className={aiClass('serverBrand')}>
                  <SelectValue placeholder="Select brand…" />
                </SelectTrigger>
                <SelectContent className="z-[10000]">
                  {serverBrands.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Specs / Model No. (optional)</Label>
              <Input
                placeholder="e.g. PowerEdge R740, 2x Intel Xeon…"
                value={eq('serverSpec')}
                onChange={e => setEq('serverSpec', e.target.value)}
                className={aiClass('serverSpec')}
              />
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
