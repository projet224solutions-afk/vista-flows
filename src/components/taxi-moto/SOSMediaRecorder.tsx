/**
 * Composant d'enregistrement audio/vidéo pour les alertes SOS
 * Permet au conducteur d'enregistrer et envoyer des preuves au bureau syndicat
 */

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Video, 
  Mic, 
  Square, 
  Send, 
  Camera, 
  Loader2, 
  CheckCircle,
  X,
  Play,
  Pause,
  Volume2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SOSMediaRecorderProps {
  sosAlertId: string;
  driverId: string;
  driverName: string;
  onMediaSent?: () => void;
  className?: string;
}

type RecordingType = 'audio' | 'video';
type RecordingState = 'idle' | 'recording' | 'stopped' | 'uploading' | 'sent';

export function SOSMediaRecorder({
  sosAlertId,
  driverId,
  driverName,
  onMediaSent,
  className
}: SOSMediaRecorderProps) {
  const [recordingType, setRecordingType] = useState<RecordingType | null>(null);
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  const startRecording = useCallback(async (type: RecordingType) => {
    try {
      setRecordingType(type);
      chunksRef.current = [];
      setRecordingDuration(0);

      const constraints = type === 'video' 
        ? { video: { facingMode: 'environment' }, audio: true }
        : { audio: true };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // Afficher le flux vidéo en direct
      if (type === 'video' && videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play();
      }

      const mimeType = type === 'video' 
        ? 'video/webm;codecs=vp8,opus' 
        : 'audio/webm;codecs=opus';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { 
          type: type === 'video' ? 'video/webm' : 'audio/webm' 
        });
        setRecordedBlob(blob);
        setRecordingState('stopped');

        // Arrêter le stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }

        // Afficher la preview
        if (type === 'video' && videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = null;
          videoPreviewRef.current.src = URL.createObjectURL(blob);
        } else if (type === 'audio' && audioPreviewRef.current) {
          audioPreviewRef.current.src = URL.createObjectURL(blob);
        }
      };

      mediaRecorder.start(1000); // Collecter toutes les secondes
      setRecordingState('recording');

      // Timer pour la durée
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      toast.success(`Enregistrement ${type === 'video' ? 'vidéo' : 'audio'} démarré`);
    } catch (error) {
      console.error('Erreur démarrage enregistrement:', error);
      toast.error('Impossible d\'accéder à la caméra/micro');
      setRecordingState('idle');
      setRecordingType(null);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  }, []);

  const cancelRecording = useCallback(() => {
    stopRecording();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setRecordedBlob(null);
    setRecordingState('idle');
    setRecordingType(null);
    setRecordingDuration(0);
    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = null;
      videoPreviewRef.current.src = '';
    }
    if (audioPreviewRef.current) {
      audioPreviewRef.current.src = '';
    }
  }, [stopRecording]);

  const sendRecording = useCallback(async () => {
    if (!recordedBlob || !sosAlertId) {
      toast.error('Aucun enregistrement à envoyer');
      return;
    }

    setRecordingState('uploading');

    try {
      const fileExtension = recordingType === 'video' ? 'webm' : 'webm';
      const fileName = `sos_${sosAlertId}_${Date.now()}.${fileExtension}`;
      const filePath = `sos-media/${sosAlertId}/${fileName}`;

      // Upload vers Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, recordedBlob, {
          contentType: recordingType === 'video' ? 'video/webm' : 'audio/webm',
          upsert: true
        });

      if (uploadError) {
        console.error('Erreur upload:', uploadError);
        throw uploadError;
      }

      // Obtenir l'URL publique
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // Enregistrer dans la base de données via RPC ou insert brut
      const { error: insertError } = await (supabase as any)
        .from('sos_media')
        .insert({
          sos_alert_id: sosAlertId,
          driver_id: driverId,
          driver_name: driverName,
          media_type: recordingType,
          file_path: filePath,
          file_url: urlData.publicUrl,
          duration_seconds: recordingDuration,
          created_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('Erreur insertion DB:', insertError);
        throw insertError;
      }

      setRecordingState('sent');
      toast.success('🎥 Enregistrement envoyé au Bureau Syndicat!', {
        description: 'Le bureau peut maintenant visualiser votre preuve'
      });

      onMediaSent?.();

      // Reset après 3 secondes
      setTimeout(() => {
        cancelRecording();
      }, 3000);

    } catch (error) {
      console.error('Erreur envoi:', error);
      toast.error('Erreur lors de l\'envoi de l\'enregistrement');
      setRecordingState('stopped');
    }
  }, [recordedBlob, sosAlertId, driverId, driverName, recordingType, recordingDuration, cancelRecording, onMediaSent]);

  const togglePlayback = useCallback(() => {
    const player = recordingType === 'video' ? videoPreviewRef.current : audioPreviewRef.current;
    if (player) {
      if (isPlaying) {
        player.pause();
      } else {
        player.play();
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying, recordingType]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className={cn("border-2 border-red-200 bg-red-50/50", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2 text-red-700">
          <Camera className="w-5 h-5" />
          Enregistrement SOS
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* État idle - Boutons de démarrage */}
        {recordingState === 'idle' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 text-center">
              Capturez une preuve audio ou vidéo de la situation
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => startRecording('video')}
                className="h-20 bg-gradient-to-br from-red-500 via-red-600 to-red-700 hover:from-red-600 hover:via-red-700 hover:to-red-800 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 group"
              >
                <div className="flex flex-col items-center gap-2">
                  <Video className="w-7 h-7 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-bold">Vidéo</span>
                  <span className="text-[10px] opacity-80">Recommandé</span>
                </div>
              </Button>
              <Button
                onClick={() => startRecording('audio')}
                className="h-20 bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 hover:from-orange-600 hover:via-orange-700 hover:to-orange-800 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 group"
              >
                <div className="flex flex-col items-center gap-2">
                  <Mic className="w-7 h-7 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-bold">Audio</span>
                  <span className="text-[10px] opacity-80">Plus rapide</span>
                </div>
              </Button>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800 flex items-start gap-2">
                <span className="text-blue-600 flex-shrink-0">💡</span>
                <span>
                  L'enregistrement sera envoyé au Bureau Syndicat en temps réel.
                  Décrivez clairement la situation.
                </span>
              </p>
            </div>
          </div>
        )}

        {/* État recording - En cours d'enregistrement */}
        {recordingState === 'recording' && (
          <div className="space-y-4">
            {/* Preview vidéo en direct */}
            {recordingType === 'video' && (
              <div className="relative rounded-xl overflow-hidden bg-black aspect-video shadow-2xl ring-4 ring-red-500/50 animate-pulse">
                <video
                  ref={videoPreviewRef}
                  className="w-full h-full object-cover"
                  muted
                  playsInline
                />
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <Badge className="bg-red-600 text-white flex items-center gap-2 px-3 py-1.5 shadow-lg">
                    <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                    <span className="font-bold">ENREGISTREMENT</span>
                  </Badge>
                </div>
                <div className="absolute bottom-3 left-3 right-3 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2">
                  <p className="text-white text-xs">📹 Filmez la situation actuelle</p>
                </div>
              </div>
            )}

            {/* Indicateur audio */}
            {recordingType === 'audio' && (
              <div className="bg-gradient-to-br from-orange-100 to-orange-50 rounded-xl p-8 flex flex-col items-center justify-center shadow-xl ring-4 ring-orange-500/50 animate-pulse">
                <div className="relative mb-4">
                  <div className="absolute inset-0 bg-orange-500/20 rounded-full animate-ping" />
                  <Mic className="w-16 h-16 text-orange-600 relative z-10" />
                  <div className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full animate-pulse shadow-lg" />
                </div>
                <p className="text-orange-800 font-bold text-lg">Enregistrement audio</p>
                <p className="text-orange-600 text-sm mt-1">Parlez clairement et décrivez la situation</p>
              </div>
            )}

            {/* Timer et contrôles */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <Badge variant="outline" className="text-xl font-mono font-bold px-4 py-2 border-2">
                  {formatDuration(recordingDuration)}
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={cancelRecording}
                  variant="outline"
                  size="sm"
                  className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
                >
                  <X className="w-4 h-4 mr-1" />
                  Annuler
                </Button>
                <Button
                  onClick={stopRecording}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold shadow-lg"
                  size="sm"
                >
                  <Square className="w-4 h-4 mr-1" />
                  Arrêter
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* État stopped - Preview et envoi */}
        {recordingState === 'stopped' && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-800 font-medium flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Enregistrement terminé ! Vérifiez avant d'envoyer.
              </p>
            </div>

            {/* Preview vidéo */}
            {recordingType === 'video' && (
              <div className="relative rounded-xl overflow-hidden bg-black aspect-video shadow-xl">
                <video
                  ref={videoPreviewRef}
                  className="w-full h-full object-cover"
                  playsInline
                  onEnded={() => setIsPlaying(false)}
                />
                <Button
                  onClick={togglePlayback}
                  className="absolute inset-0 bg-black/40 hover:bg-black/50 flex items-center justify-center transition-colors"
                  variant="ghost"
                >
                  <div className="bg-white/90 rounded-full p-4 shadow-2xl">
                    {isPlaying ? (
                      <Pause className="w-10 h-10 text-gray-900" />
                    ) : (
                      <Play className="w-10 h-10 text-gray-900" />
                    )}
                  </div>
                </Button>
                <div className="absolute bottom-3 left-3 right-3 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 flex items-center justify-between">
                  <span className="text-white text-sm font-medium">
                    Durée: {formatDuration(recordingDuration)}
                  </span>
                  <Badge className="bg-white/20 text-white">Prévisualisation</Badge>
                </div>
              </div>
            )}

            {/* Preview audio */}
            {recordingType === 'audio' && (
              <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-orange-600 rounded-full flex items-center justify-center">
                    <Volume2 className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-orange-900">Enregistrement audio</p>
                    <p className="text-sm text-orange-600">Durée: {formatDuration(recordingDuration)}</p>
                  </div>
                </div>
                <audio
                  ref={audioPreviewRef}
                  controls
                  className="w-full"
                  onEnded={() => setIsPlaying(false)}
                />
              </div>
            )}

            {/* Boutons d'action */}
            <div className="flex gap-2 p-4 bg-gray-50 rounded-lg">
              <Button
                onClick={cancelRecording}
                variant="outline"
                className="flex-1 border-gray-300 hover:bg-gray-100"
              >
                <X className="w-4 h-4 mr-2" />
                Recommencer
              </Button>
              <Button
                onClick={sendRecording}
                className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold shadow-lg hover:shadow-xl transition-all"
              >
                <Send className="w-4 h-4 mr-2" />
                Envoyer au Bureau
              </Button>
            </div>
          </div>
        )}

        {/* État uploading */}
        {recordingState === 'uploading' && (
          <div className="flex flex-col items-center justify-center py-10 space-y-4">
            <div className="relative">
              <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
              <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-lg font-bold text-blue-900">Envoi en cours...</p>
              <p className="text-sm text-blue-600">
                Transmission sécurisée vers le Bureau Syndicat
              </p>
            </div>
            <div className="w-full max-w-xs bg-gray-200 rounded-full h-2 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 animate-pulse" style={{ width: '100%' }} />
            </div>
          </div>
        )}

        {/* État sent */}
        {recordingState === 'sent' && (
          <div className="flex flex-col items-center justify-center py-10 space-y-4">
            <div className="relative">
              <CheckCircle className="w-16 h-16 text-green-600" />
              <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-xl font-bold text-green-800">Envoyé avec succès!</p>
              <p className="text-sm text-green-600">
                Le Bureau Syndicat a reçu votre enregistrement
              </p>
            </div>
            <Badge className="bg-green-100 text-green-800 border-2 border-green-300 px-4 py-2">
              ✓ Preuve enregistrée
            </Badge>
          </div>
        )}

        {/* Hidden audio element pour preview */}
        {recordingType === 'audio' && recordingState !== 'recording' && (
          <audio ref={audioPreviewRef} className="hidden" />
        )}
      </CardContent>
    </Card>
  );
}
