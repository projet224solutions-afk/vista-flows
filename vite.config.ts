import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Base URL absolue pour Vercel/Netlify
  base: '/',
  server: {
    host: "::",
    port: 8080,
    strictPort: false,
    open: false,
  },
  preview: {
    port: 4173,
    host: true,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Vendor dependencies
          if (id.includes('node_modules')) {
            // Core React ecosystem
            if (id.match(/react-dom/)) return 'vendor-react-dom';
            if (id.match(/react-router/)) return 'vendor-router';
            if (id.match(/\/react\//)) return 'vendor-react';
            
            // UI Libraries
            if (id.includes('@radix-ui')) return 'vendor-radix';
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (id.includes('framer-motion')) return 'vendor-motion';
            
            // Data & Backend
            if (id.includes('@supabase')) return 'vendor-supabase';
            if (id.includes('@tanstack')) return 'vendor-tanstack';
            
            // Charts & Visualization
            if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';
            
            // Forms & Validation
            if (id.match(/react-hook-form|@hookform|zod/)) return 'vendor-forms';
            
            // PDF & Documents
            if (id.match(/jspdf|html2canvas|qrcode/)) return 'vendor-pdf';
            
            // Maps
            if (id.includes('mapbox')) return 'vendor-maps';
            
            // Communication
            if (id.includes('agora')) return 'vendor-agora';
            
            // Firebase
            if (id.includes('firebase')) return 'vendor-firebase';
            
            // Utilities
            if (id.match(/date-fns|clsx|tailwind-merge|class-variance/)) return 'vendor-utils';
            
            // Remaining node_modules
            return 'vendor-misc';
          }
          
          // Application code splitting
          
          // Pages - split large dashboards
          if (id.includes('src/pages/')) {
            if (id.includes('PDGDashboard')) return 'page-pdg';
            if (id.includes('VendeurDashboard')) return 'page-vendeur';
            if (id.includes('BureauDashboard')) return 'page-bureau';
            if (id.includes('AgentDashboard')) return 'page-agent';
            if (id.includes('LivreurDashboard')) return 'page-livreur';
            if (id.includes('TaxiMoto')) return 'page-taxi';
            if (id.includes('Client')) return 'page-client';
          }
          
          // Components - split by feature
          if (id.includes('src/components/')) {
            if (id.includes('/vendor/')) {
              if (id.match(/Product|Inventory|Stock/)) return 'comp-vendor-products';
              if (id.match(/Order|Delivery|Shipment/)) return 'comp-vendor-orders';
              if (id.match(/Quote|Invoice|Contract/)) return 'comp-vendor-docs';
              if (id.match(/Analytics|Report|Stats/)) return 'comp-vendor-analytics';
              return 'comp-vendor-common';
            }
            if (id.includes('/pdg/')) return 'comp-pdg';
            if (id.includes('/agent/')) return 'comp-agent';
            if (id.includes('/bureau/')) return 'comp-bureau';
            if (id.includes('/delivery/')) return 'comp-delivery';
            if (id.includes('/taxi/')) return 'comp-taxi';
            if (id.includes('/communication/')) return 'comp-communication';
            if (id.includes('/wallet/')) return 'comp-wallet';
            if (id.includes('/ui/')) return 'comp-ui';
          }
          
          // Hooks
          if (id.includes('src/hooks/')) return 'hooks';
          
          // Contexts
          if (id.includes('src/contexts/')) return 'contexts';
        }
      }
    },
    chunkSizeWarningLimit: 1500,
    sourcemap: false,
    minify: 'esbuild'
  }
}));
