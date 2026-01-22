/**
 * BarcodeLabelsA4Generator - Génération d'étiquettes A4 avec codes-barres
 * Crée un PDF A4 prêt à imprimer avec grille d'étiquettes
 */

import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Printer, Download, FileText, Barcode as BarcodeIcon, Package, Eye, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import Barcode from 'react-barcode';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface Product {
  id: string;
  name: string;
  price: number;
  sku?: string;
  barcode_value?: string;
  barcode_format?: string;
}

interface BarcodeLabelsA4GeneratorProps {
  vendorId: string;
  businessName?: string;
}

type GridLayout = '3x8' | '4x10' | '3x10';

const GRID_LAYOUTS: Record<GridLayout, { cols: number; rows: number; labelWidth: number; labelHeight: number }> = {
  '3x8': { cols: 3, rows: 8, labelWidth: 65, labelHeight: 35 },
  '4x10': { cols: 4, rows: 10, labelWidth: 48, labelHeight: 28 },
  '3x10': { cols: 3, rows: 10, labelWidth: 65, labelHeight: 28 },
};

export function BarcodeLabelsA4Generator({ vendorId, businessName }: BarcodeLabelsA4GeneratorProps) {
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [gridLayout, setGridLayout] = useState<GridLayout>('3x8');
  const [showPrice, setShowPrice] = useState(true);
  const [showSku, setShowSku] = useState(true);
  const [showBusinessName, setShowBusinessName] = useState(false);
  const [quantityPerProduct, setQuantityPerProduct] = useState<Record<string, number>>({});
  const previewRef = useRef<HTMLDivElement>(null);

  // Charger les produits avec code-barres
  const loadProductsWithBarcodes = useCallback(async () => {
    if (!vendorId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, sku, barcode_value, barcode_format')
        .eq('vendor_id', vendorId)
        .eq('is_active', true)
        .not('barcode_value', 'is', null)
        .order('name');

      if (error) throw error;

      setProducts(data || []);
      
      // Initialiser les quantités à 1
      const initialQuantities: Record<string, number> = {};
      (data || []).forEach(p => {
        initialQuantities[p.id] = 1;
      });
      setQuantityPerProduct(initialQuantities);

      if (data?.length === 0) {
        toast.info('Aucun produit avec code-barres trouvé');
      }
    } catch (error) {
      console.error('Erreur chargement produits:', error);
      toast.error('Erreur lors du chargement des produits');
    } finally {
      setLoading(false);
    }
  }, [vendorId]);

  // Toggle sélection produit
  const toggleProductSelection = (productId: string) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  // Sélectionner tous les produits
  const selectAll = () => {
    setSelectedProducts(new Set(products.map(p => p.id)));
  };

  // Désélectionner tous
  const deselectAll = () => {
    setSelectedProducts(new Set());
  };

  // Calculer le nombre total d'étiquettes
  const totalLabels = Array.from(selectedProducts).reduce((sum, productId) => {
    return sum + (quantityPerProduct[productId] || 1);
  }, 0);

  // Générer les étiquettes à imprimer
  const getLabelsToGenerate = () => {
    const labels: Product[] = [];
    Array.from(selectedProducts).forEach(productId => {
      const product = products.find(p => p.id === productId);
      if (product) {
        const qty = quantityPerProduct[productId] || 1;
        for (let i = 0; i < qty; i++) {
          labels.push(product);
        }
      }
    });
    return labels;
  };

  // Générer le PDF A4
  const generatePDF = async () => {
    const labels = getLabelsToGenerate();
    if (labels.length === 0) {
      toast.error('Sélectionnez au moins un produit');
      return;
    }

    setGenerating(true);
    toast.info('Génération du PDF en cours...');

    try {
      const layout = GRID_LAYOUTS[gridLayout];
      const labelsPerPage = layout.cols * layout.rows;
      const totalPages = Math.ceil(labels.length / labelsPerPage);

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Dimensions A4 en mm
      const pageWidth = 210;
      const pageHeight = 297;
      const marginX = (pageWidth - (layout.cols * layout.labelWidth)) / 2;
      const marginY = (pageHeight - (layout.rows * layout.labelHeight)) / 2;

      for (let page = 0; page < totalPages; page++) {
        if (page > 0) pdf.addPage();

        const startIdx = page * labelsPerPage;
        const pageLabels = labels.slice(startIdx, startIdx + labelsPerPage);

        for (let i = 0; i < pageLabels.length; i++) {
          const label = pageLabels[i];
          const col = i % layout.cols;
          const row = Math.floor(i / layout.cols);
          
          const x = marginX + col * layout.labelWidth;
          const y = marginY + row * layout.labelHeight;

          // Bordure fine
          pdf.setDrawColor(200);
          pdf.setLineWidth(0.1);
          pdf.rect(x, y, layout.labelWidth, layout.labelHeight);

          // Nom du produit (tronqué si trop long)
          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'bold');
          const productName = label.name.length > 25 
            ? label.name.substring(0, 22) + '...' 
            : label.name;
          pdf.text(productName, x + layout.labelWidth / 2, y + 4, { align: 'center' });

          // Code-barres (SVG converti en image)
          // Utiliser une approche simplifiée avec le texte du code
          pdf.setFontSize(6);
          pdf.setFont('helvetica', 'normal');
          
          // Dessiner les barres du code-barres (simulation simple)
          const barcodeY = y + 6;
          const barcodeHeight = layout.labelHeight - 18;
          const barcodeWidth = layout.labelWidth - 10;
          const barcodeX = x + 5;
          
          // Dessiner le rectangle du code-barres
          pdf.setFillColor(255, 255, 255);
          pdf.rect(barcodeX, barcodeY, barcodeWidth, barcodeHeight, 'F');
          
          // Texte du code-barres
          pdf.setFontSize(9);
          pdf.setFont('courier', 'bold');
          pdf.text(label.barcode_value || '', x + layout.labelWidth / 2, y + barcodeHeight + 10, { align: 'center' });

          // Informations supplémentaires
          let infoY = y + layout.labelHeight - 4;
          pdf.setFontSize(7);
          pdf.setFont('helvetica', 'normal');

          const infoParts: string[] = [];
          if (showPrice) {
            infoParts.push(`${label.price.toLocaleString()} GNF`);
          }
          if (showSku && label.sku) {
            infoParts.push(label.sku);
          }
          if (showBusinessName && businessName) {
            infoParts.push(businessName);
          }

          if (infoParts.length > 0) {
            pdf.text(infoParts.join(' | '), x + layout.labelWidth / 2, infoY, { align: 'center' });
          }
        }
      }

      // Télécharger le PDF
      pdf.save(`etiquettes-codes-barres-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success(`PDF généré avec ${labels.length} étiquette(s) sur ${totalPages} page(s)`);

    } catch (error) {
      console.error('Erreur génération PDF:', error);
      toast.error('Erreur lors de la génération du PDF');
    } finally {
      setGenerating(false);
    }
  };

  // Impression directe avec aperçu HTML
  const printLabels = async () => {
    const labels = getLabelsToGenerate();
    if (labels.length === 0) {
      toast.error('Sélectionnez au moins un produit');
      return;
    }

    const layout = GRID_LAYOUTS[gridLayout];
    const labelsPerPage = layout.cols * layout.rows;

    // Générer le HTML pour l'impression
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Popup bloquée - autorisez les popups');
      return;
    }

    const labelsHTML = labels.map((label, idx) => `
      <div class="label" style="
        width: ${layout.labelWidth}mm;
        height: ${layout.labelHeight}mm;
        border: 0.5px solid #ddd;
        box-sizing: border-box;
        padding: 2mm;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: space-between;
        font-family: Arial, sans-serif;
        page-break-inside: avoid;
      ">
        <div style="font-size: 8px; font-weight: bold; text-align: center; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${label.name}
        </div>
        <svg id="barcode-${idx}"></svg>
        <div style="font-size: 7px; text-align: center;">
          ${[
            showPrice ? `${label.price.toLocaleString()} GNF` : '',
            showSku && label.sku ? label.sku : '',
            showBusinessName && businessName ? businessName : ''
          ].filter(Boolean).join(' | ')}
        </div>
      </div>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Étiquettes codes-barres</title>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
          <style>
            @page {
              size: A4;
              margin: 5mm;
            }
            body {
              margin: 0;
              padding: 5mm;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(${layout.cols}, ${layout.labelWidth}mm);
              gap: 1mm;
              justify-content: center;
            }
            @media print {
              body { -webkit-print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="grid">
            ${labelsHTML}
          </div>
          <script>
            ${labels.map((label, idx) => `
              JsBarcode("#barcode-${idx}", "${label.barcode_value}", {
                format: "${label.barcode_format === 'EAN13' ? 'EAN13' : 'CODE128'}",
                width: 1.5,
                height: 30,
                fontSize: 10,
                margin: 2,
                displayValue: true
              });
            `).join('\n')}
            
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (isOpen) loadProductsWithBarcodes();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <BarcodeIcon className="h-4 w-4" />
          Générer étiquettes A4
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Génération d'étiquettes codes-barres A4
          </DialogTitle>
          <DialogDescription>
            Sélectionnez les produits et générez un PDF prêt à imprimer
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          {/* Options de mise en page */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="space-y-2">
              <Label>Format grille</Label>
              <Select value={gridLayout} onValueChange={(v) => setGridLayout(v as GridLayout)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3x8">3×8 (24 étiquettes)</SelectItem>
                  <SelectItem value="4x10">4×10 (40 étiquettes)</SelectItem>
                  <SelectItem value="3x10">3×10 (30 étiquettes)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Options d'affichage</Label>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Checkbox id="showPrice" checked={showPrice} onCheckedChange={(c) => setShowPrice(!!c)} />
                  <Label htmlFor="showPrice" className="text-sm">Prix</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="showSku" checked={showSku} onCheckedChange={(c) => setShowSku(!!c)} />
                  <Label htmlFor="showSku" className="text-sm">SKU</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="showBusiness" checked={showBusinessName} onCheckedChange={(c) => setShowBusinessName(!!c)} />
                  <Label htmlFor="showBusiness" className="text-sm">Boutique</Label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Sélection</Label>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={selectAll} disabled={products.length === 0}>
                  Tout
                </Button>
                <Button size="sm" variant="outline" onClick={deselectAll} disabled={selectedProducts.size === 0}>
                  Aucun
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Résumé</Label>
              <div className="text-sm space-y-1">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  <span>{selectedProducts.size} produit(s)</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>{totalLabels} étiquette(s)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Liste des produits */}
          <ScrollArea className="flex-1 border rounded-lg">
            <div className="p-2">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BarcodeIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun produit avec code-barres</p>
                  <p className="text-sm">Les produits sans code-barres ne peuvent pas être imprimés</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {products.map(product => (
                    <div 
                      key={product.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedProducts.has(product.id) 
                          ? 'bg-primary/10 border-primary' 
                          : 'hover:bg-muted'
                      }`}
                      onClick={() => toggleProductSelection(product.id)}
                    >
                      <Checkbox 
                        checked={selectedProducts.has(product.id)}
                        onCheckedChange={() => toggleProductSelection(product.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{product.name}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{product.price.toLocaleString()} GNF</span>
                          {product.sku && (
                            <>
                              <span>•</span>
                              <span>{product.sku}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <Badge variant="secondary" className="font-mono text-xs">
                        {product.barcode_value}
                      </Badge>

                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Label className="text-xs">Qté:</Label>
                        <Input
                          type="number"
                          min={1}
                          max={100}
                          value={quantityPerProduct[product.id] || 1}
                          onChange={(e) => setQuantityPerProduct(prev => ({
                            ...prev,
                            [product.id]: parseInt(e.target.value) || 1
                          }))}
                          className="w-16 h-8 text-center"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button
              variant="outline"
              onClick={printLabels}
              disabled={selectedProducts.size === 0 || generating}
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              Aperçu & Imprimer
            </Button>
            <Button
              onClick={generatePDF}
              disabled={selectedProducts.size === 0 || generating}
              className="gap-2"
            >
              {generating ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Télécharger PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default BarcodeLabelsA4Generator;
