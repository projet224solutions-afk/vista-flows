import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Pour Hostinger: '/' si domaine racine, ou '/nom-dossier/' si sous-dossier
  base: process.env.VITE_BASE_URL || '/',
  server: {
    host: "::",
    port: 8080,
    strictPort: false,
    open: false,
  },
  plugins: [
    react(),
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
          if (id.includes('node_modules')) {
            if (id.match(/react|react-dom|react-router-dom/)) return 'vendor-react';
            if (id.includes('@radix-ui')) return 'vendor-radix';
            if (id.includes('@supabase/supabase-js')) return 'vendor-supabase';
            if (id.includes('recharts')) return 'vendor-charts';
            if (id.match(/react-hook-form|@hookform\/resolvers|zod/)) return 'vendor-forms';
            if (id.match(/date-fns|clsx|tailwind-merge/)) return 'vendor-utils';
          }
          // Split VendeurDashboard components into separate chunks
          if (id.includes('src/components/vendor/')) {
            if (id.includes('ProductManagement') || id.includes('InventoryManagement')) {
              return 'vendor-products';
            }
            if (id.includes('OrderManagement') || id.includes('DeliveryManagement')) {
              return 'vendor-orders';
            }
            if (id.includes('ClientManagement') || id.includes('AgentManagement')) {
              return 'vendor-management';
            }
            if (id.includes('Analytics') || id.includes('Reports')) {
              return 'vendor-analytics';
            }
            return 'vendor-common';
          }
          // Split BureauDashboard to reduce size
          if (id.includes('src/pages/BureauDashboard')) {
            return 'bureau-dashboard';
          }
          // Split large delivery panel
          if (id.includes('VendorDeliveriesPanel')) {
            return 'vendor-deliveries';
          }
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
}));
