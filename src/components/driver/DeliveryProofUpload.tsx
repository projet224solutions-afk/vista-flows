/**
 * COMPOSANT UPLOAD PREUVE DE LIVRAISON
 * Photo + Signature client
 */

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, Check, Upload } from 'lucide-react';
import { toast } from 'sonner';

interface DeliveryProofUploadProps {
  deliveryId: string;
  onProofUploaded: (photoUrl: string, signature: string) => void;
}

export function DeliveryProofUpload({ deliveryId, onProofUploaded }: DeliveryProofUploadProps) {
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [signature, setSignature] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!photoPreview) {
      toast.error('Veuillez prendre une photo de la livraison');
      return;
    }

    if (!signature) {
      toast.error('La signature du client est requise');
      return;
    }

    setUploading(true);
    try {
      // Simuler l'upload (à remplacer par votre logique d'upload réelle)
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      onProofUploaded(photoPreview, signature);
      toast.success('✅ Preuve enregistrée avec succès !');
    } catch (error) {
      console.error('Error uploading proof:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setUploading(false);
    }
  };

  // Gestion de la signature canvas
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.strokeStyle = '#007BFF';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Enregistrer la signature
    setSignature(canvas.toDataURL());
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignature('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Confirmation de livraison</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Photo de preuve */}
        <div className="space-y-3">
          <label className="text-sm font-medium">📸 Photo de la livraison</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoChange}
            className="hidden"
          />
          
          {photoPreview ? (
            <div className="relative">
              <img
                src={photoPreview}
                alt="Preuve de livraison"
                className="w-full h-48 object-cover rounded-lg border"
              />
              <Button
                size="sm"
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
                className="absolute top-2 right-2"
              >
                <Camera className="h-4 w-4 mr-2" />
                Reprendre
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-32 border-dashed"
            >
              <div className="flex flex-col items-center gap-2">
                <Camera className="h-8 w-8 text-muted-foreground" />
                <span>Prendre une photo</span>
              </div>
            </Button>
          )}
        </div>

        {/* Signature client */}
        <div className="space-y-3">
          <label className="text-sm font-medium">✍️ Signature du client</label>
          <div className="border rounded-lg p-2 bg-white">
            <canvas
              ref={canvasRef}
              width={400}
              height={150}
              className="w-full cursor-crosshair"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
          </div>
          {signature && (
            <Button
              size="sm"
              variant="outline"
              onClick={clearSignature}
              className="w-full"
            >
              Effacer la signature
            </Button>
          )}
        </div>

        {/* Bouton de soumission */}
        <Button
          onClick={handleSubmit}
          disabled={uploading || !photoPreview || !signature}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          {uploading ? (
            <>
              <Upload className="h-4 w-4 mr-2 animate-spin" />
              Envoi en cours...
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" />
              Confirmer la livraison
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
