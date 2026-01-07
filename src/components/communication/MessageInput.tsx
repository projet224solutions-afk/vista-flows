/**
 * 💬 MESSAGE INPUT PROFESSIONNEL - 224SOLUTIONS
 * Input de message avec upload fichiers, vocal, et emojis
 */

import React, { useState, useRef } from 'react';
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
  File
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageInputProps {
  onSendText: (text: string) => Promise<void>;
  onSendFile: (file: File) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export default function MessageInput({ 
  onSendText,
  onSendFile,
  disabled = false,
  placeholder = "Tapez votre message...",
  className
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleSend = async () => {
    if (isSending) return;

    try {
      setIsSending(true);

      // Envoyer fichiers d'abord
      if (attachments.length > 0) {
        for (const file of attachments) {
          await onSendFile(file);
        }
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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
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

    setAttachments([...attachments, ...files]);
    if (event.target) event.target.value = '';
  };

  const removeAttachment = (index: number) => {
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
        // Créer File avec fallback pour compatibilité
        const audioFile = audioBlob as any as File;
        Object.defineProperty(audioFile, 'name', { value: `vocal_${Date.now()}.webm` });
        
        stream.getTracks().forEach(track => track.stop());
        
        // Envoyer directement
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

  return (
    <div className={cn("border-t border-border bg-card p-3 space-y-3", className)}>
      {/* Aperçu pièces jointes */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 bg-muted/50 rounded-lg border border-border/50">
          {attachments.map((file, index) => (
            <div 
              key={index} 
              className="relative flex items-center gap-2 bg-background rounded px-3 py-2 pr-8 border border-border"
            >
              {getFileIcon(file)}
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-medium truncate max-w-[150px]">{file.name}</span>
                <span className="text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => removeAttachment(index)}
                className="absolute top-1 right-1 h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
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
            title="Ajouter une vidéo"
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
          Appuyez sur Entrée pour envoyer • Shift+Entrée pour une nouvelle ligne
        </p>
      )}
    </div>
  );
}
