/**
 * 🎥 SERVICE AGORA RTC - 224SOLUTIONS
 * Service opérationnel pour communications audio/vidéo avec Agora
 * Utilise agora-rtm v2 (sans eval) au lieu de agora-rtm-sdk v1
 */

import AgoraRTC, { 
  IAgoraRTCClient, 
  ICameraVideoTrack, 
  IMicrophoneAudioTrack,
  NetworkQuality
} from 'agora-rtc-sdk-ng';
import AgoraRTM from 'agora-rtm';

const { RTM } = AgoraRTM;

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

class AgoraService {
  private client: IAgoraRTCClient | null = null;
  private rtmClient: InstanceType<typeof RTM> | null = null;
  private localAudioTrack: IMicrophoneAudioTrack | null = null;
  private localVideoTrack: ICameraVideoTrack | null = null;
  private isConnected = false;
  private currentChannel = '';
  private currentUid = '';
  private appId = '';

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
      this.rtmClient = new RTM(this.appId, userId);
      
      // Configurer les événements RTM
      this.setupRTMEvents();

      // Login au serveur RTM
      await this.rtmClient.login({ token: token || undefined });

      console.log('✅ Agora RTM initialisé et connecté');
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

    this.client.on('user-published', async (user, mediaType) => {
      console.log('👤 Utilisateur publié:', user.uid, mediaType);
      await this.client!.subscribe(user, mediaType);
    });

    this.client.on('user-unpublished', (user, mediaType) => {
      console.log('👤 Utilisateur déconnecté:', user.uid, mediaType);
    });

    this.client.on('user-joined', (user) => {
      console.log('👤 Utilisateur rejoint:', user.uid);
    });

    this.client.on('user-left', (user) => {
      console.log('👤 Utilisateur parti:', user.uid);
    });

    this.client.on('connection-state-change', (curState) => {
      console.log('🔗 État connexion RTC:', curState);
      this.isConnected = curState === 'CONNECTED';
    });

    this.client.on('network-quality', (stats) => {
      console.log('📊 Qualité réseau:', stats);
    });
  }

  /**
   * Configurer les événements RTM v2
   */
  private setupRTMEvents(): void {
    if (!this.rtmClient) return;

    // RTM v2 events
    this.rtmClient.addEventListener('message', (event) => {
      console.log('💬 Message reçu:', event.message, 'de:', event.publisher);
    });

    this.rtmClient.addEventListener('presence', (event) => {
      console.log('👥 Présence:', event.eventType, event.publisher);
    });

    this.rtmClient.addEventListener('status', (event) => {
      console.log('🔗 RTM État connexion:', event.state, event.reason);
    });
  }

  /**
   * S'abonner à un canal RTM
   */
  async subscribeToChannel(channelName: string): Promise<void> {
    if (!this.rtmClient) {
      console.warn('RTM non initialisé');
      return;
    }

    try {
      await this.rtmClient.subscribe(channelName);
      console.log('✅ Abonné au canal RTM:', channelName);
    } catch (error) {
      console.error('❌ Erreur abonnement canal RTM:', error);
      throw error;
    }
  }

  /**
   * Envoyer un message sur un canal RTM
   */
  async sendMessage(channelName: string, message: string): Promise<void> {
    if (!this.rtmClient) {
      console.warn('RTM non initialisé');
      return;
    }

    try {
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
    if (!this.client) throw new Error('Client Agora non initialisé');

    try {
      // Rejoindre le canal
      await this.client.join(
        this.appId,
        config.channel,
        config.token || null,
        config.uid
      );

      this.currentChannel = config.channel;
      this.currentUid = config.uid;

      // Publier audio et vidéo si rôle publisher
      if (config.role === 'publisher') {
        await this.publishLocalTracks();
      }

      console.log('✅ Canal rejoint:', config.channel);
    } catch (error) {
      console.error('❌ Erreur rejoindre canal:', error);
      throw error;
    }
  }

  /**
   * Publier les tracks locaux
   */
  private async publishLocalTracks(): Promise<void> {
    if (!this.client) return;

    try {
      // Créer et publier audio
      this.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      await this.client.publish([this.localAudioTrack]);

      // Créer et publier vidéo
      this.localVideoTrack = await AgoraRTC.createCameraVideoTrack();
      await this.client.publish([this.localVideoTrack]);

      console.log('✅ Tracks locaux publiés');
    } catch (error) {
      console.error('❌ Erreur publication tracks:', error);
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
   */
  async toggleMicrophone(): Promise<boolean> {
    if (!this.localAudioTrack) return false;

    try {
      const enabled = !this.localAudioTrack.enabled;
      await this.localAudioTrack.setEnabled(enabled);
      console.log('🎤 Microphone:', enabled ? 'activé' : 'désactivé');
      return enabled;
    } catch (error) {
      console.error('❌ Erreur toggle microphone:', error);
      return false;
    }
  }

  /**
   * Activer/désactiver caméra
   */
  async toggleCamera(): Promise<boolean> {
    if (!this.localVideoTrack) return false;

    try {
      const enabled = !this.localVideoTrack.enabled;
      await this.localVideoTrack.setEnabled(enabled);
      console.log('📹 Caméra:', enabled ? 'activée' : 'désactivée');
      return enabled;
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
   * Nettoyer les ressources
   */
  async cleanup(): Promise<void> {
    try {
      await this.leaveChannel();
      
      if (this.rtmClient) {
        await this.rtmClient.logout();
        this.rtmClient = null;
      }

      this.client = null;
      console.log('✅ Agora nettoyé');
    } catch (error) {
      console.error('❌ Erreur nettoyage Agora:', error);
    }
  }
}

export const agoraService = new AgoraService();
