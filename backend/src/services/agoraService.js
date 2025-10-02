/**
 * 🎯 SERVICE AGORA - 224SOLUTIONS
 * Service professionnel pour la génération de tokens Agora RTC et RTM
 * Gestion sécurisée des communications audio/vidéo/chat
 */

const { RtcTokenBuilder, RtmTokenBuilder, RtcRole } = require('agora-access-token');
const logger = require('../utils/logger');

class AgoraService {
  constructor() {
    this.appId = process.env.AGORA_APP_ID;
    this.appCertificate = process.env.AGORA_APP_CERTIFICATE;
    
    if (!this.appId || !this.appCertificate) {
      logger.error('❌ Agora credentials manquants dans .env');
      throw new Error('Configuration Agora incomplète');
    }
    
    logger.info('✅ Service Agora initialisé avec succès');
  }

  /**
   * Génère un token RTC pour les appels audio/vidéo
   * @param {string} channelName - Nom du canal
   * @param {string} uid - ID utilisateur (peut être string ou number)
   * @param {string} role - 'publisher' ou 'subscriber'
   * @param {number} expirationTimeInSeconds - Durée de validité (défaut: 3600s = 1h)
   * @returns {string} Token RTC
   */
  generateRTCToken(channelName, uid, role = 'publisher', expirationTimeInSeconds = 3600) {
    try {
      if (!channelName || !uid) {
        throw new Error('channelName et uid sont requis');
      }

      const currentTimestamp = Math.floor(Date.now() / 1000);
      const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;
      
      // Convertir le rôle en constante Agora
      const agoraRole = role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
      
      // Convertir uid en number si c'est une string numérique
      const numericUid = typeof uid === 'string' && !isNaN(uid) ? parseInt(uid) : uid;

      const token = RtcTokenBuilder.buildTokenWithUid(
        this.appId,
        this.appCertificate,
        channelName,
        numericUid,
        agoraRole,
        privilegeExpiredTs
      );

      logger.info(`🎥 Token RTC généré`, {
        channelName,
        uid: numericUid,
        role,
        expiresAt: new Date(privilegeExpiredTs * 1000).toISOString()
      });

      return token;
    } catch (error) {
      logger.error('❌ Erreur génération token RTC:', error);
      throw new Error(`Échec génération token RTC: ${error.message}`);
    }
  }

  /**
   * Génère un token RTM pour le chat temps réel
   * @param {string} userId - ID utilisateur
   * @param {number} expirationTimeInSeconds - Durée de validité (défaut: 3600s = 1h)
   * @returns {string} Token RTM
   */
  generateRTMToken(userId, expirationTimeInSeconds = 3600) {
    try {
      if (!userId) {
        throw new Error('userId est requis');
      }

      const currentTimestamp = Math.floor(Date.now() / 1000);
      const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

      const token = RtmTokenBuilder.buildToken(
        this.appId,
        this.appCertificate,
        userId,
        privilegeExpiredTs
      );

      logger.info(`💬 Token RTM généré`, {
        userId,
        expiresAt: new Date(privilegeExpiredTs * 1000).toISOString()
      });

      return token;
    } catch (error) {
      logger.error('❌ Erreur génération token RTM:', error);
      throw new Error(`Échec génération token RTM: ${error.message}`);
    }
  }

  /**
   * Génère les tokens pour une session complète (RTC + RTM)
   * @param {string} userId - ID utilisateur
   * @param {string} channelName - Nom du canal pour RTC
   * @param {string} role - Rôle RTC ('publisher' ou 'subscriber')
   * @param {number} expirationTimeInSeconds - Durée de validité
   * @returns {Object} Objet contenant les tokens RTC et RTM
   */
  generateSessionTokens(userId, channelName, role = 'publisher', expirationTimeInSeconds = 3600) {
    try {
      const rtcToken = this.generateRTCToken(channelName, userId, role, expirationTimeInSeconds);
      const rtmToken = this.generateRTMToken(userId, expirationTimeInSeconds);

      const sessionData = {
        appId: this.appId,
        userId,
        channelName,
        rtcToken,
        rtmToken,
        role,
        expiresAt: new Date((Math.floor(Date.now() / 1000) + expirationTimeInSeconds) * 1000).toISOString(),
        generatedAt: new Date().toISOString()
      };

      logger.info(`🎯 Session complète générée pour utilisateur ${userId}`);
      
      return sessionData;
    } catch (error) {
      logger.error('❌ Erreur génération session complète:', error);
      throw new Error(`Échec génération session: ${error.message}`);
    }
  }

  /**
   * Valide la configuration Agora
   * @returns {Object} Statut de la configuration
   */
  validateConfiguration() {
    const isValid = !!(this.appId && this.appCertificate);
    
    return {
      isValid,
      appId: this.appId ? `${this.appId.substring(0, 8)}...` : 'Non configuré',
      appCertificate: this.appCertificate ? 'Configuré' : 'Non configuré',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Génère un nom de canal unique pour une conversation
   * @param {string} user1Id - ID du premier utilisateur
   * @param {string} user2Id - ID du second utilisateur
   * @returns {string} Nom de canal unique
   */
  generateChannelName(user1Id, user2Id) {
    // Trier les IDs pour garantir un nom de canal cohérent
    const sortedIds = [user1Id, user2Id].sort();
    return `chat_${sortedIds[0]}_${sortedIds[1]}`;
  }

  /**
   * Génère un nom de canal pour un groupe
   * @param {string} groupId - ID du groupe
   * @returns {string} Nom de canal de groupe
   */
  generateGroupChannelName(groupId) {
    return `group_${groupId}`;
  }
}

module.exports = new AgoraService();
