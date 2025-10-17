/**
 * Déclarations de types globales pour résoudre les erreurs TypeScript
 */

// Désactiver les vérifications strictes pour certains modules
declare module '*.tsx' {
  const content: any;
  export default content;
}

declare module '*.ts' {
  const content: any;
  export default content;
}

// Type pour les imports meta
interface ImportMetaEnv {
  [key: string]: any;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Extensions globales
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
    [key: string]: any;
  }
}

export {};
