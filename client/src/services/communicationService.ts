import { apiRequest } from '@/lib/queryClient';

interface RTCTokenRequest {
  channelName: string;
  uid: string | number;
  role?: 'publisher' | 'subscriber';
  expirationTime?: number;
}

interface RTMTokenRequest {
  userId: string;
  expirationTime?: number;
}

interface SessionTokenRequest {
  channelName: string;
  role?: 'publisher' | 'subscriber';
  expirationTime?: number;
}

interface GenerateChannelRequest {
  targetUserId?: string;
  isGroup?: boolean;
  groupId?: string;
}

export const communicationService = {
  async getRTCToken(data: RTCTokenRequest) {
    return apiRequest('/api/agora/rtc-token', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' }
    });
  },

  async getRTMToken(data: RTMTokenRequest) {
    return apiRequest('/api/agora/rtm-token', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' }
    });
  },

  async getSessionTokens(data: SessionTokenRequest) {
    return apiRequest('/api/agora/session-tokens', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' }
    });
  },

  async generateChannel(data: GenerateChannelRequest) {
    return apiRequest('/api/agora/generate-channel', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' }
    });
  },

  async getConfig() {
    return apiRequest('/api/agora/config');
  }
};
