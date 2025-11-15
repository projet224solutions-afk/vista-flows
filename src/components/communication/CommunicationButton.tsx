/**
 * 💬 BOUTON COMMUNICATION - 224SOLUTIONS
 * Composant React pour initier une conversation
 */

import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { MessageSquare, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface CommunicationButtonProps {
  userId: string;
  targetId: string;
  label?: string;
  initialText?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  showIcon?: boolean;
}

export function CommunicationButton({
  userId,
  targetId,
  label = 'Contacter',
  initialText = 'Bonjour',
  variant = 'default',
  size = 'default',
  className = '',
  showIcon = true
}: CommunicationButtonProps) {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleClick = async () => {
    if (!userId || !targetId) {
      toast.error('Informations utilisateur manquantes');
      return;
    }

    setLoading(true);

    try {
      console.log('📨 Création conversation...');

      // Call edge function to create conversation
      const { data, error } = await supabase.functions.invoke('communication-handler', {
        body: {
          userId,
          targetId,
          initialMessage: { text: initialText }
        }
      });

      if (error) {
        throw error;
      }

      console.log('✅ Conversation créée:', data);

      // Navigate to conversation
      if (data.conversationId) {
        navigate(`/communication/direct_${targetId}`);
        toast.success('Conversation démarrée');
      }

    } catch (err: any) {
      console.error('❌ Erreur création conversation:', err);
      toast.error(err.message || 'Échec de la création de conversation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={loading}
      variant={variant}
      size={size}
      className={className}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Envoi...
        </>
      ) : (
        <>
          {showIcon && <MessageSquare className="w-4 h-4 mr-2" />}
          {label}
        </>
      )}
    </Button>
  );
}

export default CommunicationButton;
