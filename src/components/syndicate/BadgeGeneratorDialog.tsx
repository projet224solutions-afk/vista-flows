/**
 * Dialog pour générer et imprimer les badges taxi-moto
 */

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, Printer, X } from 'lucide-react';
import TaxiMotoBadge from './TaxiMotoBadge';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from 'sonner';

interface BadgeGeneratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleData: {
    id: string;
    member_name: string;
    member_id: string;
    license_plate: string;
    vehicle_type: string;
    badge_generated_at: string;
    digital_badge_id?: string;
    driver_photo_url?: string;
    driver_date_of_birth?: string;
  };
  bureauName?: string;
  bureauCommune?: string;
}

export default function BadgeGeneratorDialog({
  open,
  onOpenChange,
  vehicleData,
  bureauName,
  bureauCommune
}: BadgeGeneratorDialogProps) {
  // Construire le titre du badge basé sur la commune
  const badgeTitle = bureauCommune 
    ? `TAXI-MOTO Bureau Syndicat de ${bureauCommune}` 
    : bureauName 
      ? `TAXI-MOTO Bureau Syndicat de ${bureauName}`
      : 'TAXI-MOTO Bureau Syndicat';
  const badgeRef = useRef<HTMLDivElement>(null);

  // Calculer les dates
  const joinedDate = new Date(vehicleData.badge_generated_at).toLocaleDateString('fr-FR');
  const expireDate = new Date(
    new Date(vehicleData.badge_generated_at).setFullYear(
      new Date(vehicleData.badge_generated_at).getFullYear() + 1
    )
  ).toLocaleDateString('fr-FR');

  const handleDownload = async () => {
    if (!badgeRef.current) return;

    try {
      toast.info('Génération du badge en cours...');
      
      const canvas = await html2canvas(badgeRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false
      });

      // Télécharger en PNG
      const link = document.createElement('a');
      link.download = `badge-${vehicleData.member_id}-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      toast.success('Badge téléchargé avec succès');
    } catch (error) {
      console.error('Error downloading badge:', error);
      toast.error('Erreur lors du téléchargement du badge');
    }
  };

  const handleDownloadPDF = async () => {
    if (!badgeRef.current) return;

    try {
      toast.info('Génération du PDF en cours...');
      
      const canvas = await html2canvas(badgeRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      // Dimensions du badge en mm (A4 landscape: 297 x 210)
      const imgWidth = 200;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const x = (297 - imgWidth) / 2;
      const y = (210 - imgHeight) / 2;

      pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
      pdf.save(`badge-${vehicleData.member_id}-${Date.now()}.pdf`);

      toast.success('Badge PDF téléchargé avec succès');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Erreur lors de la génération du PDF');
    }
  };

  const handlePrint = () => {
    if (!badgeRef.current) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Impossible d\'ouvrir la fenêtre d\'impression');
      return;
    }

    const badgeHtml = badgeRef.current.outerHTML;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Badge ${vehicleData.member_name}</title>
          <style>
            @media print {
              body {
                margin: 0;
                padding: 20px;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
              }
              @page {
                size: landscape;
                margin: 0;
              }
            }
          </style>
          <link rel="stylesheet" href="${window.location.origin}/src/index.css">
        </head>
        <body>
          ${badgeHtml}
        </body>
      </html>
    `);

    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.print();
      toast.success('Badge envoyé à l\'imprimante');
    }, 500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[950px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Badge Professionnel - {vehicleData.member_name}</span>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => onOpenChange(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Aperçu du badge */}
          <div className="flex justify-center bg-gradient-to-br from-gray-100 to-gray-200 p-8 rounded-lg">
            <TaxiMotoBadge
              ref={badgeRef}
              driverName={vehicleData.member_name}
              driverPhoto={vehicleData.driver_photo_url}
              badgeId={vehicleData.digital_badge_id || vehicleData.id}
              memberId={vehicleData.member_id}
              vehicleType={vehicleData.vehicle_type}
              vehiclePlate={vehicleData.license_plate}
              dateOfBirth={vehicleData.driver_date_of_birth ? new Date(vehicleData.driver_date_of_birth).toLocaleDateString('fr-FR') : undefined}
              joinedDate={joinedDate}
              expireDate={expireDate}
              bureauName={bureauCommune || bureauName}
              badgeTitle={badgeTitle}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-center">
            <Button
              onClick={handleDownload}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Télécharger PNG
            </Button>
            <Button
              onClick={handleDownloadPDF}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Télécharger PDF
            </Button>
            <Button
              onClick={handlePrint}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Imprimer
            </Button>
          </div>

          {/* Informations */}
          <div className="text-center text-sm text-muted-foreground space-y-1">
            <p>Badge ID: {vehicleData.digital_badge_id || vehicleData.id}</p>
            <p>Généré le: {joinedDate}</p>
            <p>Valide jusqu'au: {expireDate}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
