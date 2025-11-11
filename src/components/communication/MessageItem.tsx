import React, { useState } from 'react';
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
import { MoreVertical, Trash2, Copy, Reply, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MessageItemProps {
  message: {
    id: string;
    content: string;
    timestamp: string;
    isOwn: boolean;
    senderName?: string;
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
                    <div key={index} className="flex items-center gap-2 p-2 bg-background/10 rounded">
                      {attachment.type.startsWith('image/') ? (
                        <img 
                          src={attachment.url} 
                          alt={attachment.name}
                          className="max-w-[200px] rounded"
                        />
                      ) : (
                        <a 
                          href={attachment.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs underline"
                        >
                          {attachment.name}
                        </a>
                      )}
                    </div>
                  ))}
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
    </>
  );
}
