import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface GeoDetectionResult {
  country: string;
  currency: string;
  language: string;
  method: 'google-api' | 'sim-card' | 'geoip' | 'default';
  accuracy?: 'high' | 'medium' | 'low';
  metadata?: {
    latitude?: number;
    longitude?: number;
    city?: string;
    region?: string;
    ip?: string;
  };
}

/**
 * Hook pour détecter et enregistrer la géolocalisation de l'utilisateur
 * Utilise 4 méthodes par ordre de priorité:
 * 1. Google Geocoding API (GPS précis)
 * 2. SIM Card Info (opérateur mobile)
 * 3. GeoIP (adresse IP)
 * 4. Default (Guinée)
 */
export function useGeoRegistration() {
  const { user } = useAuth();
  const [detecting, setDetecting] = useState(false);
  const [detected, setDetected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GeoDetectionResult | null>(null);

  // Mapping pays → devise
  const COUNTRY_CURRENCY_MAP: Record<string, string> = {
    FR: 'EUR', DE: 'EUR', IT: 'EUR', ES: 'EUR', PT: 'EUR',
    BE: 'EUR', NL: 'EUR', AT: 'EUR', IE: 'EUR', GR: 'EUR',
    US: 'USD', GB: 'GBP',
    CI: 'XOF', SN: 'XOF', ML: 'XOF', BF: 'XOF', BJ: 'XOF', TG: 'XOF', NE: 'XOF',
    CM: 'XAF', GA: 'XAF', CG: 'XAF', TD: 'XAF', CF: 'XAF', GQ: 'XAF',
    SA: 'SAR', AE: 'AED', CN: 'CNY', JP: 'JPY', IN: 'INR',
    BR: 'BRL', ZA: 'ZAR', EG: 'EGP', NG: 'NGN', KE: 'KES',
    MA: 'MAD', DZ: 'DZD', TN: 'TND', GH: 'GHS',
    GN: 'GNF'
  };

  // Mapping pays → langue
  const COUNTRY_LANGUAGE_MAP: Record<string, string> = {
    US: 'en', GB: 'en', ES: 'es', DE: 'de', IT: 'it', PT: 'pt', BR: 'pt',
    CN: 'zh', JP: 'ja', KR: 'ko',
    SA: 'ar', AE: 'ar', EG: 'ar', MA: 'ar', DZ: 'ar', TN: 'ar',
    IN: 'hi', TR: 'tr', ID: 'id', TH: 'th', VN: 'vi', IR: 'fa',
    GN: 'fr', FR: 'fr', CI: 'fr', SN: 'fr', ML: 'fr'
  };

  /**
   * Méthode 1: Google Geocoding API (GPS précis)
   */
  const detectViaGPS = async (): Promise<GeoDetectionResult | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        console.log('GPS non disponible');
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            
            // Reverse geocoding avec Google API
            const response = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`
            );
            
            if (!response.ok) throw new Error('Google API error');
            
            const data = await response.json();
            if (data.results?.[0]) {
              const addressComponents = data.results[0].address_components;
              const countryComponent = addressComponents.find((c: any) => 
                c.types.includes('country')
              );
              
              if (countryComponent) {
                const country = countryComponent.short_name;
                const currency = COUNTRY_CURRENCY_MAP[country] || 'GNF';
                const language = COUNTRY_LANGUAGE_MAP[country] || 'fr';
                
                resolve({
                  country,
                  currency,
                  language,
                  method: 'google-api',
                  accuracy: 'high',
                  metadata: {
                    latitude,
                    longitude,
                    city: addressComponents.find((c: any) => c.types.includes('locality'))?.long_name,
                    region: addressComponents.find((c: any) => c.types.includes('administrative_area_level_1'))?.long_name
                  }
                });
                return;
              }
            }
            resolve(null);
          } catch (error) {
            console.error('Google geocoding error:', error);
            resolve(null);
          }
        },
        (error) => {
          console.log('GPS permission denied:', error);
          resolve(null);
        },
        { timeout: 5000 }
      );
    });
  };

  /**
   * Méthode 2: GeoIP (adresse IP)
   */
  const detectViaGeoIP = async (): Promise<GeoDetectionResult | null> => {
    try {
      const response = await fetch('https://ipapi.co/json/');
      if (!response.ok) throw new Error('GeoIP API error');
      
      const data = await response.json();
      if (data.country_code) {
        const country = data.country_code;
        const currency = COUNTRY_CURRENCY_MAP[country] || 'GNF';
        const language = COUNTRY_LANGUAGE_MAP[country] || 'fr';
        
        return {
          country,
          currency,
          language,
          method: 'geoip',
          accuracy: 'medium',
          metadata: {
            ip: data.ip,
            city: data.city,
            region: data.region
          }
        };
      }
      return null;
    } catch (error) {
      console.error('GeoIP detection error:', error);
      return null;
    }
  };

  /**
   * Méthode 3: Default (Guinée)
   */
  const detectViaDefault = (): GeoDetectionResult => {
    return {
      country: 'GN',
      currency: 'GNF',
      language: 'fr',
      method: 'default',
      accuracy: 'low'
    };
  };

  /**
   * Enregistrer la géolocalisation dans la base de données
   */
  const registerGeolocation = async (detection: GeoDetectionResult) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase.rpc('update_user_geolocation', {
        p_user_id: user.id,
        p_country: detection.country,
        p_currency: detection.currency,
        p_language: detection.language,
        p_method: detection.method,
        p_accuracy: detection.accuracy || null,
        p_metadata: detection.metadata || null
      });

      if (error) {
        console.error('Error registering geolocation:', error);
        throw error;
      }

      console.log('✅ Geolocation registered:', detection);
    } catch (err) {
      console.error('Failed to register geolocation:', err);
      throw err;
    }
  };

  /**
   * Détecter et enregistrer la géolocalisation
   */
  const detectAndRegister = async () => {
    if (!user?.id || detecting || detected) return;

    setDetecting(true);
    setError(null);

    try {
      // Vérifier si déjà détecté dans les 7 derniers jours
      const { data: profile } = await supabase
        .from('profiles')
        .select('detected_country, last_geo_update')
        .eq('id', user.id)
        .single();

      if (profile?.detected_country && profile?.last_geo_update) {
        const lastUpdate = new Date(profile.last_geo_update);
        const daysSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysSinceUpdate < 7) {
          console.log('Geolocation already detected recently, skipping');
          setDetected(true);
          setDetecting(false);
          return;
        }
      }

      // Essayer les méthodes par ordre de priorité
      let detection: GeoDetectionResult | null = null;

      // 1. GPS (le plus précis)
      console.log('🌍 Trying GPS detection...');
      detection = await detectViaGPS();
      
      // 2. GeoIP (fallback)
      if (!detection) {
        console.log('🌍 Trying GeoIP detection...');
        detection = await detectViaGeoIP();
      }

      // 3. Default (fallback final)
      if (!detection) {
        console.log('🌍 Using default location (Guinea)');
        detection = detectViaDefault();
      }

      // Enregistrer dans la DB
      await registerGeolocation(detection);
      
      setResult(detection);
      setDetected(true);
      
    } catch (err: any) {
      console.error('Geolocation detection failed:', err);
      setError(err.message || 'Failed to detect location');
      
      // En cas d'erreur, utiliser default
      const defaultDetection = detectViaDefault();
      try {
        await registerGeolocation(defaultDetection);
        setResult(defaultDetection);
        setDetected(true);
      } catch (registerErr) {
        console.error('Failed to register default location:', registerErr);
      }
    } finally {
      setDetecting(false);
    }
  };

  // Auto-détecter au premier chargement si utilisateur connecté
  useEffect(() => {
    if (user?.id && !detecting && !detected) {
      detectAndRegister();
    }
  }, [user?.id]);

  return {
    detecting,
    detected,
    error,
    result,
    detectAndRegister
  };
}
