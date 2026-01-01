/**
 * 🎥 SERVICE AGORA RTC - 224SOLUTIONS
 * Service opérationnel pour communications audio/vidéo avec Agora
 * Utilise agora-rtm v2 pour compatibilité Vite build
 */

import AgoraRTC, { 
  IAgoraRTCClient, 
  ICameraVideoTrack, 
  IMicrophoneAudioTrack,
  IRemoteVideoTrack,
  IRemoteAudioTrack,
  NetworkQuality,
  IAgoraRTCRemoteUser
} from 'agora-rtc-sdk-ng';
import AgoraRTM, { RTMClient } from 'agora-rtm';

export interface AgoraConfig {
  appId: string;
  appCertificate: string;
  tempToken?: string;
}

export interface CallConfig {
  channel: string;
  uid: string;
  token?: string;
  role: 'publisher' | 'subscriber';
}

export interface UserInfo {
  uid: string;
  name: string;
  avatar?: string;
  status: 'online' | 'busy' | 'offline' | 'in_call';
}

export interface RemoteUser {
  uid: string | number;
  videoTrack?: IRemoteVideoTrack;
  audioTrack?: IRemoteAudioTrack;
}

class AgoraService {
  private client: IAgoraRTCClient | null = null;
  private rtmClient: RTMClient | null = null;
  private localAudioTrack: IMicrophoneAudioTrack | null = null;
  private localVideoTrack: ICameraVideoTrack | null = null;
  private remoteUsers: Map<string, RemoteUser> = new Map();
  private isConnected = false;
  private currentChannel = '';
  private currentUid = '';
  private appId = '';
  private subscribedChannels: Set<string> = new Set();
  
  // Event callbacks
  private onUserJoined?: (user: RemoteUser) => void;
  private onUserLeft?: (uid: string) => void;
  private onLocalVideoReady?: (track: ICameraVideoTrack) => void;

  /**
   * Initialiser le client Agora
   */
  async initialize(config: AgoraConfig): Promise<void> {
    try {
      this.appId = config.appId;
      
      // Initialiser RTC Client
      this.client = AgoraRTC.createClient({ 
        mode: 'rtc', 
        codec: 'vp8' 
      });

      // Configurer les événements RTC
      this.setupRTCEvents();

      console.log('✅ Agora RTC initialisé avec succès');
    } catch (error) {
      console.error('❌ Erreur initialisation Agora:', error);
      throw error;
    }
  }

  /**
   * Initialiser RTM pour un utilisateur spécifique
   */
  async initializeRTM(userId: string, token?: string): Promise<void> {
    try {
      if (!this.appId) {
        throw new Error('Agora non initialisé. Appelez initialize() d\'abord.');
      }

      // Créer instance RTM v2
      this.rtmClient = new AgoraRTM.RTM(this.appId, userId);
      
      // Configurer les événements RTM v2
      this.setupRTMEvents();

      // Login au serveur RTM v2
      await this.rtmClient.login();

      console.log('✅ Agora RTM v2 initialisé et connecté');
    } catch (error) {
      console.error('❌ Erreur initialisation RTM:', error);
      throw error;
    }
  }

  /**
   * Configurer les événements RTC
   */
  private setupRTCEvents(): void {
    if (!this.client) return;

    // Quand un utilisateur publie un flux
    this.client.on('user-published', async (user, mediaType) => {
      console.log('👤 Utilisateur publié:', user.uid, mediaType);
      
      try {
        // S'abonner au flux
        await this.client!.subscribe(user, mediaType);
        
        // Mettre à jour les utilisateurs distants
        const remoteUser: RemoteUser = this.remoteUsers.get(String(user.uid)) || { uid: user.uid };
        
        if (mediaType === 'video') {
          remoteUser.videoTrack = user.videoTrack;
        } else if (mediaType === 'audio') {
          remoteUser.audioTrack = user.audioTrack;
          // Jouer l'audio automatiquement
          user.audioTrack?.play();
        }
        
        this.remoteUsers.set(String(user.uid), remoteUser);
        this.onUserJoined?.(remoteUser);
        
        console.log('✅ Abonné au flux:', user.uid, mediaType);
      } catch (error) {
        console.error('❌ Erreur abonnement flux:', error);
      }
    });

    this.client.on('user-unpublished', (user, mediaType) => {
      console.log('👤 Utilisateur a arrêté la publication:', user.uid, mediaType);
      
      const remoteUser = this.remoteUsers.get(String(user.uid));
      if (remoteUser) {
        if (mediaType === 'video') {
          remoteUser.videoTrack = undefined;
        } else if (mediaType === 'audio') {
          remoteUser.audioTrack = undefined;
        }
      }
    });

    this.client.on('user-joined', (user) => {
      console.log('👤 Utilisateur rejoint le canal:', user.uid);
    });

    this.client.on('user-left', (user) => {
      console.log('👤 Utilisateur parti:', user.uid);
      this.remoteUsers.delete(String(user.uid));
      this.onUserLeft?.(String(user.uid));
    });

    this.client.on('connection-state-change', (curState) => {
      console.log('🔗 État connexion RTC:', curState);
      this.isConnected = curState === 'CONNECTED';
    });

    this.client.on('network-quality', (stats) => {
      // Log uniquement si qualité change significativement
      if (stats.uplinkNetworkQuality > 0 || stats.downlinkNetworkQuality > 0) {
        console.log('📊 Qualité réseau - Up:', stats.uplinkNetworkQuality, 'Down:', stats.downlinkNetworkQuality);
      }
    });
  }

  /**
   * Configurer les événements RTM v2
   */
  private setupRTMEvents(): void {
    if (!this.rtmClient) return;

    // RTM v2 events
    this.rtmClient.addEventListener('message', (event: any) => {
      console.log('💬 Message reçu:', event.channelName, event.message);
    });

    this.rtmClient.addEventListener('status', (event: any) => {
      console.log('🔗 RTM État connexion:', event.state, event.reason);
    });
  }

  /**
   * Rejoindre un canal RTM v2
   */
  async subscribeToChannel(channelName: string): Promise<void> {
    if (!this.rtmClient) {
      console.warn('RTM non initialisé');
      return;
    }

    try {
      // RTM v2 - subscribe to channel
      await this.rtmClient.subscribe(channelName, {
        withMessage: true,
        withPresence: true
      });
      
      this.subscribedChannels.add(channelName);
      console.log('✅ Abonné au canal RTM:', channelName);
    } catch (error) {
      console.error('❌ Erreur rejoindre canal RTM:', error);
      throw error;
    }
  }

  /**
   * Envoyer un message sur un canal RTM v2
   */
  async sendMessage(channelName: string, message: string): Promise<void> {
    if (!this.rtmClient) {
      console.warn('RTM non initialisé');
      return;
    }

    try {
      // RTM v2 - publish message to channel
      await this.rtmClient.publish(channelName, message);
      console.log('✅ Message envoyé sur:', channelName);
    } catch (error) {
      console.error('❌ Erreur envoi message RTM:', error);
      throw error;
    }
  }

  /**
   * Rejoindre un canal audio/vidéo
   */
  async joinChannel(config: CallConfig): Promise<void> {
    if (!this.client) {
      throw new Error('Client Agora non initialisé. Appelez initialize() d\'abord.');
    }

    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        console.log(`[Agora] 🔗 Tentative ${retryCount + 1}/${maxRetries} - Rejoindre canal:`, config.channel);

        // Timeout pour éviter blocage infini
        const joinPromise = this.client.join(
          this.appId,
          config.channel,
          config.token || null,
          config.uid
        );

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout joinChannel (30s)')), 30000)
        );

        await Promise.race([joinPromise, timeoutPromise]);

        this.currentChannel = config.channel;
        this.currentUid = config.uid;
        this.isConnected = true;

        console.log('[Agora] ✅ Canal rejoint avec succès:', config.channel);

        // Publier audio et vidéo si rôle publisher
        if (config.role === 'publisher') {
          await this.publishLocalTracks();
        }

        return; // Succès, sortir de la boucle

      } catch (error: any) {
        retryCount++;
        const errorMessage = error?.message || 'Erreur inconnue';
        
        console.error(`[Agora] ❌ Tentative ${retryCount}/${maxRetries} échouée:`, {
          error: errorMessage,
          channel: config.channel,
          uid: config.uid
        });

        // Erreurs non-retriables
        if (errorMessage.includes('INVALID_') || errorMessage.includes('banned')) {
          throw new Error(`Erreur Agora non-retriable: ${errorMessage}`);
        }

        if (retryCount >= maxRetries) {
          throw new Error(`Échec rejoindre canal après ${maxRetries} tentatives: ${errorMessage}`);
        }

        // Exponential backoff avant retry
        const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
        console.log(`[Agora] ⏳ Retry dans ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));

        // Cleanup avant retry
        try {
          if (this.client && this.isConnected) {
            await this.client.leave();
          }
        } catch (cleanupErr) {
          console.warn('[Agora] ⚠️ Erreur cleanup avant retry:', cleanupErr);
        }
      }
    }

    throw new Error('Nombre maximum de tentatives atteint');
  }

  /**
   * Publier les tracks locaux
   */
  private async publishLocalTracks(): Promise<void> {
    if (!this.client) {
      throw new Error('Client Agora non disponible');
    }

    const tracksToPublish: (IMicrophoneAudioTrack | ICameraVideoTrack)[] = [];
    const errors: string[] = [];

    try {
      // Créer track audio avec timeout
      try {
        const audioPromise = AgoraRTC.createMicrophoneAudioTrack({
          encoderConfig: 'music_standard'
        });

        const audioTimeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout audio track (10s)')), 10000)
        );

        this.localAudioTrack = await Promise.race([audioPromise, audioTimeout]);
        tracksToPublish.push(this.localAudioTrack);
        console.log('[Agora] ✅ Track audio créé');
      } catch (audioError: any) {
        const errorMsg = `Microphone inaccessible: ${audioError?.message || 'Erreur inconnue'}`;
        errors.push(errorMsg);
        console.warn('[Agora] ⚠️', errorMsg);
        // Continuer sans audio
      }

      // Créer track vidéo avec timeout
      try {
        const videoPromise = AgoraRTC.createCameraVideoTrack({
          encoderConfig: '720p_2'
        });

        const videoTimeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout video track (10s)')), 10000)
        );

        this.localVideoTrack = await Promise.race([videoPromise, videoTimeout]);
        tracksToPublish.push(this.localVideoTrack);
        console.log('[Agora] ✅ Track vidéo créé');
        
        // Notifier que la vidéo locale est prête
        this.onLocalVideoReady?.(this.localVideoTrack);
      } catch (videoError: any) {
        const errorMsg = `Caméra inaccessible: ${videoError?.message || 'Erreur inconnue'}`;
        errors.push(errorMsg);
        console.warn('[Agora] ⚠️', errorMsg);
        // Continuer sans vidéo
      }

      // Publier les tracks disponibles
      if (tracksToPublish.length > 0) {
        try {
          await this.client.publish(tracksToPublish);
          console.log('[Agora] ✅ Tracks locaux publiés:', tracksToPublish.length);
        } catch (publishError: any) {
          console.error('[Agora] ❌ Erreur publication tracks:', publishError);
          // Cleanup les tracks créés mais non publiés
          tracksToPublish.forEach(track => {
            try {
              track.close();
            } catch (err) {
              console.warn('[Agora] ⚠️ Erreur cleanup track:', err);
            }
          });
          throw new Error(`Échec publication: ${publishError.message}`);
        }
      } else {
        const errorMessage = `Aucun track média disponible. ${errors.join(', ')}`;
        console.error('[Agora] ❌', errorMessage);
        throw new Error(errorMessage);
      }

      // Logger les warnings si partiellement réussi
      if (errors.length > 0) {
        console.warn('[Agora] ⚠️ Publication partielle:', errors.join(', '));
      }
    } catch (error: any) {
      console.error('[Agora] ❌ Erreur critique publishLocalTracks:', error);
      throw error;
    }
  }

  /**
   * Quitter le canal
   */
  async leaveChannel(): Promise<void> {
    try {
      // Arrêter et nettoyer les tracks locaux
      if (this.localAudioTrack) {
        this.localAudioTrack.close();
        this.localAudioTrack = null;
      }

      if (this.localVideoTrack) {
        this.localVideoTrack.close();
        this.localVideoTrack = null;
      }

      // Quitter le canal RTC
      if (this.client) {
        await this.client.leave();
      }

      this.isConnected = false;
      this.currentChannel = '';
      this.currentUid = '';

      console.log('✅ Canal quitté');
    } catch (error) {
      console.error('❌ Erreur quitter canal:', error);
      throw error;
    }
  }

  /**
   * Activer/désactiver microphone
   * @returns true si microphone est MUTE (désactivé)
   */
  async toggleMicrophone(): Promise<boolean> {
    if (!this.localAudioTrack) {
      console.warn('⚠️ Pas de track audio local');
      return true; // Considéré comme muté
    }

    try {
      const newEnabled = !this.localAudioTrack.enabled;
      await this.localAudioTrack.setEnabled(newEnabled);
      const isMuted = !newEnabled; // Inversé: enabled=true signifie isMuted=false
      console.log('🎤 Microphone:', newEnabled ? 'activé' : 'désactivé (mute)');
      return isMuted;
    } catch (error) {
      console.error('❌ Erreur toggle microphone:', error);
      return true; // Considéré comme muté en cas d'erreur
    }
  }

  /**
   * Activer/désactiver caméra
   * @returns true si vidéo est ACTIVÉE
   */
  async toggleCamera(): Promise<boolean> {
    if (!this.localVideoTrack) {
      console.warn('⚠️ Pas de track vidéo local');
      return false; // Vidéo désactivée
    }

    try {
      const newEnabled = !this.localVideoTrack.enabled;
      await this.localVideoTrack.setEnabled(newEnabled);
      console.log('📹 Caméra:', newEnabled ? 'activée' : 'désactivée');
      return newEnabled;
    } catch (error) {
      console.error('❌ Erreur toggle caméra:', error);
      return false;
    }
  }

  /**
   * Obtenir les statistiques de qualité
   */
  async getNetworkQuality(): Promise<NetworkQuality | null> {
    if (!this.client) return null;
    return {
      uplinkNetworkQuality: 0,
      downlinkNetworkQuality: 0
    };
  }

  /**
   * Vérifier si connecté
   */
  isChannelConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Obtenir l'UID actuel
   */
  getCurrentUid(): string {
    return this.currentUid;
  }

  /**
   * Obtenir le canal actuel
   */
  getCurrentChannel(): string {
    return this.currentChannel;
  }

  /**
   * Obtenir le track vidéo local
   */
  getLocalVideoTrack(): ICameraVideoTrack | null {
    return this.localVideoTrack;
  }

  /**
   * Obtenir le track audio local
   */
  getLocalAudioTrack(): IMicrophoneAudioTrack | null {
    return this.localAudioTrack;
  }

  /**
   * Obtenir les utilisateurs distants
   */
  getRemoteUsers(): RemoteUser[] {
    return Array.from(this.remoteUsers.values());
  }

  /**
   * Jouer la vidéo locale dans un élément
   */
  playLocalVideo(element: HTMLElement | string): void {
    if (this.localVideoTrack) {
      this.localVideoTrack.play(element);
      console.log('📹 Vidéo locale en lecture');
    }
  }

  /**
   * Jouer la vidéo distante dans un élément
   */
  playRemoteVideo(uid: string, element: HTMLElement | string): void {
    const remoteUser = this.remoteUsers.get(uid);
    if (remoteUser?.videoTrack) {
      remoteUser.videoTrack.play(element);
      console.log('📹 Vidéo distante en lecture:', uid);
    }
  }

  /**
   * Configurer les callbacks d'événements
   */
  setEventCallbacks(callbacks: {
    onUserJoined?: (user: RemoteUser) => void;
    onUserLeft?: (uid: string) => void;
    onLocalVideoReady?: (track: ICameraVideoTrack) => void;
  }): void {
    this.onUserJoined = callbacks.onUserJoined;
    this.onUserLeft = callbacks.onUserLeft;
    this.onLocalVideoReady = callbacks.onLocalVideoReady;
  }

  /**
   * Nettoyer les ressources
   */
  async cleanup(): Promise<void> {
    console.log('[Agora] 🧹 Début cleanup...');
    const errors: string[] = [];

    try {
      // 1. Cleanup RTC tracks et channel
      try {
        await this.leaveChannel();
      } catch (leaveError: any) {
        const msg = `Erreur leave channel: ${leaveError?.message || 'Inconnue'}`;
        errors.push(msg);
        console.warn('[Agora] ⚠️', msg);
      }
      
      // 2. Cleanup RTM canaux
      if (this.rtmClient) {
        try {
          // Unsubscribe de tous les canaux
          for (const channel of this.subscribedChannels) {
            try {
              await Promise.race([
                this.rtmClient.unsubscribe(channel),
                new Promise<never>((_, reject) => 
                  setTimeout(() => reject(new Error('Timeout unsubscribe')), 5000)
                )
              ]);
              console.log('[Agora] ✅ Unsubscribed:', channel);
            } catch (unsubError: any) {
              console.warn('[Agora] ⚠️ Erreur unsubscribe:', channel, unsubError?.message);
            }
          }
          this.subscribedChannels.clear();
          
          // Logout RTM
          try {
            await Promise.race([
              this.rtmClient.logout(),
              new Promise<never>((_, reject) => 
                setTimeout(() => reject(new Error('Timeout logout')), 5000)
              )
            ]);
            console.log('[Agora] ✅ RTM logout');
          } catch (logoutError: any) {
            console.warn('[Agora] ⚠️ Erreur RTM logout:', logoutError?.message);
          }
          
          this.rtmClient = null;
        } catch (rtmError: any) {
          const msg = `Erreur cleanup RTM: ${rtmError?.message || 'Inconnue'}`;
          errors.push(msg);
          console.warn('[Agora] ⚠️', msg);
        }
      }

      // 3. Cleanup mémoire
      this.remoteUsers.clear();
      this.client = null;
      this.isConnected = false;
      this.currentChannel = '';
      this.currentUid = '';

      if (errors.length > 0) {
        console.warn('[Agora] ⚠️ Cleanup terminé avec warnings:', errors.join(', '));
      } else {
        console.log('[Agora] ✅ Cleanup complet réussi');
      }
    } catch (error: any) {
      console.error('[Agora] ❌ Erreur critique cleanup:', error);
      throw error;
    }
  }
}

export const agoraService = new AgoraService();
