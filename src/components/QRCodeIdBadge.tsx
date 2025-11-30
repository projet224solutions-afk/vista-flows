/**
 * 📱 QR CODE ID BADGE - 224SOLUTIONS
 * Badge ID avec génération QR code pour partage physique/scan
 */

import React, { useState } from 'react';
import { Hash, QrCode, Copy, Check, Download, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface QRCodeIdBadgeProps {
  id: string;
  userName?: string;
  userRole?: string;
  size?: 'sm' | 'md' | 'lg';
  showQrButton?: boolean;
  className?: string;
}

export function QRCodeIdBadge({
  id,
  userName,
  userRole,
  size = 'md',
  showQrButton = true,
  className = '',
}: QRCodeIdBadgeProps) {
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  // Tailles selon le variant
  const sizes = {
    sm: { text: 'text-xs', icon: 12, padding: 'px-2 py-1', qr: 150 },
    md: { text: 'text-sm', icon: 14, padding: 'px-3 py-1.5', qr: 200 },
    lg: { text: 'text-base', icon: 16, padding: 'px-4 py-2', qr: 250 },
  };

  const currentSize = sizes[size];

  // Copier l'ID
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      toast.success('ID copié!', {
        description: `${id} copié dans le presse-papier`,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Erreur copie', {
        description: 'Impossible de copier l\'ID',
      });
    }
  };

  // Télécharger le QR code
  const handleDownload = () => {
    const svg = document.getElementById('qr-code-svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `QR-${id}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();

      toast.success('QR code téléchargé!');
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  // Partager le QR code
  const handleShare = async () => {
    const shareData = {
      title: `224Solutions - ${userName || 'Utilisateur'}`,
      text: `Mon ID: ${id}`,
      url: `https://224solutions.com/user/${id}`,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        toast.success('Partagé avec succès!');
      } else {
        // Fallback: copier l'URL
        await navigator.clipboard.writeText(shareData.url);
        toast.success('Lien copié!', {
          description: 'Le lien a été copié dans le presse-papier',
        });
      }
    } catch (error) {
      console.error('Erreur partage:', error);
    }
  };

  // Format d'affichage de l'ID
  const formatId = (rawId: string) => {
    // Format USR0001 ou 224-XXX-XXX
    if (rawId.includes('-')) {
      const parts = rawId.split('-');
      return (
        <>
          <span className="text-orange-600 font-bold">{parts[0]}</span>
          <span className="text-gray-400">-</span>
          <span className="text-green-600 font-mono">{parts[1]}</span>
          <span className="text-gray-400">-</span>
          <span className="text-orange-600 font-mono">{parts[2]}</span>
        </>
      );
    } else {
      // Format AAA0001
      const prefix = rawId.substring(0, 3);
      const number = rawId.substring(3);
      return (
        <>
          <span className="text-orange-600 font-bold">{prefix}</span>
          <span className="text-green-600 font-mono">{number}</span>
        </>
      );
    }
  };

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {/* Badge ID */}
      <div
        className={`inline-flex items-center gap-2 bg-gradient-to-r from-orange-50 to-green-50 
          border border-orange-200 rounded-lg ${currentSize.padding} ${currentSize.text}
          hover:shadow-md transition-all cursor-pointer group`}
        onClick={handleCopy}
      >
        <Hash size={currentSize.icon} className="text-orange-500 flex-shrink-0" />
        <span className="font-semibold select-none">{formatId(id)}</span>
        {copied ? (
          <Check size={currentSize.icon} className="text-green-600 flex-shrink-0" />
        ) : (
          <Copy
            size={currentSize.icon}
            className="text-gray-400 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          />
        )}
      </div>

      {/* Bouton QR Code */}
      {showQrButton && (
        <Dialog open={qrOpen} onOpenChange={setQrOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size={size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'default'}
              className="gap-2"
            >
              <QrCode size={currentSize.icon} />
              <span className="hidden sm:inline">QR</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>QR Code - {id}</DialogTitle>
              <DialogDescription>
                {userName && `${userName} - `}
                {userRole && `${userRole}`}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center gap-4 py-4">
              {/* QR Code */}
              <div className="p-4 bg-white rounded-lg border-2 border-orange-200">
                <QRCodeSVG
                  id="qr-code-svg"
                  value={`https://224solutions.com/user/${id}`}
                  size={currentSize.qr}
                  level="H"
                  includeMargin
                  imageSettings={{
                    src: '/lovable-uploads/224-logo.png',
                    height: 40,
                    width: 40,
                    excavate: true,
                  }}
                />
              </div>

              {/* ID affiché */}
              <div className="text-center">
                <p className="text-2xl font-bold tracking-wider">{formatId(id)}</p>
                {userName && (
                  <p className="text-sm text-gray-600 mt-1">{userName}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 w-full">
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={handleDownload}
                >
                  <Download size={16} />
                  Télécharger
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={handleShare}
                >
                  <Share2 size={16} />
                  Partager
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={handleCopy}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  Copier
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
