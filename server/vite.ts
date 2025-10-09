import { createServer as createViteServer, ViteDevServer } from "vite";
import type { Express } from "express";

export async function setupVite(app: Express): Promise<ViteDevServer> {
  const vite = await createViteServer({
    server: { 
      middlewareMode: true,
    },
    appType: "spa",
    root: process.cwd(),
  });

  app.use(vite.middlewares);
  
  return vite;
}
