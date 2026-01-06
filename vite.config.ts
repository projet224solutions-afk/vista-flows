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
          // Vendor dependencies - OPTIMISÉ POUR RÉDUIRE TBT
          if (id.includes('node_modules')) {
            // Core React - séparer pour cache optimal
            if (id.includes('react-dom')) return 'vendor-react-dom';
            if (id.includes('react-router')) return 'vendor-router';
            if (id.includes('/react/') || id.includes('\\react\\')) return 'vendor-react';
            
            // UI Libraries - SÉPARER RADIX PAR COMPOSANT (lazy load)
            if (id.includes('@radix-ui')) {
              if (id.includes('dialog')) return 'ui-dialog';
              if (id.includes('dropdown')) return 'ui-dropdown';
              if (id.includes('select')) return 'ui-select';
              if (id.includes('popover')) return 'ui-popover';
              if (id.includes('accordion')) return 'ui-accordion';
              return 'ui-radix-common';
            }
            
            // Icônes - lazy load
            if (id.includes('lucide-react')) return 'vendor-icons';
            
            // Animations - SÉPARÉ (lourd, 681ms TBT)
            if (id.includes('framer-motion')) return 'vendor-motion';
            
            // Backend - CRITIQUE mais peut être différé
            if (id.includes('@supabase')) return 'vendor-supabase';
            if (id.includes('@tanstack')) return 'vendor-tanstack';
            
            // Stripe - LAZY LOAD (seulement pages paiement)
            if (id.includes('@stripe')) return 'vendor-stripe';
            
            // Charts - LAZY LOAD (rarement utilisé au démarrage)
            if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';
            
            // Forms - utilisé partout
            if (id.match(/react-hook-form|@hookform|zod/)) return 'vendor-forms';
            
            // PDF - LAZY LOAD (utilisé rarement)
            if (id.match(/jspdf|html2canvas|qrcode/)) return 'vendor-pdf';
            
            // Maps - LAZY LOAD
            if (id.includes('mapbox')) return 'vendor-maps';
            
            // Agora - LAZY LOAD (communication)
            if (id.includes('agora')) return 'vendor-agora';
            
            // Firebase - utilisé partout
            if (id.includes('firebase')) return 'vendor-firebase';
            
            // Utilities - petit, garder ensemble
            if (id.match(/date-fns|clsx|tailwind-merge|class-variance/)) return 'vendor-utils';
            
            // Node_modules restants
            return 'vendor-misc';
          }
          
          // Application code - OPTIMISÉ POUR LAZY LOADING
          
          // Pages dashboards - un chunk par dashboard
          if (id.includes('src/pages/')) {
            if (id.includes('PDG')) return 'page-pdg';
            if (id.includes('Vendeur')) return 'page-vendeur';
            if (id.includes('Bureau') || id.includes('Syndicat')) return 'page-bureau';
            if (id.includes('Agent')) return 'page-agent';
            if (id.includes('Livreur') || id.includes('Delivery')) return 'page-livreur';
            if (id.includes('TaxiMoto') || id.includes('Taxi')) return 'page-taxi';
            if (id.includes('Client')) return 'page-client';
            if (id.includes('Marketplace') || id.includes('Product')) return 'page-marketplace';
          }
          
          // Composants - par feature
          if (id.includes('src/components/')) {
            if (id.includes('/vendor/')) {
              if (id.match(/Product|Inventory|Stock/)) return 'comp-vendor-products';
              if (id.match(/Order|Delivery|Shipment/)) return 'comp-vendor-orders';
              if (id.match(/Quote|Invoice|Contract/)) return 'comp-vendor-docs';
              if (id.match(/Analytics|Report|Stats/)) return 'comp-vendor-analytics';
              return 'comp-vendor';
            }
            if (id.includes('/pdg/')) return 'comp-pdg';
            if (id.includes('/agent/')) return 'comp-agent';
            if (id.includes('/bureau/')) return 'comp-bureau';
            if (id.includes('/delivery/')) return 'comp-delivery';
            if (id.includes('/taxi/')) return 'comp-taxi';
            if (id.includes('/communication/')) return 'comp-communication';
            if (id.includes('/wallet/') || id.includes('/payment/')) return 'comp-wallet';
            if (id.includes('/ui/')) return 'comp-ui';
          }
          
          // Hooks et Contexts
          if (id.includes('src/hooks/')) return 'hooks';
          if (id.includes('src/contexts/')) return 'contexts';
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn'],
        passes: 2
      },
      mangle: {
        safari10: true
      }
    }
  }
}));
