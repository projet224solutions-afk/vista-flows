// @ts-nocheck
/**
 * 🎥 SERVICE AGORA RTC - 224SOLUTIONS
 * Service opérationnel pour communications audio/vidéo avec Agora
 */

import AgoraRTC, { 
  IAgoraRTCClient, 
  ICameraVideoTrack, 
  IMicrophoneAudioTrack,
  ConnectionState,
  NetworkQuality
} from 'agora-rtc-sdk-ng';
import AgoraRTM from 'agora-rtm-sdk';

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
  private rtmClient: unknown = null;
  private localAudioTrack: IMicrophoneAudioTrack | null = null;
  private localVideoTrack: ICameraVideoTrack | null = null;
  private isConnected = false;
  private currentChannel = '';
  private currentUid = '';

  /**
   * Initialiser le client Agora
   */
  async initialize(config: AgoraConfig): Promise<void> {
    try {
      // Initialiser RTC Client
      this.client = AgoraRTC.createClient({ 
        mode: 'rtc', 
        codec: 'vp8' 
      });

      // Initialiser RTM Client pour la messagerie
      this.rtmClient = AgoraRTM.createInstance(config.appId);

      // Configurer les événements RTC
      this.setupRTCEvents();
      
      // Configurer les événements RTM
      this.setupRTMEvents();

      console.log('✅ Agora initialisé avec succès');
    } catch (error) {
      console.error('❌ Erreur initialisation Agora:', error);
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

    this.client.on('connection-state-change', (curState, revState) => {
      console.log('🔗 État connexion:', curState, revState);
      this.isConnected = curState === 'CONNECTED';
    });

    this.client.on('network-quality', (stats) => {
      console.log('📊 Qualité réseau:', stats);
    });
  }

  /**
   * Configurer les événements RTM
   */
  private setupRTMEvents(): void {
    if (!this.rtmClient) return;

    this.rtmClient.on('ConnectionStateChanged', (newState, reason) => {
      console.log('🔗 RTM État connexion:', newState, reason);
    });

    this.rtmClient.on('MessageFromPeer', (message, peerId) => {
      console.log('💬 Message reçu:', message, 'de:', peerId);
    });
  }

  /**
   * Rejoindre un canal audio/vidéo
   */
  async joinChannel(config: CallConfig): Promise<void> {
    if (!this.client) throw new Error('Client Agora non initialisé');

    try {
      // Rejoindre le canal
      await this.client.join(
        config.token || undefined,
        config.channel,
        config.uid,
        config.token || undefined
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

      // Quitter le canal RTM
      if (this.rtmClient && this.currentChannel) {
        await this.rtmClient.leaveChannel(this.currentChannel);
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
