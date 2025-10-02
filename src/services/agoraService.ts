/**
 * 🎯 SERVICE AGORA FRONTEND - 224SOLUTIONS
 * Service professionnel pour la gestion des communications Agora
 * RTM (Chat) + RTC (Audio/Vidéo) + Gestion des tokens
 */

import AgoraRTM from 'agora-rtm-sdk';
import AgoraRTC, { 
  IAgoraRTCClient, 
  IAgoraRTCRemoteUser, 
  ICameraVideoTrack, 
  IMicrophoneAudioTrack,
  ILocalVideoTrack,
  ILocalAudioTrack
} from 'agora-rtc-sdk-ng';
import { toast } from 'sonner';

// Types
export interface AgoraConfig {
  appId: string;
  rtcToken?: string;
  rtmToken?: string;
  channelName: string;
  userId: string;
}

export interface CallConfig {
  channelName: string;
  isVideo: boolean;
  userId: string;
}

export interface MessageData {
  id: string;
  senderId: string;
  content: string;
  timestamp: number;
  type: 'text' | 'image' | 'file' | 'location';
  metadata?: any;
}

export interface UserPresence {
  userId: string;
  status: 'online' | 'offline' | 'away' | 'busy' | 'in_call';
  lastSeen?: number;
}

class AgoraService {
  private static instance: AgoraService;
  
  // RTM (Chat)
  private rtmClient: any = null;
  private rtmChannel: any = null;
  private isRTMConnected = false;
  
  // RTC (Audio/Video)
  private rtcClient: IAgoraRTCClient | null = null;
  private localAudioTrack: IMicrophoneAudioTrack | null = null;
  private localVideoTrack: ICameraVideoTrack | null = null;
  private isRTCJoined = false;
  
  // Configuration
  private config: AgoraConfig | null = null;
  private baseURL = 'http://localhost:3001/api';
  
  // Callbacks
  private messageCallbacks: ((message: MessageData) => void)[] = [];
  private presenceCallbacks: ((presence: UserPresence) => void)[] = [];
  private callCallbacks: ((event: any) => void)[] = [];

  static getInstance(): AgoraService {
    if (!AgoraService.instance) {
      AgoraService.instance = new AgoraService();
    }
    return AgoraService.instance;
  }

  // =====================================================
  // GESTION DES TOKENS
  // =====================================================

  /**
   * Récupère les tokens depuis le backend
   */
  async getTokens(channelName: string, userId: string): Promise<AgoraConfig> {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Token d\'authentification manquant');
      }

      const response = await fetch(`${this.baseURL}/agora/session-tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          channelName,
          role: 'publisher',
          expirationTime: 3600
        })
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de la récupération des tokens');
      }

      return {
        appId: result.data.appId,
        rtcToken: result.data.rtcToken,
        rtmToken: result.data.rtmToken,
        channelName: result.data.channelName,
        userId: result.data.userId
      };
    } catch (error) {
      console.error('❌ Erreur récupération tokens:', error);
      toast.error('Erreur lors de la récupération des tokens Agora');
      throw error;
    }
  }

  // =====================================================
  // RTM (CHAT TEMPS RÉEL)
  // =====================================================

  /**
   * Initialise le client RTM
   */
  async initializeRTM(config: AgoraConfig): Promise<void> {
    try {
      if (this.rtmClient) {
        await this.disconnectRTM();
      }

      this.config = config;
      this.rtmClient = AgoraRTM.createInstance(config.appId);

      // Événements RTM
      this.rtmClient.on('MessageFromPeer', (message: any, peerId: string) => {
        this.handlePeerMessage(message, peerId);
      });

      this.rtmClient.on('ConnectionStateChanged', (newState: string, reason: string) => {
        console.log(`🔄 RTM Connection: ${newState}, Reason: ${reason}`);
        this.isRTMConnected = newState === 'CONNECTED';
      });

      // Connexion avec token
      await this.rtmClient.login({
        uid: config.userId,
        token: config.rtmToken
      });

      // Rejoindre le canal
      this.rtmChannel = this.rtmClient.createChannel(config.channelName);
      
      this.rtmChannel.on('ChannelMessage', (message: any, memberId: string) => {
        this.handleChannelMessage(message, memberId);
      });

      this.rtmChannel.on('MemberJoined', (memberId: string) => {
        console.log(`👋 Membre rejoint: ${memberId}`);
        this.notifyPresenceChange(memberId, 'online');
      });

      this.rtmChannel.on('MemberLeft', (memberId: string) => {
        console.log(`👋 Membre parti: ${memberId}`);
        this.notifyPresenceChange(memberId, 'offline');
      });

      await this.rtmChannel.join();
      
      console.log('✅ RTM initialisé avec succès');
      toast.success('Chat connecté');
    } catch (error) {
      console.error('❌ Erreur initialisation RTM:', error);
      toast.error('Erreur de connexion au chat');
      throw error;
    }
  }

  /**
   * Envoie un message texte
   */
  async sendMessage(content: string, targetUserId?: string): Promise<void> {
    try {
      if (!this.rtmClient || !this.isRTMConnected) {
        throw new Error('RTM non connecté');
      }

      const messageData: MessageData = {
        id: Date.now().toString(),
        senderId: this.config!.userId,
        content,
        timestamp: Date.now(),
        type: 'text'
      };

      const message = this.rtmClient.createMessage({
        text: JSON.stringify(messageData)
      });

      if (targetUserId) {
        // Message privé
        await this.rtmClient.sendMessageToPeer(message, targetUserId);
      } else if (this.rtmChannel) {
        // Message de canal
        await this.rtmChannel.sendMessage(message);
      }

      console.log('📤 Message envoyé:', messageData);
    } catch (error) {
      console.error('❌ Erreur envoi message:', error);
      toast.error('Erreur lors de l\'envoi du message');
      throw error;
    }
  }

  /**
   * Gère les messages reçus d'un peer
   */
  private handlePeerMessage(message: any, peerId: string): void {
    try {
      const messageData: MessageData = JSON.parse(message.text);
      messageData.senderId = peerId;
      
      this.messageCallbacks.forEach(callback => callback(messageData));
      console.log('📥 Message peer reçu:', messageData);
    } catch (error) {
      console.error('❌ Erreur traitement message peer:', error);
    }
  }

  /**
   * Gère les messages reçus du canal
   */
  private handleChannelMessage(message: any, memberId: string): void {
    try {
      const messageData: MessageData = JSON.parse(message.text);
      messageData.senderId = memberId;
      
      this.messageCallbacks.forEach(callback => callback(messageData));
      console.log('📥 Message canal reçu:', messageData);
    } catch (error) {
      console.error('❌ Erreur traitement message canal:', error);
    }
  }

  /**
   * Déconnecte RTM
   */
  async disconnectRTM(): Promise<void> {
    try {
      if (this.rtmChannel) {
        await this.rtmChannel.leave();
        this.rtmChannel = null;
      }

      if (this.rtmClient) {
        await this.rtmClient.logout();
        this.rtmClient = null;
      }

      this.isRTMConnected = false;
      console.log('🔌 RTM déconnecté');
    } catch (error) {
      console.error('❌ Erreur déconnexion RTM:', error);
    }
  }

  // =====================================================
  // RTC (AUDIO/VIDÉO)
  // =====================================================

  /**
   * Initialise le client RTC
   */
  async initializeRTC(config: AgoraConfig): Promise<void> {
    try {
      if (this.rtcClient) {
        await this.leaveRTCCall();
      }

      this.config = config;
      this.rtcClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

      // Événements RTC
      this.rtcClient.on('user-published', async (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => {
        await this.rtcClient!.subscribe(user, mediaType);
        console.log(`🎥 Utilisateur publié: ${user.uid}, Type: ${mediaType}`);
        
        this.callCallbacks.forEach(callback => callback({
          type: 'user-published',
          user,
          mediaType
        }));
      });

      this.rtcClient.on('user-unpublished', (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => {
        console.log(`🎥 Utilisateur non publié: ${user.uid}, Type: ${mediaType}`);
        
        this.callCallbacks.forEach(callback => callback({
          type: 'user-unpublished',
          user,
          mediaType
        }));
      });

      this.rtcClient.on('user-left', (user: IAgoraRTCRemoteUser) => {
        console.log(`👋 Utilisateur parti: ${user.uid}`);
        
        this.callCallbacks.forEach(callback => callback({
          type: 'user-left',
          user
        }));
      });

      console.log('✅ RTC initialisé avec succès');
    } catch (error) {
      console.error('❌ Erreur initialisation RTC:', error);
      toast.error('Erreur d\'initialisation des appels');
      throw error;
    }
  }

  /**
   * Rejoint un appel audio/vidéo
   */
  async joinCall(callConfig: CallConfig): Promise<void> {
    try {
      if (!this.rtcClient) {
        throw new Error('RTC non initialisé');
      }

      // Rejoindre le canal
      await this.rtcClient.join(
        this.config!.appId,
        callConfig.channelName,
        this.config!.rtcToken || null,
        callConfig.userId
      );

      this.isRTCJoined = true;

      // Créer les tracks audio
      this.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      await this.rtcClient.publish([this.localAudioTrack]);

      // Créer les tracks vidéo si nécessaire
      if (callConfig.isVideo) {
        this.localVideoTrack = await AgoraRTC.createCameraVideoTrack();
        await this.rtcClient.publish([this.localVideoTrack]);
      }

      console.log('📞 Appel rejoint avec succès');
      toast.success(callConfig.isVideo ? 'Appel vidéo connecté' : 'Appel audio connecté');
    } catch (error) {
      console.error('❌ Erreur rejoindre appel:', error);
      toast.error('Erreur lors de la connexion à l\'appel');
      throw error;
    }
  }

  /**
   * Quitte l'appel
   */
  async leaveRTCCall(): Promise<void> {
    try {
      // Arrêter les tracks locaux
      if (this.localAudioTrack) {
        this.localAudioTrack.stop();
        this.localAudioTrack.close();
        this.localAudioTrack = null;
      }

      if (this.localVideoTrack) {
        this.localVideoTrack.stop();
        this.localVideoTrack.close();
        this.localVideoTrack = null;
      }

      // Quitter le canal
      if (this.rtcClient && this.isRTCJoined) {
        await this.rtcClient.leave();
        this.isRTCJoined = false;
      }

      console.log('📞 Appel quitté');
      toast.success('Appel terminé');
    } catch (error) {
      console.error('❌ Erreur quitter appel:', error);
    }
  }

  /**
   * Active/désactive le microphone
   */
  async toggleMicrophone(): Promise<boolean> {
    try {
      if (this.localAudioTrack) {
        const enabled = this.localAudioTrack.enabled;
        await this.localAudioTrack.setEnabled(!enabled);
        console.log(`🎤 Microphone ${!enabled ? 'activé' : 'désactivé'}`);
        return !enabled;
      }
      return false;
    } catch (error) {
      console.error('❌ Erreur toggle microphone:', error);
      return false;
    }
  }

  /**
   * Active/désactive la caméra
   */
  async toggleCamera(): Promise<boolean> {
    try {
      if (this.localVideoTrack) {
        const enabled = this.localVideoTrack.enabled;
        await this.localVideoTrack.setEnabled(!enabled);
        console.log(`📹 Caméra ${!enabled ? 'activée' : 'désactivée'}`);
        return !enabled;
      }
      return false;
    } catch (error) {
      console.error('❌ Erreur toggle caméra:', error);
      return false;
    }
  }

  // =====================================================
  // CALLBACKS ET ÉVÉNEMENTS
  // =====================================================

  /**
   * Ajoute un callback pour les messages
   */
  onMessage(callback: (message: MessageData) => void): void {
    this.messageCallbacks.push(callback);
  }

  /**
   * Ajoute un callback pour les changements de présence
   */
  onPresenceChange(callback: (presence: UserPresence) => void): void {
    this.presenceCallbacks.push(callback);
  }

  /**
   * Ajoute un callback pour les événements d'appel
   */
  onCallEvent(callback: (event: any) => void): void {
    this.callCallbacks.push(callback);
  }

  /**
   * Notifie un changement de présence
   */
  private notifyPresenceChange(userId: string, status: UserPresence['status']): void {
    const presence: UserPresence = {
      userId,
      status,
      lastSeen: Date.now()
    };
    
    this.presenceCallbacks.forEach(callback => callback(presence));
  }

  // =====================================================
  // UTILITAIRES
  // =====================================================

  /**
   * Obtient les tracks locaux
   */
  getLocalTracks() {
    return {
      audio: this.localAudioTrack,
      video: this.localVideoTrack
    };
  }

  /**
   * Vérifie si RTM est connecté
   */
  isRTMReady(): boolean {
    return this.isRTMConnected;
  }

  /**
   * Vérifie si RTC est connecté
   */
  isRTCReady(): boolean {
    return this.isRTCJoined;
  }

  /**
   * Nettoie toutes les connexions
   */
  async cleanup(): Promise<void> {
    await Promise.all([
      this.disconnectRTM(),
      this.leaveRTCCall()
    ]);
    
    this.messageCallbacks = [];
    this.presenceCallbacks = [];
    this.callCallbacks = [];
    this.config = null;
    
    console.log('🧹 Service Agora nettoyé');
  }
}

export const agoraService = AgoraService.getInstance();
export default agoraService;
