/**
 * 💬 MESSAGE INPUT PROFESSIONNEL - 224SOLUTIONS
 * Input de message avec upload fichiers, vocal, emojis et aperçu média
 */

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { 
  Send, 
  Paperclip, 
  Image as ImageIcon, 
  Mic, 
  X,
  Loader2,
  FileVideo,
  File,
  Play,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageInputProps {
  onSendText: (text: string) => Promise<void>;
  onSendFile: (file: File) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  maxVideoDuration?: number; // En secondes, défaut 10
}

interface AttachmentPreview {
  file: File;
  previewUrl?: string;
  duration?: number;
  isValidDuration?: boolean;
}

export default function MessageInput({ 
  onSendText,
  onSendFile,
  disabled = false,
  placeholder = "Tapez votre message...",
  className,
  maxVideoDuration = 10
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<AttachmentPreview[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [loadingPreviews, setLoadingPreviews] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Nettoyer les URLs de prévisualisation au démontage
  useEffect(() => {
    return () => {
      attachments.forEach(att => {
        if (att.previewUrl) URL.revokeObjectURL(att.previewUrl);
      });
    };
  }, []);

  const handleSend = async () => {
    if (isSending) return;

    // Vérifier si toutes les vidéos sont valides
    const invalidVideos = attachments.filter(
      att => att.file.type.startsWith('video/') && !att.isValidDuration
    );
    if (invalidVideos.length > 0) {
      toast.error(`Les vidéos doivent faire moins de ${maxVideoDuration} secondes`);
      return;
    }

    try {
      setIsSending(true);

      // Envoyer fichiers d'abord
      if (attachments.length > 0) {
        for (const att of attachments) {
          await onSendFile(att.file);
        }
        // Nettoyer les previews
        attachments.forEach(att => {
          if (att.previewUrl) URL.revokeObjectURL(att.previewUrl);
        });
        setAttachments([]);
      }

      // Puis envoyer message texte
      if (message.trim()) {
        await onSendText(message.trim());
        setMessage('');
      }
    } catch (error: any) {
      console.error('Erreur envoi message:', error);
      toast.error(error.message || "Erreur lors de l'envoi");
    } finally {
      setIsSending(false);
    }
  };

  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };
      video.onerror = () => resolve(0);
      video.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length + attachments.length > 5) {
      toast.error('Maximum 5 fichiers par message');
      return;
    }

    // Vérifier taille (50MB max par fichier)
    const maxSize = 50 * 1024 * 1024;
    const oversizedFiles = files.filter(f => f.size > maxSize);
    if (oversizedFiles.length > 0) {
      toast.error(`Fichier trop volumineux (max 50MB): ${oversizedFiles[0].name}`);
      return;
    }

    setLoadingPreviews(true);

    try {
      const newAttachments: AttachmentPreview[] = await Promise.all(
        files.map(async (file) => {
          const isImage = file.type.startsWith('image/');
          const isVideo = file.type.startsWith('video/');
          
          let previewUrl: string | undefined;
          let duration: number | undefined;
          let isValidDuration = true;

          if (isImage || isVideo) {
            previewUrl = URL.createObjectURL(file);
          }

          if (isVideo) {
            duration = await getVideoDuration(file);
            isValidDuration = duration <= maxVideoDuration;
            
            if (!isValidDuration) {
              toast.warning(
                `Vidéo "${file.name}" fait ${Math.round(duration)}s (max ${maxVideoDuration}s)`,
                { duration: 5000 }
              );
            }
          }

          return { file, previewUrl, duration, isValidDuration };
        })
      );

      setAttachments(prev => [...prev, ...newAttachments]);
    } catch (error) {
      console.error('Erreur création preview:', error);
    } finally {
      setLoadingPreviews(false);
    }

    if (event.target) event.target.value = '';
  };

  const removeAttachment = (index: number) => {
    const att = attachments[index];
    if (att.previewUrl) URL.revokeObjectURL(att.previewUrl);
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = audioBlob as any as File;
        Object.defineProperty(audioFile, 'name', { value: `vocal_${Date.now()}.webm` });
        
        stream.getTracks().forEach(track => track.stop());
        
        try {
          setIsSending(true);
          await onSendFile(audioFile);
          toast.success('Message vocal envoyé');
        } catch (error: any) {
          toast.error("Erreur lors de l'envoi du message vocal");
        } finally {
          setIsSending(false);
        }
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      toast.success('Enregistrement en cours...');
    } catch (error) {
      console.error('Erreur enregistrement:', error);
      toast.error("Impossible d'accéder au microphone");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <ImageIcon className="w-4 h-4" />;
    if (file.type.startsWith('video/')) return <FileVideo className="w-4 h-4" />;
    if (file.type.startsWith('audio/') || file.name.includes('vocal')) return <Mic className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn("border-t border-border bg-card p-2 space-y-2", className)}>
      {/* Aperçu pièces jointes avec prévisualisation */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 bg-muted/50 rounded-lg border border-border/50">
          {attachments.map((att, index) => {
            const isImage = att.file.type.startsWith('image/');
            const isVideo = att.file.type.startsWith('video/');
            
            return (
              <div 
                key={index} 
                className={cn(
                  "relative rounded-lg border overflow-hidden",
                  isImage || isVideo ? "w-24 h-24" : "flex items-center gap-2 bg-background px-3 py-2 pr-8",
                  !att.isValidDuration && "border-destructive border-2"
                )}
              >
                {/* Prévisualisation image */}
                {isImage && att.previewUrl && (
                  <img 
                    src={att.previewUrl} 
                    alt={att.file.name}
                    className="w-full h-full object-cover"
                  />
                )}
                
                {/* Prévisualisation vidéo */}
                {isVideo && att.previewUrl && (
                  <div className="relative w-full h-full bg-black">
                    <video 
                      src={att.previewUrl} 
                      className="w-full h-full object-cover"
                      muted
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Play className="w-6 h-6 text-white" />
                    </div>
                    {/* Badge durée */}
                    {att.duration !== undefined && (
                      <div className={cn(
                        "absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-xs font-medium",
                        att.isValidDuration 
                          ? "bg-black/70 text-white" 
                          : "bg-destructive text-destructive-foreground"
                      )}>
                        {formatDuration(att.duration)}
                      </div>
                    )}
                    {/* Avertissement durée */}
                    {!att.isValidDuration && (
                      <div className="absolute top-1 left-1">
                        <AlertTriangle className="w-4 h-4 text-destructive" />
                      </div>
                    )}
                  </div>
                )}
                
                {/* Fichier générique */}
                {!isImage && !isVideo && (
                  <>
                    {getFileIcon(att.file)}
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-medium truncate max-w-[150px]">{att.file.name}</span>
                      <span className="text-xs text-muted-foreground">{formatFileSize(att.file.size)}</span>
                    </div>
                  </>
                )}
                
                {/* Bouton supprimer */}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeAttachment(index)}
                  className={cn(
                    "absolute h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive",
                    isImage || isVideo ? "top-0.5 right-0.5 bg-black/50 text-white hover:bg-destructive" : "top-1 right-1"
                  )}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            );
          })}
          
          {loadingPreviews && (
            <div className="w-24 h-24 flex items-center justify-center bg-muted rounded-lg border border-dashed">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      )}

      {/* Zone de saisie */}
      <div className="flex items-center gap-2">
        {/* Inputs cachés */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Boutons actions */}
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => imageInputRef.current?.click()}
            disabled={disabled || isSending}
            title="Ajouter une image"
            className="h-9 w-9"
          >
            <ImageIcon className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => videoInputRef.current?.click()}
            disabled={disabled || isSending}
            title={`Ajouter une vidéo (max ${maxVideoDuration}s)`}
            className="h-9 w-9"
          >
            <FileVideo className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isSending}
            title="Ajouter un fichier"
            className="h-9 w-9"
          >
            <Paperclip className="w-4 h-4" />
          </Button>
        </div>

        {/* Input texte */}
        <Input
          placeholder={placeholder}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={disabled || isSending}
          className="flex-1 bg-muted/50 border-0 focus-visible:ring-1"
        />

        {/* Bouton vocal */}
        <Button
          size="icon"
          variant={isRecording ? "destructive" : "ghost"}
          onClick={isRecording ? stopRecording : startRecording}
          disabled={disabled || isSending}
          title={isRecording ? "Arrêter l'enregistrement" : "Message vocal"}
          className={cn(
            "h-9 w-9",
            isRecording && "animate-pulse"
          )}
        >
          <Mic className="w-4 h-4" />
        </Button>

        {/* Bouton envoi */}
        <Button
          onClick={handleSend}
          disabled={disabled || isSending || (!message.trim() && attachments.length === 0)}
          size="icon"
          className="h-9 w-9 rounded-full flex-shrink-0"
        >
          {isSending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Indication Entrée */}
      {!isRecording && (
        <p className="text-xs text-muted-foreground text-center">
          Appuyez sur Entrée pour envoyer • Vidéos max {maxVideoDuration}s
        </p>
      )}
    </div>
  );
}
