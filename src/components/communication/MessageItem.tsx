import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { MoreVertical, Trash2, Copy, Reply, Edit, Download, Play, Pause, Volume2, Volume, FileVideo, Image as ImageIcon, Mic } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface MessageItemProps {
  message: {
    id: string;
    content: string;
    timestamp: string;
    isOwn: boolean;
    senderName?: string;
    type?: 'text' | 'image' | 'video' | 'audio' | 'file';
    file_url?: string;
    file_name?: string;
    file_size?: number;
    attachments?: { type: string; url: string; name: string }[];
  };
  onDelete?: (messageId: string) => void;
  onEdit?: (messageId: string, newContent: string) => void;
  onReply?: (messageId: string) => void;
}

export default function MessageItem({ 
  message, 
  onDelete, 
  onEdit, 
  onReply 
}: MessageItemProps) {
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    return () => {
      // Cleanup audio/video si composant unmount
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (videoRef.current) {
        videoRef.current.pause();
      }
    };
  }, []);

  useEffect(() => {
    // Mettre à jour la durée audio
    const audio = audioRef.current;
    if (audio) {
      const handleLoadedMetadata = () => setAudioDuration(audio.duration);
      const handleTimeUpdate = () => setAudioCurrentTime(audio.currentTime);
      const handleEnded = () => setIsPlayingAudio(false);
      
      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('ended', handleEnded);
      
      return () => {
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('ended', handleEnded);
      };
    }
  }, [message.file_url, message.type]);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    toast({
      title: "Copié",
      description: "Message copié dans le presse-papiers"
    });
  };

  const handleDelete = () => {
    onDelete?.(message.id);
    setShowDeleteDialog(false);
    toast({
      title: "Message supprimé",
      description: "Le message a été supprimé avec succès"
    });
  };

  const handleSaveEdit = () => {
    if (editContent.trim() !== message.content) {
      onEdit?.(message.id, editContent.trim());
      toast({
        title: "Message modifié",
        description: "Le message a été modifié avec succès"
      });
    }
    setIsEditing(false);
  };

  const toggleAudio = () => {
    if (!audioRef.current) return;
    
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  const toggleVideo = () => {
    if (!videoRef.current) return;
    
    if (isPlayingVideo) {
      videoRef.current.pause();
      setIsPlayingVideo(false);
    } else {
      videoRef.current.play();
      setIsPlayingVideo(true);
    }
  };

  const handleImageClick = (url: string) => {
    setPreviewImageUrl(url);
    setShowImagePreview(true);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <>
      <div className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'} group`}>
        <div
          className={`max-w-[70%] p-3 rounded-lg relative ${
            message.isOwn
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted'
          }`}
        >
          {/* Menu d'actions */}
          <div className={`absolute top-2 ${message.isOwn ? 'left-2' : 'right-2'} opacity-0 group-hover:opacity-100 transition-opacity`}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                >
                  <MoreVertical className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={message.isOwn ? "start" : "end"}>
                <DropdownMenuItem onClick={() => onReply?.(message.id)}>
                  <Reply className="w-4 h-4 mr-2" />
                  Répondre
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopy}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copier
                </DropdownMenuItem>
                {message.isOwn && (
                  <>
                    <DropdownMenuItem onClick={() => setIsEditing(true)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Modifier
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setShowDeleteDialog(true)}
                      className="text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Supprimer
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Nom de l'expéditeur (si ce n'est pas le message de l'utilisateur) */}
          {!message.isOwn && message.senderName && (
            <div className="text-xs font-semibold mb-1 opacity-70">
              {message.senderName}
            </div>
          )}

          {/* Contenu du message */}
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full p-2 text-sm rounded border bg-background text-foreground"
                rows={3}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveEdit}>
                  Enregistrer
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                  Annuler
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="text-sm whitespace-pre-wrap break-words">
                {message.content}
              </div>

              {/* Pièces jointes */}
              {message.attachments && message.attachments.length > 0 && (
                <div className="mt-2 space-y-2">
                  {message.attachments.map((attachment, index) => (
                    <div key={index} className="rounded overflow-hidden">
                      {/* Image */}
                      {attachment.type.startsWith('image/') && (
                        <div 
                          className="cursor-pointer hover:opacity-90 transition-opacity relative group"
                          onClick={() => handleImageClick(attachment.url)}
                        >
                          <img 
                            src={attachment.url} 
                            alt={attachment.name}
                            className="max-w-full w-auto max-h-[300px] rounded-lg"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                            <ImageIcon className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                      )}
                      
                      {/* Audio/Vocal */}
                      {(attachment.type.startsWith('audio/') || attachment.type === 'voice' || attachment.name.includes('vocal')) && (
                        <div className="flex items-center gap-2 p-3 bg-background/10 rounded-lg">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={toggleAudio}
                            className="h-10 w-10 rounded-full flex-shrink-0"
                          >
                            {isPlayingAudio ? (
                              <Pause className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                          </Button>
                          
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2">
                              <Mic className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                              <span className="text-xs text-muted-foreground truncate">
                                {attachment.name || 'Message vocal'}
                              </span>
                            </div>
                            
                            {/* Barre de progression */}
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-background/20 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-primary transition-all duration-100"
                                  style={{ 
                                    width: audioDuration > 0 
                                      ? `${(audioCurrentTime / audioDuration) * 100}%` 
                                      : '0%' 
                                  }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground tabular-nums min-w-[35px]">
                                {formatTime(isPlayingAudio ? audioCurrentTime : audioDuration)}
                              </span>
                            </div>
                          </div>
                          
                          <audio 
                            ref={audioRef}
                            src={attachment.url}
                            preload="metadata"
                            className="hidden"
                          />
                        </div>
                      )}
                      
                      {/* Vidéo */}
                      {attachment.type.startsWith('video/') && (
                        <div className="relative rounded-lg overflow-hidden bg-black">
                          <video 
                            ref={videoRef}
                            src={attachment.url}
                            className="w-full max-h-[400px]"
                            controls
                            preload="metadata"
                            onPlay={() => setIsPlayingVideo(true)}
                            onPause={() => setIsPlayingVideo(false)}
                          />
                        </div>
                      )}
                      
                      {/* Fichier générique */}
                      {!attachment.type.startsWith('image/') && 
                       !attachment.type.startsWith('audio/') && 
                       !attachment.type.startsWith('video/') &&
                       attachment.type !== 'voice' &&
                       !attachment.name.includes('vocal') && (
                        <a 
                          href={attachment.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          download={attachment.name}
                          className="flex items-center gap-2 p-2 bg-background/10 rounded hover:bg-background/20 transition-colors"
                        >
                          <Download className="w-4 h-4" />
                          <span className="text-xs underline truncate">
                            {attachment.name}
                          </span>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Support ancien format (file_url direct) */}
              {message.file_url && !message.attachments && (
                <div className="mt-2 rounded overflow-hidden">
                  {/* Image */}
                  {message.type === 'image' && (
                    <div 
                      className="cursor-pointer hover:opacity-90 transition-opacity relative group"
                      onClick={() => handleImageClick(message.file_url!)}
                    >
                      <img 
                        src={message.file_url} 
                        alt={message.file_name || 'Image'}
                        className="max-w-full w-auto max-h-[300px] rounded-lg"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  )}
                  
                  {/* Audio/Vocal */}
                  {message.type === 'audio' && (
                    <div className="flex items-center gap-2 p-3 bg-background/10 rounded-lg">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={toggleAudio}
                        className="h-10 w-10 rounded-full flex-shrink-0"
                      >
                        {isPlayingAudio ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </Button>
                      
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <Mic className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          <span className="text-xs text-muted-foreground truncate">
                            {message.file_name || 'Message vocal'}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-background/20 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary transition-all duration-100"
                              style={{ 
                                width: audioDuration > 0 
                                  ? `${(audioCurrentTime / audioDuration) * 100}%` 
                                  : '0%' 
                              }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground tabular-nums min-w-[35px]">
                            {formatTime(isPlayingAudio ? audioCurrentTime : audioDuration)}
                          </span>
                        </div>
                      </div>
                      
                      <audio 
                        ref={audioRef}
                        src={message.file_url}
                        preload="metadata"
                        className="hidden"
                      />
                    </div>
                  )}
                  
                  {/* Vidéo */}
                  {message.type === 'video' && (
                    <div className="relative rounded-lg overflow-hidden bg-black">
                      <video 
                        ref={videoRef}
                        src={message.file_url}
                        className="w-full max-h-[400px]"
                        controls
                        preload="metadata"
                        onPlay={() => setIsPlayingVideo(true)}
                        onPause={() => setIsPlayingVideo(false)}
                      />
                    </div>
                  )}
                  
                  {/* Fichier */}
                  {message.type === 'file' && (
                    <a 
                      href={message.file_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      download={message.file_name}
                      className="flex items-center gap-2 p-2 bg-background/10 rounded hover:bg-background/20 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span className="text-xs underline truncate">
                        {message.file_name}
                      </span>
                      {message.file_size && (
                        <span className="text-xs text-muted-foreground">
                          ({formatFileSize(message.file_size)})
                        </span>
                      )}
                    </a>
                  )}
                </div>
              )}

              {/* Timestamp */}
              <div className="text-xs opacity-70 mt-1">
                {message.timestamp}
                {isEditing && <span className="ml-2">(modifié)</span>}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce message ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le message sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Preview Image */}
      <Dialog open={showImagePreview} onOpenChange={setShowImagePreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-2">
          {previewImageUrl && (
            <img
              src={previewImageUrl}
              alt="Prévisualisation"
              className="w-full h-auto rounded"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
