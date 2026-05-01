import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Filter,
  Search,
  Star,
  Phone,
  MessageSquare,
  Calendar,
  ChevronRight,
  Laptop,
  Server,
  Car,
  Settings,
  Wind,
  Factory,
  Navigation,
  RefreshCcw,
  Droplets
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from '@/lib/auth-context';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  ZoomControl
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';

// Fix Leaflet marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// TypeScript declaration for leaflet-routing-machine
declare module 'leaflet' {
  namespace Routing {
    function control(options: any): any;
  }
}

// Fix Leaflet marker icon issues for Vite
// In some environments, the default icons get mangled by the bundler
const DefaultIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const ActiveIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const UserIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Attach L to window to support plugins
if (typeof window !== 'undefined') {
  (window as any).L = L;
}

const serviceCategories = [
  { id: 'all', label: 'All Services', icon: Settings },
  { id: 'laptop', label: 'Laptop/PC', icon: Laptop },
  { id: 'server', label: 'Servers', icon: Server },
  { id: 'vehicle', label: 'Vehicles', icon: Car },
  { id: 'hvac', label: 'HVAC', icon: Wind },
  { id: 'pump', label: 'Pumps', icon: Droplets },
  { id: 'industrial', label: 'Industrial', icon: Factory },
];

interface ServiceProvider {
  id: string;
  name: string;
  address: string;
  rating: number;
  reviews: number;
  phone: string;
  categories: string[];
  distance: string;
  available: boolean;
  lat: number;
  lng: number;
}

// Routing component for path visualization (Temporarily disabled for debugging)
const RoutingEngine = ({ from, to }: { from: [number, number], to: [number, number] }) => {
  return null;
};

// Component to recenter map when selected provider changes
const RecenterMap = ({ lat, lng }: { lat: number; lng: number }) => {
  const map = useMap();
  const lastCoords = useRef<string>("");

  useEffect(() => {
    const coordKey = `${lat.toFixed(4)}-${lng.toFixed(4)}`;
    if (coordKey !== lastCoords.current) {
      console.log("Recentering map to:", lat, lng);
      map.setView([lat, lng], 14, { animate: true });
      lastCoords.current = coordKey;
    }
  }, [lat, lng, map]);
  return null;
};

// Only recenter once when user location is first found
const OneTimeRecenter = ({ lat, lng }: { lat: number; lng: number }) => {
  const map = useMap();
  const hasCentered = useRef(false);

  useEffect(() => {
    if (!hasCentered.current && lat && lng) {
      map.setView([lat, lng], 13);
      hasCentered.current = true;
    }
  }, [lat, lng, map]);
  return null;
};

export const MapPage = () => {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);


  // Fetch providers from Supabase
  useEffect(() => {
    const fetchProviders = async () => {
      setLoading(true);
      try {
        // Fetch all profiles and filter in JS to avoid Enum casting issues and RLS hidden rows
        const { data, error } = await (supabase as any)
          .from('profiles')
          .select('*');

        if (error) {
          console.error("Supabase fetch error:", error);
          toast.error("Failed to load service providers from database");
          throw error;
        }


        // Filter for companies in JS - more robust than DB-level filtering with Enums
        const companyProfiles = (data || []).filter(p => String(p.role).toLowerCase() === 'company');

        // Filter out current company user if applicable
        const filteredData = companyProfiles.filter(p => !user || p.id !== user.id);

        // Map data with fallbacks
        const mappedProviders: ServiceProvider[] = filteredData.map(p => {
          // If they are a company but missing lat/lng, provide a default so they show up!
          const lat = p.location_lat || 7.2525;
          const lng = p.location_lng || 80.5925;

          return {
            id: p.id,
            name: p.company_name || p.name || 'Service Provider',
            address: p.address || 'Address not listed',
            rating: 4.5 + (p.id.charCodeAt(0) % 10) / 20, // Deterministic random-looking rating
            reviews: (p.id.charCodeAt(1) % 100) + 10,
            phone: p.contact_numbers?.[0] || p.phone || 'N/A',
            categories: p.service_categories || ['Equipment'],
            distance: '---',
            available: true,
            lat,
            lng,
          };
        });

        setProviders(mappedProviders);
      } catch (err) {
        console.error('Critical Error in MapPage fetchProviders:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProviders();
  }, [user]);

  // Get user location with fallback (single snapshot)
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log("User location acquired:", position.coords);
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.warn("Geolocation failed or denied. Using default location (Peradeniya).", error.message);
          // Default to Sri Lanka / Peradeniya region
          setUserLocation([7.2525, 80.5925]);
          toast.info("Showing default location. Enable location for local services.");
        },
        { timeout: 10000, enableHighAccuracy: false }
      );
    } else {
      console.warn("Geolocation not supported by this browser.");
      setUserLocation([7.2525, 80.5925]);
    }
  }, []);

  // Calculate distances if user location is available
  const providersWithDistance = providers.map(p => {
    if (!userLocation) return p;

    // Simple Euclidean distance for demo (actually should use Haversine)
    const d = Math.sqrt(Math.pow(p.lat - userLocation[0], 2) + Math.pow(p.lng - userLocation[1], 2)) * 69; // rough mi conversion
    return {
      ...p,
      distance: `${d.toFixed(1)} mi`
    };
  });

  const filteredProviders = providersWithDistance.filter(provider => {
    const matchesCategory = selectedCategory === 'all' || provider.categories.includes(selectedCategory);
    const matchesSearch = provider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      provider.address.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getCategoryIcon = (categoryId: string) => {
    const category = serviceCategories.find(c => c.id === categoryId);
    return category?.icon || Settings;
  };

  const selectedProviderData = providers.find(p => p.id === selectedProvider);

  console.log("MapPage: Final Render Check", {
    hasProviders: providers.length > 0,
    hasFiltered: filteredProviders.length > 0,
    hasLocation: !!userLocation,
    selectedProvider
  });

  return (
    <div className="space-y-6 min-h-[500px]">
      <div id="debug-map-page" style={{ display: 'none' }}>Map page reached render phase</div>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Find Service Providers</h1>
          <p className="text-muted-foreground mt-1">
            Locate certified technicians and repair services near you
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-muted-foreground hover:text-accent"
            onClick={() => window.location.reload()}
          >
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <div className="text-sm px-3 py-1 bg-accent/10 text-accent rounded-full border border-accent/20 flex items-center gap-2">
            <Navigation className="h-3 w-3" />
            {userLocation ? "Location active" : "Location hidden"}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full md:w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by service" />
          </SelectTrigger>
          <SelectContent>
            {serviceCategories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                <span className="flex items-center gap-2">
                  <cat.icon className="h-4 w-4" />
                  {cat.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-2">
        {serviceCategories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedCategory === cat.id
              ? 'bg-accent text-accent-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
          >
            <cat.icon className="h-4 w-4" />
            {cat.label}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Map View */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="lg:col-span-8 glass-card rounded-2xl overflow-hidden h-[500px] lg:h-[650px] relative z-0"
        >
          <div id="map-parent-container" className="h-full w-full relative bg-muted/20">
            {loading && (
              <div className="absolute inset-0 z-[1002] flex items-center justify-center bg-background/50 backdrop-blur-[2px]">
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-accent"></div>
                  <p className="text-xs font-medium text-muted-foreground animate-pulse">Loading Map Data...</p>
                </div>
              </div>
            )}

            {!loading && providers.length === 0 && searchQuery === '' && selectedCategory === 'all' && (
              <div className="absolute inset-0 z-[1001] flex items-center justify-center bg-background/60 backdrop-blur-sm">
                <div className="bg-card p-6 rounded-xl shadow-xl border border-border text-center max-w-sm">
                  <MapPin className="h-10 w-10 text-accent mx-auto mb-3" />
                  <h3 className="text-lg font-bold">Registry Empty</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    No service providers with location data were found in the database.
                  </p>
                </div>
              </div>
            )}

            <MapContainer
              center={[7.2525, 80.5925]}
              zoom={13}
              style={{ height: '100%', width: '100%', minHeight: '400px' }}
              zoomControl={true}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* User Location Marker */}
              {userLocation && (
                <Marker position={userLocation} icon={UserIcon}>
                  <Popup>
                    <div className="text-center font-bold">You are here</div>
                  </Popup>
                </Marker>
              )}

              {/* Company Markers */}
              {filteredProviders.map(provider => (
                <Marker
                  key={provider.id}
                  position={[provider.lat, provider.lng]}
                  icon={selectedProvider === provider.id ? ActiveIcon : DefaultIcon}
                  eventHandlers={{
                    click: () => setSelectedProvider(provider.id),
                  }}
                >
                  <Popup>
                    <div className="p-1">
                      <h4 className="font-bold text-accent">{provider.name}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{provider.address}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {provider.categories.map(cat => (
                          <span key={cat} className="px-1.5 py-0.5 bg-accent/10 text-accent text-[8px] rounded uppercase font-bold">
                            {cat}
                          </span>
                        ))}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}

              <OneTimeRecenter lat={userLocation?.[0] || 7.2525} lng={userLocation?.[1] || 80.5925} />
              {selectedProviderData && <RecenterMap lat={selectedProviderData.lat} lng={selectedProviderData.lng} />}
            </MapContainer>
          </div>

          {/* Map Overlay Controls */}
          <div className="absolute bottom-6 left-6 z-[1000] bg-card/95 backdrop-blur-md shadow-2xl rounded-xl p-4 border border-border/50 max-w-[200px]">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Map Legend</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                <span className="text-xs font-medium text-foreground">You / Your Station</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                <span className="text-xs font-medium text-foreground">Service Provider</span>
              </div>
            </div>
          </div>

          <Button
            className="absolute top-6 left-6 z-[1000] shadow-xl"
            variant="secondary"
            onClick={() => setUserLocation(userLocation)}
          >
            <Navigation className="h-4 w-4 mr-2" />
            Recenter on Me
          </Button>
        </motion.div>

        {/* Provider List */}
        <div className="lg:col-span-4 flex flex-col gap-4 h-[500px] lg:h-[650px]">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <MapPin className="h-5 w-5 text-accent" />
              Providers ({filteredProviders.length})
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="glass-card rounded-xl p-5 animate-pulse">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-muted rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                </div>
              ))
            ) : filteredProviders.length === 0 ? (
              <div className="glass-card rounded-xl p-10 text-center">
                <Search className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground font-medium">No service providers found</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Ensure companies have registered with valid locations in the database</p>
              </div>
            ) : (
              filteredProviders.map((provider, index) => (
                <motion.div
                  key={provider.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => setSelectedProvider(provider.id)}
                  className={`glass-card rounded-xl p-5 cursor-pointer transition-all duration-300 hover:shadow-xl group border-2 ${selectedProvider === provider.id ? 'border-accent ring-1 ring-accent/20' : 'border-transparent'
                    }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors ${selectedProvider === provider.id ? 'bg-accent text-white' : 'bg-accent/10 text-accent group-hover:bg-accent group-hover:text-white'
                      }`}>
                      <MapPin className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-bold text-foreground truncate">{provider.name}</h3>
                        <div className="flex items-center gap-1 shrink-0">
                          <Star className="h-3 w-3 text-warning fill-warning" />
                          <span className="text-xs font-bold">{provider.rating.toFixed(1)}</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{provider.address}</p>

                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {provider.categories.slice(0, 2).map((catId) => {
                          const Icon = getCategoryIcon(catId);
                          return (
                            <span
                              key={catId}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted text-muted-foreground text-[10px] rounded-md font-medium"
                            >
                              <Icon className="h-2.5 w-2.5" />
                              {serviceCategories.find(c => c.id === catId)?.label}
                            </span>
                          );
                        })}
                        {provider.categories.length > 2 && (
                          <span className="text-[10px] text-muted-foreground items-center flex">+{provider.categories.length - 2} more</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {selectedProvider === provider.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-5 pt-5 border-t border-border/50 overflow-hidden"
                      >
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant="accent"
                            size="sm"
                            className="w-full"
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (!supabase.auth.getUser()) {
                                toast.error("Please login to request repair");
                                return;
                              }
                              try {
                                const { data: { user } } = await supabase.auth.getUser();
                                if (!user) throw new Error("No user");

                                const { error } = await (supabase as any)
                                  .from('repair_requests')
                                  .insert({
                                    user_id: user.id,
                                    company_id: provider.id,
                                    machine_type: provider.categories[0] || 'Equipment',
                                    brand: 'Inquiry',
                                    description: `Repair request via Map for ${provider.name}`,
                                    status: 'pending'
                                  });

                                if (error) throw error;
                                toast.success("Repair request sent successfully!");
                              } catch (err) {
                                console.error("Error creating request:", err);
                                toast.error("Failed to send request");
                              }
                            }}
                          >
                            <Calendar className="h-3.5 w-3.5 mr-2" />
                            Request Repair
                          </Button>
                          <Button variant="outline" size="sm" className="w-full">
                            <MessageSquare className="h-3.5 w-3.5 mr-2" />
                            Message
                          </Button>
                        </div>
                        <p className="text-[10px] text-center text-muted-foreground mt-3 flex items-center justify-center gap-1">
                          <Navigation className="h-2.5 w-2.5" />
                          Located {provider.distance} from you
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
