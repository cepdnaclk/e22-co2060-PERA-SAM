import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

if (typeof window !== 'undefined') {
  (window as any).L = L;
}

import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
