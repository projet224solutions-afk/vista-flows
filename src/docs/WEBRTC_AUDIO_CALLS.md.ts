/**
 * 📚 DOCUMENTATION WEBRTC AUDIO CALLS - 224SOLUTIONS
 * 
 * SYSTÈME D'APPELS AUDIO WEBRTC NATIF
 * =====================================
 * 
 * Ce système permet les appels audio 1-to-1 en temps réel sans utiliser
 * de services payants (Agora, Twilio, etc.). Il utilise :
 * - WebRTC natif pour le transport audio peer-to-peer
 * - Supabase Realtime pour la signalisation
 * - Serveurs STUN Google gratuits
 * 
 * 
 * STRUCTURE DES FICHIERS
 * ======================
 * 
 * src/hooks/useWebRTCAudioCall.ts
 *   - Hook principal gérant toute la logique WebRTC
 *   - Gestion RTCPeerConnection
 *   - Gestion des ICE candidates
 *   - Signalisation via Supabase channels
 * 
 * src/components/communication/WebRTCAudioCall.tsx
 *   - Interface utilisateur pour les appels
 *   - Écran d'appel entrant
 *   - Écran d'appel sortant
 *   - Écran d'appel en cours
 * 
 * src/components/communication/WebRTCCallButton.tsx
 *   - Bouton réutilisable pour initier un appel
 * 
 * src/components/communication/WebRTCCallProvider.tsx
 *   - Provider React pour gérer les appels globalement
 *   - À intégrer à la racine de l'application
 * 
 * 
 * INTÉGRATION DANS L'APPLICATION
 * ==============================
 * 
 * 1. Ajouter le Provider à la racine (App.tsx ou main.tsx) :
 * 
 *    import WebRTCCallProvider from '@/components/communication/WebRTCCallProvider';
 * 
 *    function App() {
 *      return (
 *        <WebRTCCallProvider>
 *          <YourApp />
 *        </WebRTCCallProvider>
 *      );
 *    }
 * 
 * 2. Utiliser le bouton d'appel dans une conversation :
 * 
 *    import WebRTCCallButton from '@/components/communication/WebRTCCallButton';
 * 
 *    <WebRTCCallButton 
 *      userId="uuid-de-l-utilisateur" 
 *      userName="Nom de l'utilisateur"
 *      userAvatar="https://..."
 *    />
 * 
 * 3. Ou utiliser le hook directement :
 * 
 *    import { useWebRTCAudioCall } from '@/hooks/useWebRTCAudioCall';
 * 
 *    const { startCall, endCall, toggleMute, callState } = useWebRTCAudioCall();
 *    
 *    // Démarrer un appel
 *    await startCall('user-id', { name: 'Jean', avatar: '...' });
 * 
 * 
 * ÉVÉNEMENTS DE SIGNALISATION
 * ===========================
 * 
 * Les événements utilisent Supabase Realtime Broadcast :
 * 
 * - call-offer: Offre SDP pour initier l'appel
 * - call-answer: Réponse SDP pour accepter l'appel
 * - ice-candidate: Candidat ICE pour la négociation NAT
 * - call-rejected: L'utilisateur a refusé l'appel
 * - call-ended: L'appel a été terminé
 * 
 * 
 * CONFIGURATION ICE/STUN/TURN
 * ===========================
 * 
 * Par défaut, le système utilise les serveurs STUN gratuits de Google :
 * - stun:stun.l.google.com:19302
 * - stun:stun1.l.google.com:19302
 * - stun:stun2.l.google.com:19302
 * 
 * Pour activer TURN (nécessaire dans certains réseaux restrictifs) :
 * 
 * 1. Installer coturn sur votre serveur :
 *    sudo apt install coturn
 * 
 * 2. Configurer /etc/turnserver.conf :
 *    realm=votre-domaine.com
 *    user=username:password
 * 
 * 3. Décommenter la config TURN dans useWebRTCAudioCall.ts :
 *    {
 *      urls: 'turn:votre-serveur.com:3478',
 *      username: 'username',
 *      credential: 'password'
 *    }
 * 
 * 
 * TESTS EN LOCAL
 * ==============
 * 
 * 1. Ouvrir 2 onglets de navigateur
 * 2. Se connecter avec 2 comptes différents
 * 3. Dans le premier onglet, cliquer sur "Appeler" pour l'autre utilisateur
 * 4. Dans le deuxième onglet, l'appel entrant devrait apparaître
 * 5. Cliquer "Accepter" pour établir la connexion audio
 * 
 * Note: Pour les tests en localhost, Chrome peut bloquer l'accès au micro.
 * Utiliser localhost ou ajouter le flag --unsafely-treat-insecure-origin-as-secure
 * 
 * 
 * TESTS SUR TÉLÉPHONE RÉEL
 * ========================
 * 
 * 1. Déployer l'application sur un domaine HTTPS
 * 2. Ouvrir l'app sur 2 téléphones
 * 3. Se connecter avec 2 comptes différents
 * 4. Passer un appel d'un téléphone à l'autre
 * 
 * Important: WebRTC requiert HTTPS en production !
 * 
 * 
 * COMPATIBILITÉ RÉSEAUX AFRICAINS
 * ================================
 * 
 * Le système est optimisé pour les réseaux mobiles africains :
 * - Audio codec Opus avec compression adaptative
 * - Gestion automatique des reconnexions
 * - Faible bande passante requise (~32-64 kbps)
 * - Gestion gracieuse des déconnexions temporaires
 * 
 * Si les utilisateurs rencontrent des problèmes de connexion :
 * 1. Vérifier la qualité du réseau
 * 2. Activer le serveur TURN pour contourner les NAT restrictifs
 * 3. Augmenter les timeouts ICE si nécessaire
 * 
 * 
 * LIMITES ACTUELLES
 * =================
 * 
 * ✅ Audio uniquement (pas de vidéo)
 * ✅ Appels 1-to-1 uniquement (pas de groupe)
 * ✅ Pas d'enregistrement des appels
 * ✅ Flux audio peer-to-peer (serveur ne transporte pas l'audio)
 * ✅ Solution 100% gratuite
 * 
 * 
 * DÉPANNAGE
 * =========
 * 
 * "Accès microphone refusé" :
 *   - Vérifier les permissions du navigateur
 *   - S'assurer que le site est en HTTPS
 * 
 * "Connexion échouée" :
 *   - Vérifier la connexion Internet
 *   - Essayer d'activer le serveur TURN
 *   - Vérifier les logs console pour les erreurs ICE
 * 
 * "Pas de son" :
 *   - Vérifier que le micro n'est pas muet
 *   - Vérifier le volume du haut-parleur
 *   - Vérifier les permissions audio du navigateur
 */

export {};
