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

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('auth_token');
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export const communicationService = {
  async getRTCToken(data: RTCTokenRequest) {
    return request('/api/agora/rtc-token', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getRTMToken(data: RTMTokenRequest) {
    return request('/api/agora/rtm-token', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getSessionTokens(data: SessionTokenRequest) {
    return request('/api/agora/session-tokens', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async generateChannel(data: GenerateChannelRequest) {
    return request('/api/agora/generate-channel', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getConfig() {
    return request('/api/agora/config');
  }
};
