/**
 * Plugin Vite pour injecter les informations de build
 * 224Solutions - Vista-Flows
 */

import type { Plugin } from 'vite';

function generateBuildId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `VF-${timestamp}-${random}`.toUpperCase();
}

export function buildInfoPlugin(): Plugin {
  const buildId = generateBuildId();
  const buildDate = new Date().toISOString();

  return {
    name: 'vite-plugin-build-info',
    config(config, { mode }) {
      return {
        define: {
          __BUILD_ID__: JSON.stringify(buildId),
          __BUILD_DATE__: JSON.stringify(buildDate),
          __BUILD_ENV__: JSON.stringify(mode)
        }
      };
    },
    transformIndexHtml(html) {
      // Ajouter un commentaire avec les infos de build
      const comment = `<!-- 224Solutions Vista-Flows | Build: ${buildId} | ${buildDate} -->`;
      return html.replace('<head>', `<head>\n    ${comment}`);
    }
  };
}

export default buildInfoPlugin;
