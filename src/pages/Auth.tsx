import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { AlertCircle, Loader2, User as UserIcon, Store, Truck, Bike, Users, Ship, Crown, Utensils, ShoppingBag, Scissors, Car, GraduationCap, Stethoscope, Wrench, Home, Plane, Camera, ArrowLeft, Eye, EyeOff, Chrome } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import QuickFooter from "@/components/QuickFooter";
import { z } from "zod";
import { useTranslation } from "@/hooks/useTranslation";
import LanguageSelector from "@/components/LanguageSelector";

// Validation schemas avec tous les rôles
const loginSchema = z.object({
  email: z.string().email("Adresse email invalide"),
  password: z.string().min(6, "Le mot de passe doit faire au moins 6 caractères")
});

const signupSchema = loginSchema.extend({
  firstName: z.string().min(1, "Le prénom est requis"),
  lastName: z.string().min(1, "Le nom est requis"),
  role: z.enum(['client', 'vendeur', 'livreur', 'taxi', 'syndicat', 'transitaire', 'admin']),
  city: z.string().min(1, "La ville est requise")
});

type UserRole = 'client' | 'vendeur' | 'livreur' | 'taxi' | 'syndicat' | 'transitaire' | 'admin';

export default function Auth() {
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'facebook' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showNewPasswordForm, setShowNewPasswordForm] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const navigate = useNavigate();

  // === OAUTH HANDLERS (Google & Facebook) ===
  const handleGoogleLogin = async () => {
    setOauthLoading('google');
    setError(null);
    
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });
      
      if (error) throw error;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur de connexion Google';
      setError(message);
      console.error('❌ Erreur Google OAuth:', err);
    } finally {
      setOauthLoading(null);
    }
  };

  const handleFacebookLogin = async () => {
    setOauthLoading('facebook');
    setError(null);
    
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: redirectUrl,
        }
      });
      
      if (error) throw error;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur de connexion Facebook';
      setError(message);
      console.error('❌ Erreur Facebook OAuth:', err);
    } finally {
      setOauthLoading(null);
    }
  };

  // Détecter si on vient d'un lien de réinitialisation et vérifier la session
  useEffect(() => {
    const checkResetSession = async () => {
      const params = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const isReset = params.get('reset') === 'true' || hashParams.get('type') === 'recovery';
      
      if (isReset) {
        console.log('🔑 Lien de réinitialisation détecté, vérification de la session...');
        
        // Attendre un moment pour que Supabase traite le hash
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Vérifier qu'on a bien une session active
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (session) {
          console.log('✅ Session de réinitialisation active');
          setShowNewPasswordForm(true);
          setShowResetPassword(false);
          setIsLogin(false);
        } else {
          console.error('❌ Aucune session trouvée:', error);
          setError('Session de réinitialisation expirée ou invalide. Veuillez demander un nouveau lien de réinitialisation.');
          setShowResetPassword(true);
        }
      }
    };
    
    checkResetSession();
  }, []);

  // Form data
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [showSignup, setShowSignup] = useState(false);
  const [selectedServiceType, setSelectedServiceType] = useState<string | null>(null);
  const [showServiceSelection, setShowServiceSelection] = useState(false);
  const [showRoleSelectionModal, setShowRoleSelectionModal] = useState(false);

  // Mapping pays → indicatif téléphonique (pour auto-détection)
  const COUNTRY_PHONE_CODES: Record<string, string> = {
    'guinée': '+224',
    'guinee': '+224',
    'guinea': '+224',
    'sénégal': '+221',
    'senegal': '+221',
    'mali': '+223',
    'côte d\'ivoire': '+225',
    'cote d\'ivoire': '+225',
    'ivory coast': '+225',
    'burkina faso': '+226',
    'burkina': '+226',
    'niger': '+227',
    'togo': '+228',
    'bénin': '+229',
    'benin': '+229',
    'mauritanie': '+222',
    'mauritania': '+222',
    'gambie': '+220',
    'gambia': '+220',
    'guinée-bissau': '+245',
    'guinee bissau': '+245',
    'guinea bissau': '+245',
    'cap-vert': '+238',
    'cap vert': '+238',
    'cape verde': '+238',
    'liberia': '+231',
    'sierra leone': '+232',
    'ghana': '+233',
    'nigeria': '+234',
    'cameroun': '+237',
    'cameroon': '+237',
    'gabon': '+241',
    'congo': '+242',
    'rdc': '+243',
    'maroc': '+212',
    'morocco': '+212',
    'algérie': '+213',
    'algerie': '+213',
    'algeria': '+213',
    'tunisie': '+216',
    'tunisia': '+216',
    'france': '+33',
    'belgique': '+32',
    'belgium': '+32',
    'suisse': '+41',
    'switzerland': '+41',
    'canada': '+1',
    'états-unis': '+1',
    'etats-unis': '+1',
    'usa': '+1',
    'united states': '+1',
  };

  // Liste complète des indicatifs téléphoniques du monde pour le sélecteur
  const WORLD_PHONE_CODES = [
    { code: '+93', country: 'Afghanistan', flag: '🇦🇫' },
    { code: '+355', country: 'Albanie', flag: '🇦🇱' },
    { code: '+213', country: 'Algérie', flag: '🇩🇿' },
    { code: '+376', country: 'Andorre', flag: '🇦🇩' },
    { code: '+244', country: 'Angola', flag: '🇦🇴' },
    { code: '+54', country: 'Argentine', flag: '🇦🇷' },
    { code: '+374', country: 'Arménie', flag: '🇦🇲' },
    { code: '+61', country: 'Australie', flag: '🇦🇺' },
    { code: '+43', country: 'Autriche', flag: '🇦🇹' },
    { code: '+994', country: 'Azerbaïdjan', flag: '🇦🇿' },
    { code: '+973', country: 'Bahreïn', flag: '🇧🇭' },
    { code: '+880', country: 'Bangladesh', flag: '🇧🇩' },
    { code: '+32', country: 'Belgique', flag: '🇧🇪' },
    { code: '+229', country: 'Bénin', flag: '🇧🇯' },
    { code: '+975', country: 'Bhoutan', flag: '🇧🇹' },
    { code: '+591', country: 'Bolivie', flag: '🇧🇴' },
    { code: '+387', country: 'Bosnie', flag: '🇧🇦' },
    { code: '+267', country: 'Botswana', flag: '🇧🇼' },
    { code: '+55', country: 'Brésil', flag: '🇧🇷' },
    { code: '+359', country: 'Bulgarie', flag: '🇧🇬' },
    { code: '+226', country: 'Burkina Faso', flag: '🇧🇫' },
    { code: '+257', country: 'Burundi', flag: '🇧🇮' },
    { code: '+855', country: 'Cambodge', flag: '🇰🇭' },
    { code: '+237', country: 'Cameroun', flag: '🇨🇲' },
    { code: '+1', country: 'Canada/USA', flag: '🇨🇦' },
    { code: '+238', country: 'Cap-Vert', flag: '🇨🇻' },
    { code: '+236', country: 'Centrafrique', flag: '🇨🇫' },
    { code: '+56', country: 'Chili', flag: '🇨🇱' },
    { code: '+86', country: 'Chine', flag: '🇨🇳' },
    { code: '+57', country: 'Colombie', flag: '🇨🇴' },
    { code: '+269', country: 'Comores', flag: '🇰🇲' },
    { code: '+242', country: 'Congo', flag: '🇨🇬' },
    { code: '+243', country: 'RD Congo', flag: '🇨🇩' },
    { code: '+225', country: 'Côte d\'Ivoire', flag: '🇨🇮' },
    { code: '+385', country: 'Croatie', flag: '🇭🇷' },
    { code: '+53', country: 'Cuba', flag: '🇨🇺' },
    { code: '+45', country: 'Danemark', flag: '🇩🇰' },
    { code: '+253', country: 'Djibouti', flag: '🇩🇯' },
    { code: '+20', country: 'Égypte', flag: '🇪🇬' },
    { code: '+971', country: 'Émirats Arabes Unis', flag: '🇦🇪' },
    { code: '+593', country: 'Équateur', flag: '🇪🇨' },
    { code: '+291', country: 'Érythrée', flag: '🇪🇷' },
    { code: '+34', country: 'Espagne', flag: '🇪🇸' },
    { code: '+372', country: 'Estonie', flag: '🇪🇪' },
    { code: '+251', country: 'Éthiopie', flag: '🇪🇹' },
    { code: '+679', country: 'Fidji', flag: '🇫🇯' },
    { code: '+358', country: 'Finlande', flag: '🇫🇮' },
    { code: '+33', country: 'France', flag: '🇫🇷' },
    { code: '+241', country: 'Gabon', flag: '🇬🇦' },
    { code: '+220', country: 'Gambie', flag: '🇬🇲' },
    { code: '+995', country: 'Géorgie', flag: '🇬🇪' },
    { code: '+233', country: 'Ghana', flag: '🇬🇭' },
    { code: '+30', country: 'Grèce', flag: '🇬🇷' },
    { code: '+502', country: 'Guatemala', flag: '🇬🇹' },
    { code: '+224', country: 'Guinée', flag: '🇬🇳' },
    { code: '+245', country: 'Guinée-Bissau', flag: '🇬🇼' },
    { code: '+240', country: 'Guinée Équatoriale', flag: '🇬🇶' },
    { code: '+509', country: 'Haïti', flag: '🇭🇹' },
    { code: '+504', country: 'Honduras', flag: '🇭🇳' },
    { code: '+852', country: 'Hong Kong', flag: '🇭🇰' },
    { code: '+36', country: 'Hongrie', flag: '🇭🇺' },
    { code: '+91', country: 'Inde', flag: '🇮🇳' },
    { code: '+62', country: 'Indonésie', flag: '🇮🇩' },
    { code: '+98', country: 'Iran', flag: '🇮🇷' },
    { code: '+964', country: 'Irak', flag: '🇮🇶' },
    { code: '+353', country: 'Irlande', flag: '🇮🇪' },
    { code: '+354', country: 'Islande', flag: '🇮🇸' },
    { code: '+972', country: 'Israël', flag: '🇮🇱' },
    { code: '+39', country: 'Italie', flag: '🇮🇹' },
    { code: '+81', country: 'Japon', flag: '🇯🇵' },
    { code: '+962', country: 'Jordanie', flag: '🇯🇴' },
    { code: '+7', country: 'Kazakhstan', flag: '🇰🇿' },
    { code: '+254', country: 'Kenya', flag: '🇰🇪' },
    { code: '+996', country: 'Kirghizistan', flag: '🇰🇬' },
    { code: '+965', country: 'Koweït', flag: '🇰🇼' },
    { code: '+856', country: 'Laos', flag: '🇱🇦' },
    { code: '+371', country: 'Lettonie', flag: '🇱🇻' },
    { code: '+961', country: 'Liban', flag: '🇱🇧' },
    { code: '+231', country: 'Liberia', flag: '🇱🇷' },
    { code: '+218', country: 'Libye', flag: '🇱🇾' },
    { code: '+423', country: 'Liechtenstein', flag: '🇱🇮' },
    { code: '+370', country: 'Lituanie', flag: '🇱🇹' },
    { code: '+352', country: 'Luxembourg', flag: '🇱🇺' },
    { code: '+261', country: 'Madagascar', flag: '🇲🇬' },
    { code: '+60', country: 'Malaisie', flag: '🇲🇾' },
    { code: '+265', country: 'Malawi', flag: '🇲🇼' },
    { code: '+960', country: 'Maldives', flag: '🇲🇻' },
    { code: '+223', country: 'Mali', flag: '🇲🇱' },
    { code: '+356', country: 'Malte', flag: '🇲🇹' },
    { code: '+212', country: 'Maroc', flag: '🇲🇦' },
    { code: '+230', country: 'Maurice', flag: '🇲🇺' },
    { code: '+222', country: 'Mauritanie', flag: '🇲🇷' },
    { code: '+52', country: 'Mexique', flag: '🇲🇽' },
    { code: '+373', country: 'Moldavie', flag: '🇲🇩' },
    { code: '+377', country: 'Monaco', flag: '🇲🇨' },
    { code: '+976', country: 'Mongolie', flag: '🇲🇳' },
    { code: '+382', country: 'Monténégro', flag: '🇲🇪' },
    { code: '+258', country: 'Mozambique', flag: '🇲🇿' },
    { code: '+95', country: 'Myanmar', flag: '🇲🇲' },
    { code: '+264', country: 'Namibie', flag: '🇳🇦' },
    { code: '+977', country: 'Népal', flag: '🇳🇵' },
    { code: '+505', country: 'Nicaragua', flag: '🇳🇮' },
    { code: '+227', country: 'Niger', flag: '🇳🇪' },
    { code: '+234', country: 'Nigeria', flag: '🇳🇬' },
    { code: '+47', country: 'Norvège', flag: '🇳🇴' },
    { code: '+64', country: 'Nouvelle-Zélande', flag: '🇳🇿' },
    { code: '+968', country: 'Oman', flag: '🇴🇲' },
    { code: '+256', country: 'Ouganda', flag: '🇺🇬' },
    { code: '+998', country: 'Ouzbékistan', flag: '🇺🇿' },
    { code: '+92', country: 'Pakistan', flag: '🇵🇰' },
    { code: '+970', country: 'Palestine', flag: '🇵🇸' },
    { code: '+507', country: 'Panama', flag: '🇵🇦' },
    { code: '+595', country: 'Paraguay', flag: '🇵🇾' },
    { code: '+31', country: 'Pays-Bas', flag: '🇳🇱' },
    { code: '+51', country: 'Pérou', flag: '🇵🇪' },
    { code: '+63', country: 'Philippines', flag: '🇵🇭' },
    { code: '+48', country: 'Pologne', flag: '🇵🇱' },
    { code: '+351', country: 'Portugal', flag: '🇵🇹' },
    { code: '+974', country: 'Qatar', flag: '🇶🇦' },
    { code: '+40', country: 'Roumanie', flag: '🇷🇴' },
    { code: '+44', country: 'Royaume-Uni', flag: '🇬🇧' },
    { code: '+7', country: 'Russie', flag: '🇷🇺' },
    { code: '+250', country: 'Rwanda', flag: '🇷🇼' },
    { code: '+221', country: 'Sénégal', flag: '🇸🇳' },
    { code: '+381', country: 'Serbie', flag: '🇷🇸' },
    { code: '+232', country: 'Sierra Leone', flag: '🇸🇱' },
    { code: '+65', country: 'Singapour', flag: '🇸🇬' },
    { code: '+421', country: 'Slovaquie', flag: '🇸🇰' },
    { code: '+386', country: 'Slovénie', flag: '🇸🇮' },
    { code: '+252', country: 'Somalie', flag: '🇸🇴' },
    { code: '+249', country: 'Soudan', flag: '🇸🇩' },
    { code: '+211', country: 'Soudan du Sud', flag: '🇸🇸' },
    { code: '+94', country: 'Sri Lanka', flag: '🇱🇰' },
    { code: '+46', country: 'Suède', flag: '🇸🇪' },
    { code: '+41', country: 'Suisse', flag: '🇨🇭' },
    { code: '+963', country: 'Syrie', flag: '🇸🇾' },
    { code: '+886', country: 'Taïwan', flag: '🇹🇼' },
    { code: '+992', country: 'Tadjikistan', flag: '🇹🇯' },
    { code: '+255', country: 'Tanzanie', flag: '🇹🇿' },
    { code: '+235', country: 'Tchad', flag: '🇹🇩' },
    { code: '+420', country: 'Tchéquie', flag: '🇨🇿' },
    { code: '+66', country: 'Thaïlande', flag: '🇹🇭' },
    { code: '+228', country: 'Togo', flag: '🇹🇬' },
    { code: '+216', country: 'Tunisie', flag: '🇹🇳' },
    { code: '+993', country: 'Turkménistan', flag: '🇹🇲' },
    { code: '+90', country: 'Turquie', flag: '🇹🇷' },
    { code: '+380', country: 'Ukraine', flag: '🇺🇦' },
    { code: '+598', country: 'Uruguay', flag: '🇺🇾' },
    { code: '+58', country: 'Venezuela', flag: '🇻🇪' },
    { code: '+84', country: 'Vietnam', flag: '🇻🇳' },
    { code: '+967', country: 'Yémen', flag: '🇾🇪' },
    { code: '+260', country: 'Zambie', flag: '🇿🇲' },
    { code: '+263', country: 'Zimbabwe', flag: '🇿🇼' },
  ];

  // Règles de validation des numéros par indicatif (longueur min/max sans l'indicatif)
  const PHONE_VALIDATION_RULES: Record<string, { minLength: number; maxLength: number; example: string }> = {
    '+224': { minLength: 9, maxLength: 9, example: '621234567' },      // Guinée
    '+221': { minLength: 9, maxLength: 9, example: '771234567' },      // Sénégal
    '+223': { minLength: 8, maxLength: 8, example: '76123456' },       // Mali
    '+225': { minLength: 10, maxLength: 10, example: '0712345678' },   // Côte d'Ivoire
    '+226': { minLength: 8, maxLength: 8, example: '70123456' },       // Burkina Faso
    '+227': { minLength: 8, maxLength: 8, example: '90123456' },       // Niger
    '+228': { minLength: 8, maxLength: 8, example: '90123456' },       // Togo
    '+229': { minLength: 8, maxLength: 8, example: '97123456' },       // Bénin
    '+222': { minLength: 8, maxLength: 8, example: '22123456' },       // Mauritanie
    '+220': { minLength: 7, maxLength: 7, example: '3012345' },        // Gambie
    '+245': { minLength: 7, maxLength: 7, example: '9551234' },        // Guinée-Bissau
    '+238': { minLength: 7, maxLength: 7, example: '9911234' },        // Cap-Vert
    '+231': { minLength: 7, maxLength: 9, example: '770123456' },      // Liberia
    '+232': { minLength: 8, maxLength: 8, example: '76123456' },       // Sierra Leone
    '+233': { minLength: 9, maxLength: 9, example: '241234567' },      // Ghana
    '+234': { minLength: 10, maxLength: 11, example: '8012345678' },   // Nigeria
    '+237': { minLength: 9, maxLength: 9, example: '671234567' },      // Cameroun
    '+241': { minLength: 7, maxLength: 8, example: '06123456' },       // Gabon
    '+242': { minLength: 9, maxLength: 9, example: '066123456' },      // Congo
    '+243': { minLength: 9, maxLength: 9, example: '812345678' },      // RDC
    '+212': { minLength: 9, maxLength: 9, example: '612345678' },      // Maroc
    '+213': { minLength: 9, maxLength: 9, example: '551234567' },      // Algérie
    '+216': { minLength: 8, maxLength: 8, example: '22123456' },       // Tunisie
    '+33': { minLength: 9, maxLength: 9, example: '612345678' },       // France
    '+32': { minLength: 9, maxLength: 9, example: '471234567' },       // Belgique
    '+41': { minLength: 9, maxLength: 9, example: '791234567' },       // Suisse
    '+1': { minLength: 10, maxLength: 10, example: '2025551234' },     // USA/Canada
    '+44': { minLength: 10, maxLength: 10, example: '7911123456' },    // UK
    '+49': { minLength: 10, maxLength: 11, example: '15123456789' },   // Allemagne
    '+34': { minLength: 9, maxLength: 9, example: '612345678' },       // Espagne
    '+39': { minLength: 9, maxLength: 10, example: '3123456789' },     // Italie
    '+86': { minLength: 11, maxLength: 11, example: '13123456789' },   // Chine
    '+91': { minLength: 10, maxLength: 10, example: '9876543210' },    // Inde
    '+81': { minLength: 10, maxLength: 10, example: '9012345678' },    // Japon
    '+55': { minLength: 10, maxLength: 11, example: '11987654321' },   // Brésil
    '+7': { minLength: 10, maxLength: 10, example: '9123456789' },     // Russie
    '+20': { minLength: 10, maxLength: 10, example: '1012345678' },    // Égypte
    '+27': { minLength: 9, maxLength: 9, example: '712345678' },       // Afrique du Sud
    '+254': { minLength: 9, maxLength: 9, example: '712345678' },      // Kenya
    '+255': { minLength: 9, maxLength: 9, example: '712345678' },      // Tanzanie
    '+256': { minLength: 9, maxLength: 9, example: '712345678' },      // Ouganda
    '+250': { minLength: 9, maxLength: 9, example: '781234567' },      // Rwanda
    '+251': { minLength: 9, maxLength: 9, example: '911234567' },      // Éthiopie
    '+971': { minLength: 9, maxLength: 9, example: '501234567' },      // Émirats
    '+966': { minLength: 9, maxLength: 9, example: '512345678' },      // Arabie Saoudite
    '+90': { minLength: 10, maxLength: 10, example: '5321234567' },    // Turquie
  };

  // Validation du numéro de téléphone
  const [phoneError, setPhoneError] = useState<string | null>(null);
  
  const validatePhoneNumber = (phone: string, code: string): boolean => {
    const rule = PHONE_VALIDATION_RULES[code];
    if (!rule) {
      // Si pas de règle spécifique, accepter entre 7 et 15 chiffres (norme internationale)
      return phone.length >= 7 && phone.length <= 15;
    }
    return phone.length >= rule.minLength && phone.length <= rule.maxLength;
  };

  const getPhoneExample = (code: string): string => {
    const rule = PHONE_VALIDATION_RULES[code];
    return rule?.example || '123456789';
  };

  const getPhoneLengthHint = (code: string): string => {
    const rule = PHONE_VALIDATION_RULES[code];
    if (!rule) return '7-15 chiffres';
    if (rule.minLength === rule.maxLength) {
      return `${rule.minLength} chiffres`;
    }
    return `${rule.minLength}-${rule.maxLength} chiffres`;
  };

  const [phoneCode, setPhoneCode] = useState('+224');

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    country: '',
    city: '',
    businessName: '' // Nom de l'entreprise pour les marchands
  });

  // Auto-détection de l'indicatif téléphonique basé sur le pays
  useEffect(() => {
    if (formData.country) {
      const countryLower = formData.country.toLowerCase().trim();
      const code = COUNTRY_PHONE_CODES[countryLower];
      if (code) {
        setPhoneCode(code);
      }
    }
  }, [formData.country]);

  // Validation du numéro quand il change
  useEffect(() => {
    if (formData.phone) {
      const isValid = validatePhoneNumber(formData.phone, phoneCode);
      if (!isValid) {
        const hint = getPhoneLengthHint(phoneCode);
        setPhoneError(`Format invalide pour ${phoneCode}. Attendu: ${hint}`);
      } else {
        setPhoneError(null);
      }
    } else {
      setPhoneError(null);
    }
  }, [formData.phone, phoneCode]);
  
  const [manualCityEntry, setManualCityEntry] = useState(false);
  
  const [bureaus, setBureaus] = useState<Array<{ id: string; commune: string; prefecture: string }>>([]);

  // Charger les bureaux syndicaux disponibles
  useEffect(() => {
    const loadBureaus = async () => {
      const { data, error } = await supabase
        .from('bureaus')
        .select('id, commune, prefecture')
        .eq('status', 'active')
        .order('prefecture', { ascending: true });
      
      if (!error && data) {
        setBureaus(data);
      }
    };
    loadBureaus();
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user && event === 'SIGNED_IN') {
          console.log('✅ Connexion réussie, redirection vers dashboard...');
          // Redirection vers le dashboard principal qui gère automatiquement le routage par rôle
          navigate('/');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (showSignup) {
        // Inscription
        if (!selectedRole) {
          throw new Error("⚠️ Veuillez d'abord sélectionner un type de compte ci-dessus (Client, Marchand, Livreur, etc.)");
        }
        
        if (formData.password !== formData.confirmPassword) {
          throw new Error("❌ Les mots de passe ne correspondent pas");
        }

        // Validation du numéro de téléphone
        if (!validatePhoneNumber(formData.phone, phoneCode)) {
          const hint = getPhoneLengthHint(phoneCode);
          throw new Error(`❌ Numéro de téléphone invalide pour ${phoneCode}. Format attendu: ${hint}`);
        }
        const validatedData = signupSchema.parse({ ...formData, role: selectedRole });

        // Générer un ID utilisateur avec le bon préfixe selon le rôle
        const { data: userCustomId, error: generateError } = await supabase
          .rpc('generate_custom_id_with_role', { p_role: selectedRole });

        if (generateError) {
          console.error('❌ Erreur génération ID:', generateError);
          throw new Error('Erreur lors de la génération de votre identifiant');
        }

        const { data: authData, error } = await supabase.auth.signUp({
          email: validatedData.email,
          password: validatedData.password,
          options: {
            data: {
              first_name: validatedData.firstName,
              last_name: validatedData.lastName,
              role: validatedData.role,
              phone: `${phoneCode} ${formData.phone}`,
              country: formData.country,
              city: validatedData.city,
              custom_id: userCustomId,
              // Nom d'entreprise pour les marchands (synchronisation automatique)
              business_name: validatedData.role === 'vendeur' ? (formData.businessName?.trim() || `${validatedData.firstName} ${validatedData.lastName}`) : null,
              service_type: validatedData.role === 'vendeur' ? selectedServiceType : null
            },
            emailRedirectTo: `${window.location.origin}/`
          }
        });
        
        // Si c'est un taxi-motard, créer son profil conducteur et le lier à son bureau
        if (!error && authData.user && validatedData.role === 'taxi') {
          try {
            // Trouver le bureau de la ville sélectionnée
            const bureau = bureaus.find(b => b.commune === validatedData.city);
            
            // 1. Créer l'entrée taxi_drivers avec les infos du bureau pour la synchronisation
            const { error: driverError } = await supabase
              .from('taxi_drivers')
              .insert({
                user_id: authData.user.id,
                is_online: false,
                status: 'pending_verification',
                vehicle: {
                  commune: validatedData.city,
                  bureau_id: bureau?.id || null,
                  prefecture: bureau?.prefecture || null,
                  registration_date: new Date().toISOString()
                }
              });
            
            if (driverError) {
              console.error('❌ Erreur création profil conducteur:', driverError);
            } else {
              console.log('✅ Profil taxi-motard créé avec succès');
            }

            // 2. SYNCHRONISATION BUREAU: Créer l'entrée dans la table members pour que le bureau le voit
            if (bureau?.id) {
              const { error: memberError } = await supabase
                .from('members')
                .insert({
                  bureau_id: bureau.id,
                  name: `${validatedData.firstName} ${validatedData.lastName}`,
                  email: validatedData.email,
                  phone: `${phoneCode} ${formData.phone}`,
                  status: 'pending', // En attente de validation par le bureau
                  cotisation_status: 'pending',
                  join_date: new Date().toISOString().split('T')[0],
                  custom_id: userCustomId
                });
              
              if (memberError) {
                console.error('❌ Erreur synchronisation bureau:', memberError);
              } else {
                console.log('✅ Taxi-motard synchronisé avec le bureau syndical de', validatedData.city);
              }
            } else {
              console.warn('⚠️ Aucun bureau trouvé pour la ville:', validatedData.city);
            }
          } catch (syncError) {
            console.error('❌ Erreur synchronisation:', syncError);
          }
        }

        // Si c'est un vendeur (marchand), créer automatiquement son profil vendor avec le nom d'entreprise
        if (!error && authData.user && validatedData.role === 'vendeur') {
          try {
            const businessName = formData.businessName?.trim() || `${validatedData.firstName} ${validatedData.lastName}`;
            
            const { error: vendorError } = await supabase
              .from('vendors')
              .insert({
                user_id: authData.user.id,
                business_name: businessName,
                email: validatedData.email,
                phone: `${phoneCode} ${formData.phone}`,
                address: validatedData.city,
                city: validatedData.city,
                is_verified: false,
                is_active: true,
                service_type: selectedServiceType || 'general'
              });
            
            if (vendorError) {
              console.error('❌ Erreur création profil vendeur:', vendorError);
            } else {
              console.log('✅ Profil vendeur créé avec nom entreprise:', businessName);
            }
          } catch (vendorSyncError) {
            console.error('❌ Erreur synchronisation vendeur:', vendorSyncError);
          }
        }

        if (error) {
          if (error.message.includes('User already registered')) {
            throw new Error('❌ Cet email est déjà utilisé. Veuillez vous connecter ou utiliser un autre email.');
          } else {
            throw error;
          }
        }
        setSuccess("✅ Inscription réussie ! Vérifiez votre boîte mail pour confirmer votre compte, puis connectez-vous.");
      } else {
        // Connexion
        const validatedData = loginSchema.parse(formData);
        const { data, error } = await supabase.auth.signInWithPassword({
          email: validatedData.email,
          password: validatedData.password,
        });

        if (error) {
          // Gérer les erreurs d'authentification de manière conviviale
          if (error.message.includes('Email not confirmed')) {
            throw new Error('📧 Email non confirmé. Veuillez vérifier votre boîte mail et cliquer sur le lien de confirmation.');
          } else if (error.message.includes('Invalid login credentials')) {
            throw new Error('❌ Email ou mot de passe incorrect. Veuillez réessayer.');
          } else {
            throw error;
          }
        }
        
        if (data.user) {
          setSuccess("✅ Connexion réussie ! Redirection en cours...");
        }
      }
    } catch (err) {
      let errorMessage = 'Une erreur est survenue';
      
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      // Gestion des erreurs de validation Zod
      if (err && typeof err === 'object' && 'issues' in err) {
        const zodError = err as any;
        errorMessage = zodError.issues[0]?.message || errorMessage;
      }
      
      setError(errorMessage);
      console.error('Erreur authentification:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleClick = (role: UserRole) => {
    if (role === 'vendeur') {
      // Pour les marchands, afficher d'abord la sélection du type de service
      setShowServiceSelection(true);
      setSelectedRole(role);
    } else {
      setSelectedRole(role);
      setShowSignup(true);
    }
  };

  const handleSkipServiceSelection = () => {
    setShowServiceSelection(false);
    setSelectedServiceType(null); // Pas de service professionnel sélectionné
    setShowSignup(true);
  };

  const handleServiceTypeSelect = (serviceTypeId: string) => {
    setSelectedServiceType(serviceTypeId);
    setShowServiceSelection(false);
    setShowSignup(true);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Validation de l'email
      const emailSchema = z.string().email("Adresse email invalide");
      emailSchema.parse(resetEmail);

      // Envoyer l'email de réinitialisation avec le bon redirect URL
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });

      if (error) {
        throw error;
      }

      setSuccess("✅ Email de réinitialisation envoyé ! Vérifiez votre boîte mail et suivez les instructions.");
      setResetEmail('');
      
      // Retour au formulaire de connexion après 3 secondes
      setTimeout(() => {
        setShowResetPassword(false);
        setSuccess(null);
      }, 3000);
    } catch (err) {
      let errorMessage = 'Une erreur est survenue';
      
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      // Gestion des erreurs de validation Zod
      if (err && typeof err === 'object' && 'issues' in err) {
        const zodError = err as any;
        errorMessage = zodError.issues[0]?.message || errorMessage;
      }
      
      setError(errorMessage);
      console.error('Erreur réinitialisation mot de passe:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNewPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Vérifier d'abord qu'on a une session active
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Session expirée. Veuillez demander un nouveau lien de réinitialisation.");
      }

      console.log('🔐 Session active, mise à jour du mot de passe...');

      // Validation du nouveau mot de passe
      if (newPassword.length < 6) {
        throw new Error("Le mot de passe doit faire au moins 6 caractères");
      }

      if (newPassword !== confirmNewPassword) {
        throw new Error("Les mots de passe ne correspondent pas");
      }

      // Mettre à jour le mot de passe
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        console.error('❌ Erreur Supabase:', error);
        throw error;
      }

      console.log('✅ Mot de passe mis à jour avec succès');
      setSuccess("✅ Mot de passe réinitialisé avec succès ! Vous pouvez maintenant vous connecter.");
      setNewPassword('');
      setConfirmNewPassword('');
      
      // Se déconnecter pour forcer une nouvelle connexion avec le nouveau mot de passe
      await supabase.auth.signOut();
      
      // Retour au formulaire de connexion après 2 secondes
      setTimeout(() => {
        setShowNewPasswordForm(false);
        setIsLogin(true);
        setSuccess(null);
        navigate('/auth');
      }, 2000);
    } catch (err) {
      let errorMessage = 'Une erreur est survenue';
      
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      console.error('❌ Erreur changement mot de passe:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Header avec 224SOLUTIONS et boutons */}
      <div className="text-center py-8 px-4">
        <div className="flex justify-end mb-4 px-4">
          <LanguageSelector variant="compact" />
        </div>
        <h1 className="text-4xl font-bold text-purple-600 mb-6">224SOLUTIONS</h1>

        {/* Boutons du header */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <Button
            size="sm"
            className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-full"
            onClick={() => navigate('/home')}
          >
            {t('auth.home')}
          </Button>
          <Button
            size="sm"
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-full"
            onClick={() => navigate('/marketplace')}
          >
            {t('auth.market')}
          </Button>
          <Button
            size="sm"
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-full"
          >
            {t('auth.services')}
          </Button>
        </div>

        {/* Titre principal - rapproché du bloc de sélection */}
        <h2 className="text-2xl text-gray-600 mb-4">
          {t('auth.connectToSpace')} <span className="font-bold text-gray-800">{t('auth.professionalSpace')}</span>
        </h2>
      </div>

      {/* Sélection du type de compte - rapproché du titre */}
      <div className="max-w-4xl mx-auto px-6 mt-2">
        <div className="bg-gradient-to-br from-slate-50 to-blue-50 border border-border/50 rounded-3xl p-6 shadow-lg transition-all">
          <h3 className="text-xl font-bold text-center mb-4">
            {showSignup ? t('auth.selectAccountType') : t('auth.supportedAccounts')}
          </h3>
          
          {/* Ligne des 4 boutons professionnels (Marchand, Livreur, Taxi, Transitaire) */}
          <div className="flex flex-wrap justify-center gap-2 mb-4">
            <button
              onClick={() => handleRoleClick('vendeur')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all ${
                selectedRole === 'vendeur' 
                  ? 'bg-green-600 text-white shadow-lg scale-105' 
                  : 'bg-white text-green-700 border-2 border-green-200 hover:border-green-400 hover:bg-green-50'
              }`}
            >
              <Store className="h-4 w-4" />
              <span>{t('auth.merchant')}</span>
            </button>
            
            <button
              onClick={() => handleRoleClick('livreur')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all ${
                selectedRole === 'livreur' 
                  ? 'bg-orange-600 text-white shadow-lg scale-105' 
                  : 'bg-white text-orange-700 border-2 border-orange-200 hover:border-orange-400 hover:bg-orange-50'
              }`}
            >
              <Truck className="h-4 w-4" />
              <span>{t('auth.deliveryDriver')}</span>
            </button>
            
            <button
              onClick={() => handleRoleClick('taxi')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all ${
                selectedRole === 'taxi' 
                  ? 'bg-yellow-600 text-white shadow-lg scale-105' 
                  : 'bg-white text-yellow-700 border-2 border-yellow-200 hover:border-yellow-400 hover:bg-yellow-50'
              }`}
            >
              <Bike className="h-4 w-4" />
              <span>{t('auth.taxiMoto')}</span>
            </button>
            
            <button
              onClick={() => handleRoleClick('transitaire')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all ${
                selectedRole === 'transitaire' 
                  ? 'bg-indigo-600 text-white shadow-lg scale-105' 
                  : 'bg-white text-indigo-700 border-2 border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50'
              }`}
            >
              <Ship className="h-4 w-4" />
              <span>{t('auth.transitAgent')}</span>
            </button>
          </div>
          
          {/* Bouton Client - plus large et stylé en bas avec texte réorganisé */}
          <button
            onClick={() => handleRoleClick('client')}
            className={`w-full flex flex-col items-center justify-center gap-1 py-4 rounded-2xl transition-all ${
              selectedRole === 'client' 
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-xl scale-[1.02]' 
                : 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 border-2 border-blue-200 hover:border-blue-400 hover:from-blue-100 hover:to-purple-100 hover:shadow-lg'
            }`}
          >
            <div className="flex items-center gap-2">
              <UserIcon className={`h-6 w-6 ${selectedRole === 'client' ? 'text-white' : 'text-blue-600'}`} />
              <span className="text-lg font-semibold">{t('auth.client')}</span>
            </div>
            <span className={`text-sm font-normal ${selectedRole === 'client' ? 'text-blue-100' : 'text-muted-foreground'}`}>
              Acheter des produits et services
            </span>
          </button>
        </div>
      </div>

      {/* Sélection du type de service professionnel pour les marchands */}
      {showServiceSelection && (
        <div className="max-w-6xl mx-auto px-6 mt-8">
          <Card className="shadow-xl border-2 border-primary">
            <CardContent className="p-8">
              <div className="flex items-center justify-between mb-6">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowServiceSelection(false);
                    setSelectedRole(null);
                  }}
                  className="gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Retour
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSkipServiceSelection}
                  className="gap-2 bg-primary/10 hover:bg-primary/20 border-primary"
                >
                  <Store className="w-4 h-4" />
                  Vendeur E-commerce Classique
                </Button>
              </div>
              
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold mb-2">
                  Choisissez votre Type de Service Professionnel
                </h3>
                <p className="text-muted-foreground">
                  Sélectionnez le service que vous souhaitez créer parmi nos 15 catégories professionnelles<br/>
                  <span className="text-sm text-primary font-medium">Ou cliquez sur "Vendeur E-commerce Classique" pour vendre uniquement des produits</span>
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {[
                  { id: 'restaurant', name: 'Restauration', icon: '🍽️', color: 'orange' },
                  { id: 'ecommerce', name: 'Boutique Digitale', icon: '🛍️', color: 'blue' },
                  { id: 'livraison', name: 'Livraison / Coursier', icon: '📦', color: 'green' },
                  { id: 'beaute', name: 'Beauté & Bien-être', icon: '💇', color: 'pink' },
                  { id: 'reparation', name: 'Service de Réparation', icon: '🔧', color: 'gray' },
                  { id: 'location', name: 'Location Immobilière', icon: '🏠', color: 'purple' },
                  { id: 'education', name: 'Éducation / Formation', icon: '🎓', color: 'indigo' },
                  { id: 'sante', name: 'Santé & Bien-être', icon: '🏥', color: 'red' },
                  { id: 'voyage', name: 'Voyage & Billetterie', icon: '✈️', color: 'cyan' },
                  { id: 'freelance', name: 'Services Administratifs', icon: '💼', color: 'teal' },
                  { id: 'agriculture', name: 'Service Agricole', icon: '🌾', color: 'lime' },
                  { id: 'construction', name: 'Construction & BTP', icon: '🏗️', color: 'amber' },
                  { id: 'media', name: 'Média & Création', icon: '📸', color: 'rose' },
                  { id: 'informatique', name: 'Technique & Informatique', icon: '💻', color: 'violet' },
                  { id: 'menage', name: 'Ménage & Entretien', icon: '🧹', color: 'emerald' },
                ].map((service) => (
                  <button
                    key={service.id}
                    onClick={() => handleServiceTypeSelect(service.id)}
                    className={`flex flex-col items-center p-4 bg-white rounded-lg border-2 hover:border-primary hover:shadow-lg transition-all ${
                      selectedServiceType === service.id ? 'border-primary ring-2 ring-primary' : 'border-border'
                    }`}
                  >
                    <div className="text-4xl mb-2">{service.icon}</div>
                    <span className="text-sm font-medium text-center">{service.name}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Formulaire de connexion/inscription/reset */}
      {!showServiceSelection && (
        <div className="max-w-md mx-auto px-6 mt-8">
        <Card className="shadow-lg border-2 border-primary/20">
          <CardContent className="p-8">
            {/* Bouton retour pour le reset password */}
            {showResetPassword && (
              <Button
                variant="ghost"
                onClick={() => {
                  setShowResetPassword(false);
                  setError(null);
                  setSuccess(null);
                  setResetEmail('');
                }}
                className="gap-2 mb-4"
              >
                <ArrowLeft className="w-4 h-4" />
                Retour à la connexion
              </Button>
            )}

            {/* Messages d'information */}
            {!showSignup && !showResetPassword && (
              <>
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-blue-800 text-sm">
                    <strong>✨ Connexion intelligente :</strong> Utilisez vos identifiants habituels.
                    Le système reconnaîtra automatiquement votre type de compte (Client, Marchand, Livreur, ou Transitaire).
                  </p>
                </div>
                <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-amber-800 text-xs">
                    <strong>💡 Note :</strong> Si vous venez de vous inscrire, n'oubliez pas de confirmer votre email avant de vous connecter.
                  </p>
                </div>
              </>
            )}
            
            {showSignup && (
              <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-purple-800 text-sm">
                  <strong>🎯 Création de compte :</strong> Remplissez les informations ci-dessous pour créer votre compte {selectedRole ? `en tant que ${selectedRole === 'vendeur' ? (selectedServiceType ? 'Marchand Professionnel' : 'Vendeur E-commerce') : selectedRole}` : ''}.
                  {selectedServiceType && (
                    <span className="block mt-1 font-semibold">
                      Service professionnel sélectionné
                    </span>
                  )}
                  {selectedRole === 'vendeur' && !selectedServiceType && (
                    <span className="block mt-1 font-semibold text-green-700">
                      ✓ Mode Vendeur E-commerce classique (vente de produits uniquement)
                    </span>
                  )}
                </p>
              </div>
            )}

            {/* Formulaire de réinitialisation de mot de passe */}
            {showResetPassword ? (
              <form onSubmit={handlePasswordReset} className="space-y-4">
                {error && (
                  <Alert className="bg-red-50 border-red-200">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert className="bg-green-50 border-green-200">
                    <AlertCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      {success}
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground mb-4">
                    Entrez votre adresse email pour recevoir un lien de réinitialisation de mot de passe.
                  </p>
                  <Label htmlFor="reset-email">Adresse email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="votre@email.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    'Envoyer le lien de réinitialisation'
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setShowResetPassword(false);
                    setError(null);
                    setSuccess(null);
                  }}
                >
                  Retour à la connexion
                </Button>
              </form>
            ) : showNewPasswordForm ? (
              <form onSubmit={handleNewPasswordSubmit} className="space-y-4">
                {error && (
                  <Alert className="bg-red-50 border-red-200">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert className="bg-green-50 border-green-200">
                    <AlertCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      {success}
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground mb-4">
                    🔐 Choisissez votre nouveau mot de passe.
                  </p>
                  <Label htmlFor="new-password">Nouveau mot de passe</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Minimum 6 caractères"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-new-password">Confirmer le mot de passe</Label>
                  <div className="relative">
                    <Input
                      id="confirm-new-password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Retapez votre mot de passe"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Réinitialisation en cours...
                    </>
                  ) : (
                    'Réinitialiser mon mot de passe'
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="border-green-200 bg-green-50">
                  <AlertCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">{success}</AlertDescription>
                </Alert>
              )}

              {showSignup && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">{t('auth.firstName')}</Label>
                      <Input
                        id="firstName"
                        type="text"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        placeholder={t('auth.firstName')}
                        required
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">{t('auth.lastName')}</Label>
                      <Input
                        id="lastName"
                        type="text"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                        placeholder={t('auth.lastName')}
                        required
                        className="mt-1"
                      />
                    </div>
                  </div>

                  {/* Champ Nom d'entreprise - uniquement pour les marchands */}
                  {selectedRole === 'vendeur' && (
                    <div>
                      <Label htmlFor="businessName">
                        <Store className="inline w-4 h-4 mr-1" />
                        Nom de l'entreprise / Boutique
                      </Label>
                      <Input
                        id="businessName"
                        type="text"
                        value={formData.businessName}
                        onChange={(e) => handleInputChange('businessName', e.target.value)}
                        placeholder="Ex: Boutique Fatou, Restaurant Le Délice..."
                        required
                        className="mt-1"
                      />
                    </div>
                  )}

                  <div>
                    <Label htmlFor="country">Pays</Label>
                    <Input
                      id="country"
                      type="text"
                      value={formData.country}
                      onChange={(e) => handleInputChange('country', e.target.value)}
                      placeholder="Votre pays (ex: Guinée)"
                      required
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label htmlFor="city">Ville / Commune</Label>
                      {/* Afficher le bouton de sélection uniquement pour taxi (synchronisation bureau) */}
                      {selectedRole === 'taxi' && (
                        <button
                          type="button"
                          onClick={() => {
                            setManualCityEntry(!manualCityEntry);
                            setFormData({ ...formData, city: '' });
                          }}
                          className="text-xs text-primary hover:underline"
                        >
                          {manualCityEntry ? '📋 Choisir dans la liste' : '✏️ Saisir manuellement'}
                        </button>
                      )}
                    </div>
                    
                    {/* Pour client, livreur, vendeur et transitaire: saisie manuelle uniquement */}
                    {(selectedRole === 'client' || selectedRole === 'livreur' || selectedRole === 'vendeur' || selectedRole === 'transitaire') ? (
                      <Input
                        id="city"
                        type="text"
                        value={formData.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        placeholder="Saisissez votre ville"
                        className="mt-1"
                      />
                    ) : manualCityEntry ? (
                      <Input
                        id="city"
                        type="text"
                        value={formData.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        placeholder="Saisissez votre ville"
                        required
                        className="mt-1"
                      />
                    ) : (
                      <select
                        id="city"
                        value={formData.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        required
                        className="mt-1 w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring z-50"
                      >
                        <option value="">Sélectionnez votre ville</option>
                        {bureaus.map((bureau) => (
                          <option key={bureau.id} value={bureau.commune}>
                            {bureau.commune} - {bureau.prefecture}
                          </option>
                        ))}
                      </select>
                    )}
                    
                    {selectedRole === 'taxi' && formData.city && !manualCityEntry && (
                      <p className="text-xs text-green-600 mt-1">
                        ✅ Vous serez automatiquement synchronisé avec le bureau syndical de {formData.city}
                      </p>
                    )}
                    {selectedRole === 'taxi' && formData.city && manualCityEntry && (
                      <p className="text-xs text-amber-600 mt-1">
                        ⚠️ Ville saisie manuellement - synchronisation bureau non garantie
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="phone">Numéro de téléphone</Label>
                    <div className="flex gap-2 mt-1">
                      {/* Sélecteur d'indicatif pays */}
                      <select
                        id="phoneCode"
                        value={phoneCode}
                        onChange={(e) => setPhoneCode(e.target.value)}
                        className="w-28 px-2 py-2 border border-input rounded-md bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        {WORLD_PHONE_CODES.map((item) => (
                          <option key={`${item.code}-${item.country}`} value={item.code}>
                            {item.flag} {item.code}
                          </option>
                        ))}
                      </select>
                      {/* Numéro de téléphone */}
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => {
                          // Nettoyer le numéro (enlever espaces et caractères non numériques)
                          const cleaned = e.target.value.replace(/[^\d]/g, '');
                          handleInputChange('phone', cleaned);
                        }}
                        placeholder={getPhoneExample(phoneCode)}
                        required
                        className={`flex-1 ${phoneError ? 'border-red-500 focus:ring-red-500' : ''}`}
                      />
                    </div>
                    {phoneError ? (
                      <p className="text-xs text-red-500 mt-1">
                        ❌ {phoneError}
                      </p>
                    ) : formData.phone && !phoneError ? (
                      <p className="text-xs text-green-600 mt-1">
                        ✅ Format valide ({getPhoneLengthHint(phoneCode)})
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-1">
                        Format attendu: {getPhoneLengthHint(phoneCode)} • Ex: {getPhoneExample(phoneCode)}
                      </p>
                    )}
                  </div>
                </>
              )}

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="votre@email.com"
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="password">{t('auth.password')}</Label>
                <div className="relative mt-1">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    placeholder={t('auth.password')}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {showSignup && (
                <div>
                  <Label htmlFor="confirmPassword">{t('auth.confirmPassword')}</Label>
                  <div className="relative mt-1">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      placeholder={t('auth.confirmPassword')}
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}
              
              {!showSignup && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => {
                      setShowResetPassword(true);
                      setError(null);
                      setSuccess(null);
                    }}
                    className="text-sm text-purple-600 hover:underline"
                  >
                    {t('auth.forgotPassword')}
                  </button>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                disabled={loading || oauthLoading !== null}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {showSignup ? t('auth.registering') : t('auth.loggingIn')}
                  </>
                ) : (
                  showSignup ? t('auth.register') : t('auth.login')
                )}
              </Button>

              {/* ===== OAUTH BUTTONS (Google & Facebook) ===== */}
              <div className="relative my-6">
                <Separator />
                <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-sm text-muted-foreground">
                  ou continuer avec
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Bouton Google */}
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 gap-2 font-medium hover:bg-red-50 hover:border-red-300 transition-all"
                  onClick={handleGoogleLogin}
                  disabled={loading || oauthLoading !== null}
                >
                  {oauthLoading === 'google' ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  )}
                  <span className="hidden sm:inline">Google</span>
                </Button>

                {/* Bouton Facebook */}
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 gap-2 font-medium hover:bg-blue-50 hover:border-blue-300 transition-all"
                  onClick={handleFacebookLogin}
                  disabled={loading || oauthLoading !== null}
                >
                  {oauthLoading === 'facebook' ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#1877F2">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  )}
                  <span className="hidden sm:inline">Facebook</span>
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground mt-3">
                En continuant, vous acceptez nos conditions d'utilisation
              </p>
              {/* ===== FIN OAUTH BUTTONS ===== */}

              <div className="text-center pt-4">
                <button
                  type="button"
                  onClick={() => {
                    if (!showSignup && !selectedRole) {
                      // L'utilisateur veut s'inscrire mais n'a pas sélectionné de type de compte
                      // Afficher le modal de sélection
                      setShowRoleSelectionModal(true);
                    } else {
                      setShowSignup(!showSignup);
                      if (showSignup) {
                        setSelectedRole(null);
                      }
                      setError(null);
                      setSuccess(null);
                    }
                  }}
                  className="text-sm text-purple-600 font-medium hover:underline"
                >
                  {showSignup ? `${t('auth.hasAccount')} ${t('auth.loginHere')}` : `${t('auth.noAccount')} ${t('auth.createOne')}`}
                </button>
              </div>
            </form>
            )}
          </CardContent>
        </Card>
      </div>
      )}

      {/* Modal de sélection de type de compte */}
      {showRoleSelectionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowRoleSelectionModal(false)}>
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-center mb-2 text-gray-800">
              Choisissez votre type de compte
            </h3>
            <p className="text-sm text-muted-foreground text-center mb-6">
              Sélectionnez le profil qui correspond à votre activité
            </p>
            
            {/* Boutons professionnels en grille 2x2 */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                onClick={() => {
                  setShowRoleSelectionModal(false);
                  handleRoleClick('vendeur');
                }}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-green-50 border-2 border-green-200 hover:border-green-400 hover:bg-green-100 transition-all"
              >
                <Store className="h-8 w-8 text-green-600" />
                <span className="font-semibold text-green-700">{t('auth.merchant')}</span>
                <span className="text-xs text-muted-foreground text-center">Gérer une boutique</span>
              </button>
              
              <button
                onClick={() => {
                  setShowRoleSelectionModal(false);
                  handleRoleClick('livreur');
                }}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-orange-50 border-2 border-orange-200 hover:border-orange-400 hover:bg-orange-100 transition-all"
              >
                <Truck className="h-8 w-8 text-orange-600" />
                <span className="font-semibold text-orange-700">{t('auth.deliveryDriver')}</span>
                <span className="text-xs text-muted-foreground text-center">Livrer des colis</span>
              </button>
              
              <button
                onClick={() => {
                  setShowRoleSelectionModal(false);
                  handleRoleClick('taxi');
                }}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-yellow-50 border-2 border-yellow-200 hover:border-yellow-400 hover:bg-yellow-100 transition-all"
              >
                <Bike className="h-8 w-8 text-yellow-600" />
                <span className="font-semibold text-yellow-700">{t('auth.taxiMoto')}</span>
                <span className="text-xs text-muted-foreground text-center">Transport de personnes</span>
              </button>
              
              <button
                onClick={() => {
                  setShowRoleSelectionModal(false);
                  handleRoleClick('transitaire');
                }}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-indigo-50 border-2 border-indigo-200 hover:border-indigo-400 hover:bg-indigo-100 transition-all"
              >
                <Ship className="h-8 w-8 text-indigo-600" />
                <span className="font-semibold text-indigo-700">{t('auth.transitAgent')}</span>
                <span className="text-xs text-muted-foreground text-center">Import/Export</span>
              </button>
            </div>
            
            {/* Bouton Client stylé */}
            <button
              onClick={() => {
                setShowRoleSelectionModal(false);
                handleRoleClick('client');
              }}
              className="w-full flex flex-col items-center gap-1 py-4 rounded-2xl bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 hover:border-blue-400 hover:from-blue-100 hover:to-purple-100 hover:shadow-lg transition-all"
            >
              <div className="flex items-center gap-2">
                <UserIcon className="h-6 w-6 text-blue-600" />
                <span className="text-lg font-semibold text-blue-700">{t('auth.client')}</span>
              </div>
              <span className="text-sm text-muted-foreground">
                Acheter des produits et services
              </span>
            </button>
            
            {/* Séparateur OAuth */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200"></span>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-muted-foreground">ou s'inscrire avec</span>
              </div>
            </div>
            
            {/* Boutons OAuth */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setShowRoleSelectionModal(false);
                  handleGoogleLogin();
                }}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white border-2 border-gray-200 hover:border-red-300 hover:bg-red-50 transition-all"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="font-medium text-gray-700">Google</span>
              </button>
              
              <button
                onClick={() => {
                  setShowRoleSelectionModal(false);
                  handleFacebookLogin();
                }}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#1877F2">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <span className="font-medium text-gray-700">Facebook</span>
              </button>
            </div>
            
            {/* Bouton fermer */}
            <button
              onClick={() => setShowRoleSelectionModal(false)}
              className="w-full mt-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Footer de navigation */}
      <QuickFooter />
    </div>
  );
}
