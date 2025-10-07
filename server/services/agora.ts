import { RtcTokenBuilder, RtmTokenBuilder, RtcRole } from 'agora-token';

interface SessionTokens {
  appId: string;
  userId: string;
  channelName: string;
  rtcToken: string;
  rtmToken: string;
  role: string;
  expiresAt: string;
  generatedAt: string;
}

class AgoraService {
  private appId: string;
  private appCertificate: string;

  constructor() {
    this.appId = process.env.AGORA_APP_ID || '';
    this.appCertificate = process.env.AGORA_APP_CERTIFICATE || '';
    
    if (!this.appId) {
      console.warn('⚠️ AGORA_APP_ID not configured');
    }
    if (!this.appCertificate) {
      console.warn('⚠️ AGORA_APP_CERTIFICATE not configured');
    }
  }

  generateRTCToken(
    channelName: string, 
    uid: string | number, 
    role: 'publisher' | 'subscriber' = 'publisher', 
    expirationTimeInSeconds: number = 3600
  ): string {
    if (!channelName || uid === undefined) {
      throw new Error('channelName and uid are required');
    }

    if (!this.appId || !this.appCertificate) {
      throw new Error('Agora credentials not configured');
    }

    const currentTimestamp = Math.floor(Date.now() / 1000);
    const tokenExpire = expirationTimeInSeconds;
    const privilegeExpire = expirationTimeInSeconds;
    
    const agoraRole = role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
    const numericUid = typeof uid === 'string' && !isNaN(Number(uid)) ? parseInt(uid) : uid;

    const token = RtcTokenBuilder.buildTokenWithUid(
      this.appId,
      this.appCertificate,
      channelName,
      numericUid as number,
      agoraRole,
      tokenExpire,
      privilegeExpire
    );

    console.log('🎥 RTC Token generated:', { channelName, uid: numericUid, role });
    return token;
  }

  generateRTMToken(userId: string, expirationTimeInSeconds: number = 3600): string {
    if (!userId) {
      throw new Error('userId is required');
    }

    if (!this.appId || !this.appCertificate) {
      throw new Error('Agora credentials not configured');
    }

    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    const token = RtmTokenBuilder.buildToken(
      this.appId,
      this.appCertificate,
      userId,
      privilegeExpiredTs
    );

    console.log('💬 RTM Token generated:', { userId });
    return token;
  }

  generateSessionTokens(
    userId: string, 
    channelName: string, 
    role: 'publisher' | 'subscriber' = 'publisher', 
    expirationTimeInSeconds: number = 3600
  ): SessionTokens {
    const rtcToken = this.generateRTCToken(channelName, userId, role, expirationTimeInSeconds);
    const rtmToken = this.generateRTMToken(userId, expirationTimeInSeconds);

    return {
      appId: this.appId,
      userId,
      channelName,
      rtcToken,
      rtmToken,
      role,
      expiresAt: new Date((Math.floor(Date.now() / 1000) + expirationTimeInSeconds) * 1000).toISOString(),
      generatedAt: new Date().toISOString()
    };
  }

  generateChannelName(user1Id: string, user2Id: string): string {
    const sortedIds = [user1Id, user2Id].sort();
    return `private_${sortedIds[0]}_${sortedIds[1]}`;
  }

  generateGroupChannelName(groupId: string): string {
    return `group_${groupId}`;
  }

  validateConfiguration(): { isValid: boolean; timestamp: string } {
    const isValid = !!(this.appId && this.appCertificate);
    return {
      isValid,
      timestamp: new Date().toISOString()
    };
  }
}

export const agoraService = new AgoraService();
