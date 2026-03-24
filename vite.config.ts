import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { buildInfoPlugin } from "./vite-plugins/buildInfo";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  return {
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
      buildInfoPlugin(),
      mode === 'development' && componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
    },
    optimizeDeps: {
      include: ["@tanstack/react-query", "react", "react-dom"],
      exclude: [],
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes('node_modules')) {
              if (id.includes('react-dom')) return 'vendor-react-dom';
              if (id.includes('react-router')) return 'vendor-router';
              if (id.includes('/react/') || id.includes('\\react\\')) return 'vendor-react';
              if (id.includes('@radix-ui')) return 'vendor-radix';
              if (id.includes('lucide-react')) return 'vendor-icons';
              if (id.includes('framer-motion')) return 'vendor-motion';
              if (id.includes('@supabase')) return 'vendor-supabase';
              if (id.includes('@tanstack')) return 'vendor-tanstack';
              if (id.includes('@stripe')) return 'vendor-stripe';
              if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';
              if (id.includes('firebase')) return 'vendor-firebase';
              if (id.includes('mapbox')) return 'vendor-maps';
              if (id.includes('agora')) return 'vendor-agora';
            }
          }
        },
      },
      chunkSizeWarningLimit: 2000,
      sourcemap: false,
      // Use esbuild minification (faster, more reliable than terser)
      minify: 'esbuild',
    }
  };
});
