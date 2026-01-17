/**
 * 🔌 PROVIDER WEBRTC - 224SOLUTIONS
 * Wrapper pour gérer les appels WebRTC globalement
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useWebRTCAudioCall, WebRTCCallState, WebRTCCallActions } from '@/hooks/useWebRTCAudioCall';
import WebRTCAudioCall from './WebRTCAudioCall';

interface WebRTCCallContextType {
  callState: WebRTCCallState;
  startCall: WebRTCCallActions['startCall'];
  acceptCall: WebRTCCallActions['acceptCall'];
  rejectCall: WebRTCCallActions['rejectCall'];
  endCall: WebRTCCallActions['endCall'];
  toggleMute: WebRTCCallActions['toggleMute'];
}

const WebRTCCallContext = createContext<WebRTCCallContextType | null>(null);

export function useWebRTCCallContext() {
  const context = useContext(WebRTCCallContext);
  if (!context) {
    throw new Error('useWebRTCCallContext must be used within WebRTCCallProvider');
  }
  return context;
}

interface WebRTCCallProviderProps {
  children: ReactNode;
}

export default function WebRTCCallProvider({ children }: WebRTCCallProviderProps) {
  const webrtcCall = useWebRTCAudioCall();

  return (
    <WebRTCCallContext.Provider value={webrtcCall}>
      {children}
      {/* Overlay d'appel global */}
      <WebRTCAudioCall />
    </WebRTCCallContext.Provider>
  );
}
