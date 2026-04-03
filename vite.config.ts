import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import legacy from "@vitejs/plugin-legacy";
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
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
        '/edge-functions': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
        '/health': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
    preview: {
      port: 4173,
      host: true,
    },
    plugins: [
      react(),
      legacy({
        targets: [
          "defaults",
          "Android >= 8",
          "iOS >= 12",
        ],
        modernPolyfills: true,
      }),
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
          /**
           * Manual chunks strategy — 224SOLUTIONS
           * 
           * Heavy libs (agora-rtc ~2MB, agora-rtm ~600KB, mapbox ~1.6MB) are
           * dynamically imported in the source code, so they naturally split
           * into their own async chunks. The manualChunks below only handle
           * libraries that ARE statically imported somewhere and need grouping.
           */
          manualChunks(id: string) {
            if (!id.includes('node_modules')) return;

            // Agora — split RTC and RTM into separate lazy chunks
            if (id.includes('agora-rtc-sdk-ng')) return 'vendor-agora-rtc';
            if (id.includes('agora-rtm'))        return 'vendor-agora-rtm';

            // Maps — loaded only by map components (already lazy)
            if (id.includes('mapbox'))           return 'vendor-maps';

            // Core React ecosystem
            if (id.includes('react-dom'))        return 'vendor-react-dom';
            if (id.includes('react-router'))     return 'vendor-router';
            if (id.includes('/react/') || id.includes('\\react\\')) return 'vendor-react';

            // UI
            if (id.includes('@radix-ui'))        return 'vendor-radix';
            if (id.includes('lucide-react'))     return 'vendor-icons';
            if (id.includes('framer-motion'))    return 'vendor-motion';

            // Backend / data
            if (id.includes('@supabase'))        return 'vendor-supabase';
            if (id.includes('@tanstack'))        return 'vendor-tanstack';

            // Payment
            if (id.includes('@stripe') || id.includes('stripe')) return 'vendor-stripe';

            // Charts
            if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';

            // Firebase
            if (id.includes('firebase'))         return 'vendor-firebase';

            // PDF generation
            if (id.includes('jspdf') || id.includes('html2canvas')) return 'vendor-pdf';

            // Misc
            if (id.includes('qrcode'))           return 'vendor-qrcode';
            if (id.includes('date-fns'))         return 'vendor-datefns';
            if (id.includes('zod'))              return 'vendor-zod';
          }
        },
        // Suppress eval warning from agora-rtm (unavoidable in their bundled code)
        onwarn(warning, warn) {
          // Some plugins still inject legacy Rollup output option `minify`.
          // Ignore this non-blocking warning to keep build logs clean.
          if (warning.code === 'UNKNOWN_OPTION' && /Unknown output options: minify/.test(warning.message)) return;
          if (warning.code === 'EVAL' && warning.id?.includes('agora-rtm')) return;
          warn(warning);
        },
      },
      chunkSizeWarningLimit: 3000,
      sourcemap: false,
    }
  };
});
