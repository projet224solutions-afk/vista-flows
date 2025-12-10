import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { 
  Send, 
  Paperclip, 
  Image as ImageIcon, 
  Mic, 
  Smile,
  X
} from 'lucide-react';

interface ImprovedMessageInputProps {
  onSendMessage: (message: string, attachments?: File[]) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function ImprovedMessageInput({ 
  onSendMessage, 
  disabled = false,
  placeholder = "Tapez votre message..." 
}: ImprovedMessageInputProps) {
  const { toast } = useToast();
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const handleSend = () => {
    if (message.trim() || attachments.length > 0) {
      onSendMessage(message, attachments);
      setMessage('');
      setAttachments([]);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length + attachments.length > 5) {
      toast({
        title: "Limite atteinte",
        description: "Maximum 5 fichiers par message",
        variant: "destructive"
      });
      return;
    }
    setAttachments([...attachments, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const file = new File([blob], `audio_${Date.now()}.webm`, { type: 'audio/webm' });
        setAttachments([...attachments, file]);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'accéder au microphone",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="space-y-3 w-full">
      {/* Aperçu des pièces jointes */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg border border-border/50">
          {attachments.map((file, index) => (
            <div key={index} className="flex items-center gap-2 bg-background px-3 py-2 rounded-md border shadow-sm">
              {file.type.startsWith('image/') ? (
                <ImageIcon className="w-4 h-4 text-primary" />
              ) : file.type.startsWith('audio/') || file.name.startsWith('audio_') ? (
                <Mic className="w-4 h-4 text-orange-500" />
              ) : (
                <Paperclip className="w-4 h-4 text-muted-foreground" />
              )}
              <span className="text-sm truncate max-w-[120px]">{file.name}</span>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                onClick={() => removeAttachment(index)}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Barre de saisie professionnelle */}
      <div className="flex items-end gap-2 p-2 bg-muted/30 rounded-lg border border-border/50">
        {/* Boutons de pièces jointes */}
        <div className="flex gap-1 shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
          
          <Button
            size="icon"
            variant="ghost"
            onClick={() => imageInputRef.current?.click()}
            disabled={disabled}
            title="Ajouter une image"
            className="h-9 w-9 hover:bg-primary/10 hover:text-primary"
          >
            <ImageIcon className="w-5 h-5" />
          </Button>
          
          <Button
            size="icon"
            variant="ghost"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            title="Ajouter un fichier"
            className="h-9 w-9 hover:bg-primary/10 hover:text-primary"
          >
            <Paperclip className="w-5 h-5" />
          </Button>
          
          <Button
            size="icon"
            variant={isRecording ? "destructive" : "ghost"}
            onClick={isRecording ? stopRecording : startRecording}
            disabled={disabled}
            title={isRecording ? "Arrêter l'enregistrement" : "Enregistrer un message vocal"}
            className={`h-9 w-9 ${!isRecording ? 'hover:bg-orange-500/10 hover:text-orange-500' : ''}`}
          >
            <Mic className={`w-5 h-5 ${isRecording ? 'animate-pulse' : ''}`} />
          </Button>
        </div>

        {/* Champ de texte avec style amélioré */}
        <div className="flex-1 min-w-0">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={placeholder}
            disabled={disabled}
            className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-base placeholder:text-muted-foreground/60"
          />
        </div>

        {/* Bouton d'envoi */}
        <Button
          onClick={handleSend}
          disabled={disabled || (!message.trim() && attachments.length === 0)}
          size="icon"
          className="h-9 w-9 shrink-0 bg-primary hover:bg-primary/90"
        >
          <Send className="w-5 h-5" />
        </Button>
      </div>
      
      {/* Indicateur d'enregistrement */}
      {isRecording && (
        <div className="flex items-center gap-2 text-sm text-destructive animate-pulse">
          <div className="w-2 h-2 rounded-full bg-destructive" />
          Enregistrement en cours... Cliquez sur le micro pour arrêter
        </div>
      )}
    </div>
  );
}
