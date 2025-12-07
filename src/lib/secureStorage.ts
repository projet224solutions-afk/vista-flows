/**
 * 🔐 UTILITAIRE CHIFFREMENT LOCALSTORAGE
 * Chiffre/déchiffre données sensibles avant stockage localStorage
 * Utilise Web Crypto API (AES-GCM)
 */

export class SecureStorage {
  private static ENCRYPTION_KEY_NAME = 'app_encryption_key';
  private static algorithm = 'AES-GCM';

  /**
   * Génère ou récupère la clé de chiffrement
   */
  private static async getEncryptionKey(): Promise<CryptoKey> {
    // Vérifier si une clé existe déjà dans sessionStorage
    const storedKey = sessionStorage.getItem(this.ENCRYPTION_KEY_NAME);
    
    if (storedKey) {
      // Importer la clé existante
      const keyData = JSON.parse(storedKey);
      return await crypto.subtle.importKey(
        'jwk',
        keyData,
        { name: this.algorithm, length: 256 },
        true,
        ['encrypt', 'decrypt']
      );
    }

    // Générer une nouvelle clé
    const key = await crypto.subtle.generateKey(
      { name: this.algorithm, length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    // Sauvegarder dans sessionStorage (perdue à la fermeture onglet)
    const exportedKey = await crypto.subtle.exportKey('jwk', key);
    sessionStorage.setItem(this.ENCRYPTION_KEY_NAME, JSON.stringify(exportedKey));

    return key;
  }

  /**
   * Chiffre des données
   */
  private static async encrypt(data: string): Promise<{ encrypted: string; iv: string }> {
    const key = await this.getEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(12)); // Vecteur d'initialisation

    const encodedData = new TextEncoder().encode(data);
    const encryptedData = await crypto.subtle.encrypt(
      { name: this.algorithm, iv },
      key,
      encodedData
    );

    return {
      encrypted: this.arrayBufferToBase64(encryptedData),
      iv: this.arrayBufferToBase64(iv)
    };
  }

  /**
   * Déchiffre des données
   */
  private static async decrypt(encrypted: string, iv: string): Promise<string> {
    try {
      const key = await this.getEncryptionKey();
      const encryptedData = this.base64ToArrayBuffer(encrypted);
      const ivData = this.base64ToArrayBuffer(iv);

      const decryptedData = await crypto.subtle.decrypt(
        { name: this.algorithm, iv: ivData },
        key,
        encryptedData
      );

      return new TextDecoder().decode(decryptedData);
    } catch (error) {
      console.error('❌ Erreur déchiffrement:', error);
      return ''; // Retourner vide si déchiffrement échoue
    }
  }

  /**
   * Convertit ArrayBuffer en Base64
   */
  private static arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convertit Base64 en ArrayBuffer
   */
  private static base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * ✅ API PUBLIQUE: Sauvegarde sécurisée dans localStorage
   */
  public static async setItem(key: string, value: any): Promise<void> {
    try {
      const jsonValue = JSON.stringify(value);
      const { encrypted, iv } = await this.encrypt(jsonValue);
      
      localStorage.setItem(key, JSON.stringify({ encrypted, iv }));
      console.log(`🔒 Donnée chiffrée sauvegardée: ${key}`);
    } catch (error) {
      console.error('❌ Erreur sauvegarde sécurisée:', error);
      // Fallback: sauvegarder en clair (moins sécurisé)
      localStorage.setItem(key, JSON.stringify(value));
    }
  }

  /**
   * ✅ API PUBLIQUE: Lecture sécurisée depuis localStorage
   */
  public static async getItem<T>(key: string): Promise<T | null> {
    try {
      const storedData = localStorage.getItem(key);
      if (!storedData) return null;

      const parsed = JSON.parse(storedData);
      
      // Vérifier si données chiffrées
      if (parsed.encrypted && parsed.iv) {
        const decrypted = await this.decrypt(parsed.encrypted, parsed.iv);
        return decrypted ? JSON.parse(decrypted) : null;
      }

      // Données non chiffrées (legacy)
      return parsed;
    } catch (error) {
      console.error('❌ Erreur lecture sécurisée:', error);
      return null;
    }
  }

  /**
   * ✅ API PUBLIQUE: Suppression
   */
  public static removeItem(key: string): void {
    localStorage.removeItem(key);
  }

  /**
   * ✅ API PUBLIQUE: Vider tout le localStorage sécurisé
   */
  public static clear(): void {
    localStorage.clear();
    sessionStorage.removeItem(this.ENCRYPTION_KEY_NAME);
  }
}
