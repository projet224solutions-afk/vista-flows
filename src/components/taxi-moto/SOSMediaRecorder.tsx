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
  Pause
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

      // Enregistrer dans la base de données
      const { error: insertError } = await supabase
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
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => startRecording('video')}
              className="h-16 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg"
            >
              <div className="flex flex-col items-center gap-1">
                <Video className="w-6 h-6" />
                <span className="text-xs font-medium">Filmer</span>
              </div>
            </Button>
            <Button
              onClick={() => startRecording('audio')}
              className="h-16 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg"
            >
              <div className="flex flex-col items-center gap-1">
                <Mic className="w-6 h-6" />
                <span className="text-xs font-medium">Enregistrer Audio</span>
              </div>
            </Button>
          </div>
        )}

        {/* État recording - En cours d'enregistrement */}
        {recordingState === 'recording' && (
          <div className="space-y-3">
            {/* Preview vidéo en direct */}
            {recordingType === 'video' && (
              <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
                <video
                  ref={videoPreviewRef}
                  className="w-full h-full object-cover"
                  muted
                  playsInline
                />
                <div className="absolute top-2 left-2">
                  <Badge className="bg-red-600 text-white animate-pulse flex items-center gap-1">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    REC
                  </Badge>
                </div>
              </div>
            )}

            {/* Indicateur audio */}
            {recordingType === 'audio' && (
              <div className="bg-orange-100 rounded-lg p-6 flex flex-col items-center justify-center">
                <div className="relative">
                  <Mic className="w-12 h-12 text-orange-600" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse" />
                </div>
                <p className="mt-2 text-sm text-orange-700 font-medium">Enregistrement en cours...</p>
              </div>
            )}

            {/* Timer et contrôles */}
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-lg font-mono px-4 py-2">
                {formatDuration(recordingDuration)}
              </Badge>
              <div className="flex gap-2">
                <Button
                  onClick={cancelRecording}
                  variant="outline"
                  size="sm"
                  className="border-red-300 text-red-600"
                >
                  <X className="w-4 h-4 mr-1" />
                  Annuler
                </Button>
                <Button
                  onClick={stopRecording}
                  className="bg-red-600 hover:bg-red-700 text-white"
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
          <div className="space-y-3">
            {/* Preview vidéo */}
            {recordingType === 'video' && (
              <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
                <video
                  ref={videoPreviewRef}
                  className="w-full h-full object-cover"
                  playsInline
                  onEnded={() => setIsPlaying(false)}
                />
                <Button
                  onClick={togglePlayback}
                  className="absolute inset-0 bg-black/30 hover:bg-black/40 flex items-center justify-center"
                  variant="ghost"
                >
                  {isPlaying ? (
                    <Pause className="w-12 h-12 text-white" />
                  ) : (
                    <Play className="w-12 h-12 text-white" />
                  )}
                </Button>
              </div>
            )}

            {/* Preview audio */}
            {recordingType === 'audio' && (
              <div className="bg-orange-100 rounded-lg p-4">
                <audio
                  ref={audioPreviewRef}
                  controls
                  className="w-full"
                  onEnded={() => setIsPlaying(false)}
                />
              </div>
            )}

            {/* Infos et boutons */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Durée: {formatDuration(recordingDuration)}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={cancelRecording}
                  variant="outline"
                  size="sm"
                >
                  <X className="w-4 h-4 mr-1" />
                  Annuler
                </Button>
                <Button
                  onClick={sendRecording}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  size="sm"
                >
                  <Send className="w-4 h-4 mr-1" />
                  Envoyer
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* État uploading */}
        {recordingState === 'uploading' && (
          <div className="flex flex-col items-center justify-center py-6 space-y-3">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            <p className="text-sm text-muted-foreground">Envoi en cours...</p>
          </div>
        )}

        {/* État sent */}
        {recordingState === 'sent' && (
          <div className="flex flex-col items-center justify-center py-6 space-y-3">
            <CheckCircle className="w-10 h-10 text-green-600" />
            <p className="text-sm font-medium text-green-700">Envoyé avec succès!</p>
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
