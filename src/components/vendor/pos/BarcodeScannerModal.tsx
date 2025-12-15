import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Scan, 
  Camera, 
  Usb, 
  AlertTriangle, 
  Check, 
  X, 
  Package, 
  Eye,
  RefreshCw,
  Loader2,
  Plus,
  Minus,
  ShoppingCart
} from 'lucide-react';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  price: number;
  images?: string[];
  category: string;
  categoryId?: string | null;
  stock: number;
  barcode?: string;
  sell_by_carton?: boolean;
  units_per_carton?: number;
  price_carton?: number;
}

interface BarcodeScannerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  onAddToCart: (product: Product, quantity?: number) => void;
  onAddToCartByCarton: (product: Product, cartonCount?: number) => void;
}

type ScanMode = 'select' | 'external' | 'camera';
type VerificationState = 'idle' | 'scanning' | 'found' | 'verifying' | 'confirmed' | 'mismatch';

export function BarcodeScannerModal({
  open,
  onOpenChange,
  products,
  onAddToCart,
  onAddToCartByCarton
}: BarcodeScannerModalProps) {
  const [scanMode, setScanMode] = useState<ScanMode>('select');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [foundProduct, setFoundProduct] = useState<Product | null>(null);
  const [verificationState, setVerificationState] = useState<VerificationState>('idle');
  const [quantity, setQuantity] = useState(1);
  const [saleType, setSaleType] = useState<'unit' | 'carton'>('unit');
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const externalInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!open) {
      resetState();
      stopCamera();
    }
  }, [open]);

  const resetState = () => {
    setScanMode('select');
    setBarcodeInput('');
    setFoundProduct(null);
    setVerificationState('idle');
    setQuantity(1);
    setSaleType('unit');
    setIsProcessing(false);
  };

  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  }, [cameraStream]);

  // Handle external scanner input
  const handleExternalScan = useCallback((barcode: string) => {
    if (!barcode.trim()) return;
    
    setVerificationState('scanning');
    setIsProcessing(true);
    
    // Rechercher le produit par code-barres
    const product = products.find(p => p.barcode === barcode.trim());
    
    setTimeout(() => {
      if (product) {
        setFoundProduct(product);
        setVerificationState('found');
        
        // Vérifier si le produit a une image pour la vérification visuelle
        if (product.images && product.images.length > 0) {
          setVerificationState('verifying');
        } else {
          // Pas d'image, confirmer directement
          setVerificationState('confirmed');
        }
      } else {
        toast.error('Produit non trouvé', {
          description: `Aucun produit avec le code-barres "${barcode}" n'a été trouvé.`
        });
        setVerificationState('idle');
      }
      setBarcodeInput('');
      setIsProcessing(false);
    }, 500);
  }, [products]);

  // Confirmation visuelle du produit
  const confirmVisualMatch = () => {
    setVerificationState('confirmed');
    toast.success('Produit vérifié visuellement');
  };

  const reportVisualMismatch = () => {
    setVerificationState('mismatch');
    toast.warning('Discordance visuelle détectée', {
      description: 'Veuillez vérifier le produit manuellement.'
    });
  };

  // Ajouter au panier
  const handleAddToCart = () => {
    if (!foundProduct) return;

    if (saleType === 'carton' && foundProduct.sell_by_carton) {
      onAddToCartByCarton(foundProduct, quantity);
    } else {
      onAddToCart(foundProduct, quantity);
    }

    toast.success(`${foundProduct.name} ajouté au panier`, {
      description: saleType === 'carton' 
        ? `${quantity} carton(s)` 
        : `${quantity} unité(s)`
    });

    // Réinitialiser pour un nouveau scan
    setFoundProduct(null);
    setVerificationState('idle');
    setQuantity(1);
    setSaleType('unit');
    
    // Focus pour le prochain scan
    if (scanMode === 'external') {
      externalInputRef.current?.focus();
    }
  };

  // Start camera for barcode scanning
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      setCameraStream(stream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      
      toast.info('Caméra activée', {
        description: 'Pointez vers le code-barres du produit'
      });
    } catch (error) {
      console.error('Erreur accès caméra:', error);
      toast.error('Impossible d\'accéder à la caméra');
      setScanMode('select');
    }
  };

  // Handle keyboard input for external scanner
  useEffect(() => {
    if (scanMode !== 'external') return;

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && barcodeInput) {
        handleExternalScan(barcodeInput);
      }
    };

    document.addEventListener('keypress', handleKeyPress);
    return () => document.removeEventListener('keypress', handleKeyPress);
  }, [scanMode, barcodeInput, handleExternalScan]);

  // Focus input when external mode is selected
  useEffect(() => {
    if (scanMode === 'external') {
      setTimeout(() => externalInputRef.current?.focus(), 100);
    }
  }, [scanMode]);

  // Start camera when camera mode is selected
  useEffect(() => {
    if (scanMode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
  }, [scanMode, stopCamera]);

  // Calculate max quantity based on stock and sale type
  const getMaxQuantity = () => {
    if (!foundProduct) return 1;
    if (saleType === 'carton' && foundProduct.units_per_carton) {
      return Math.floor(foundProduct.stock / foundProduct.units_per_carton);
    }
    return foundProduct.stock;
  };

  // Check if can sell by carton
  const canSellByCarton = foundProduct?.sell_by_carton && 
                          foundProduct.units_per_carton && 
                          foundProduct.stock >= foundProduct.units_per_carton;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scan className="h-5 w-5 text-primary" />
            Scanner un produit
          </DialogTitle>
        </DialogHeader>

        {/* Mode Selection */}
        {scanMode === 'select' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Choisissez votre méthode de scan :
            </p>
            
            <div className="grid grid-cols-1 gap-3">
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center justify-center gap-2 border-2 hover:border-primary hover:bg-primary/5 transition-all"
                onClick={() => setScanMode('external')}
              >
                <Usb className="h-8 w-8 text-primary" />
                <div className="text-center">
                  <div className="font-semibold">Appareil externe</div>
                  <div className="text-xs text-muted-foreground">USB / Bluetooth</div>
                </div>
              </Button>
              
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center justify-center gap-2 border-2 hover:border-primary hover:bg-primary/5 transition-all"
                onClick={() => setScanMode('camera')}
              >
                <Camera className="h-8 w-8 text-primary" />
                <div className="text-center">
                  <div className="font-semibold">Caméra téléphone / tablette</div>
                  <div className="text-xs text-muted-foreground">Scan avec la caméra</div>
                </div>
              </Button>
            </div>
          </div>
        )}

        {/* External Scanner Mode */}
        {scanMode === 'external' && !foundProduct && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setScanMode('select')}
              >
                ← Retour
              </Button>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Usb className="h-3 w-3" />
                Mode appareil externe
              </Badge>
            </div>

            <Card className="border-2 border-dashed border-primary/50 bg-primary/5">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                  {isProcessing ? (
                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
                  ) : (
                    <Scan className="h-8 w-8 text-primary animate-pulse" />
                  )}
                </div>
                
                <h3 className="font-semibold mb-2">
                  {isProcessing ? 'Recherche du produit...' : 'En attente de scan...'}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Scannez le code-barres avec votre appareil externe
                </p>
                
                <Input
                  ref={externalInputRef}
                  placeholder="Le code-barres apparaîtra ici..."
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  className="text-center font-mono text-lg"
                  autoFocus
                />
                
                <Button 
                  className="mt-4"
                  onClick={() => handleExternalScan(barcodeInput)}
                  disabled={!barcodeInput.trim() || isProcessing}
                >
                  Rechercher manuellement
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Camera Scanner Mode */}
        {scanMode === 'camera' && !foundProduct && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setScanMode('select')}
              >
                ← Retour
              </Button>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Camera className="h-3 w-3" />
                Mode caméra
              </Badge>
            </div>

            <Card className="overflow-hidden">
              <CardContent className="p-0 relative">
                <video 
                  ref={videoRef} 
                  className="w-full aspect-video bg-black object-cover"
                  playsInline
                  muted
                />
                <canvas ref={canvasRef} className="hidden" />
                
                {/* Overlay de visée */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-3/4 h-1/3 border-2 border-primary rounded-lg relative">
                    <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-primary rounded-tl" />
                    <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-primary rounded-tr" />
                    <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-primary rounded-bl" />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-primary rounded-br" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-3">
                Positionnez le code-barres dans le cadre
              </p>
              
              <div className="flex gap-2 justify-center">
                <Input
                  placeholder="Ou saisissez le code manuellement"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  className="max-w-[200px] text-center font-mono"
                />
                <Button 
                  onClick={() => handleExternalScan(barcodeInput)}
                  disabled={!barcodeInput.trim()}
                >
                  Rechercher
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Product Found - Visual Verification */}
        {foundProduct && (verificationState === 'found' || verificationState === 'verifying') && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="outline" className="flex items-center gap-1 bg-amber-50 text-amber-700 border-amber-300">
                <Eye className="h-3 w-3" />
                Vérification visuelle requise
              </Badge>
            </div>

            <Card className="border-2 border-amber-300 bg-amber-50/50">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {/* Image produit */}
                  <div className="w-24 h-24 bg-white rounded-lg overflow-hidden border flex-shrink-0">
                    {foundProduct.images && foundProduct.images.length > 0 ? (
                      <img 
                        src={foundProduct.images[0]} 
                        alt={foundProduct.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-8 w-8 text-muted-foreground/50" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{foundProduct.name}</h3>
                    <p className="text-sm text-muted-foreground">{foundProduct.category}</p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-xl font-bold text-primary">
                        {foundProduct.price.toLocaleString()} GNF
                      </span>
                      <span className="text-xs text-muted-foreground">/unité</span>
                    </div>
                    <Badge variant="secondary" className="mt-2">
                      Stock: {foundProduct.stock} unités
                    </Badge>
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="text-center">
                  <p className="text-sm font-medium text-amber-700 mb-3">
                    <AlertTriangle className="inline h-4 w-4 mr-1" />
                    Le produit scanné correspond-il à l'image ci-dessus ?
                  </p>
                  
                  <div className="flex gap-3 justify-center">
                    <Button
                      variant="outline"
                      className="border-red-300 text-red-600 hover:bg-red-50"
                      onClick={reportVisualMismatch}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Non, différent
                    </Button>
                    <Button
                      className="bg-green-600 hover:bg-green-700"
                      onClick={confirmVisualMatch}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Oui, correct
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Visual Mismatch Warning */}
        {foundProduct && verificationState === 'mismatch' && (
          <div className="space-y-4">
            <Card className="border-2 border-red-300 bg-red-50/50">
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-3 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertTriangle className="h-8 w-8 text-red-600" />
                  </div>
                  <h3 className="font-semibold text-red-700 mb-2">
                    Discordance détectée
                  </h3>
                  <p className="text-sm text-red-600 mb-4">
                    Le produit physique ne correspond pas à l'image enregistrée.
                    Veuillez vérifier manuellement ou rescanner.
                  </p>
                  
                  <div className="flex gap-3 justify-center">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setFoundProduct(null);
                        setVerificationState('idle');
                        if (scanMode === 'external') {
                          externalInputRef.current?.focus();
                        }
                      }}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Rescanner
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={confirmVisualMatch}
                    >
                      Confirmer malgré tout
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Product Confirmed - Add to Cart */}
        {foundProduct && verificationState === 'confirmed' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="outline" className="flex items-center gap-1 bg-green-50 text-green-700 border-green-300">
                <Check className="h-3 w-3" />
                Produit vérifié
              </Badge>
            </div>

            <Card className="border-2 border-green-300 bg-green-50/50">
              <CardContent className="p-4">
                <div className="flex gap-4 mb-4">
                  {/* Image produit */}
                  <div className="w-20 h-20 bg-white rounded-lg overflow-hidden border flex-shrink-0">
                    {foundProduct.images && foundProduct.images.length > 0 ? (
                      <img 
                        src={foundProduct.images[0]} 
                        alt={foundProduct.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-6 w-6 text-muted-foreground/50" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-semibold">{foundProduct.name}</h3>
                    <p className="text-sm text-muted-foreground">{foundProduct.category}</p>
                    <Badge variant="secondary" className="mt-1">
                      Stock: {foundProduct.stock}
                    </Badge>
                  </div>
                </div>

                <Separator className="my-4" />

                {/* Type de vente */}
                <div className="space-y-3">
                  <label className="text-sm font-medium">Type de vente :</label>
                  <div className="flex gap-2">
                    <Button
                      variant={saleType === 'unit' ? 'default' : 'outline'}
                      className="flex-1"
                      onClick={() => {
                        setSaleType('unit');
                        setQuantity(1);
                      }}
                    >
                      <Package className="h-4 w-4 mr-2" />
                      Unité
                      <span className="ml-2 text-xs opacity-75">
                        {foundProduct.price.toLocaleString()} GNF
                      </span>
                    </Button>
                    
                    {canSellByCarton && (
                      <Button
                        variant={saleType === 'carton' ? 'default' : 'outline'}
                        className="flex-1"
                        onClick={() => {
                          setSaleType('carton');
                          setQuantity(1);
                        }}
                      >
                        📦 Carton
                        <span className="ml-2 text-xs opacity-75">
                          {(foundProduct.price_carton || foundProduct.price * (foundProduct.units_per_carton || 1)).toLocaleString()} GNF
                        </span>
                      </Button>
                    )}
                  </div>
                  
                  {saleType === 'carton' && foundProduct.units_per_carton && (
                    <p className="text-xs text-muted-foreground text-center">
                      1 carton = {foundProduct.units_per_carton} unités
                    </p>
                  )}
                </div>

                <Separator className="my-4" />

                {/* Quantité */}
                <div className="space-y-3">
                  <label className="text-sm font-medium">Quantité :</label>
                  <div className="flex items-center justify-center gap-4">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      disabled={quantity <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    
                    <div className="w-20">
                      <Input
                        type="number"
                        min={1}
                        max={getMaxQuantity()}
                        value={quantity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1;
                          setQuantity(Math.min(Math.max(1, val), getMaxQuantity()));
                        }}
                        className="text-center text-lg font-bold"
                      />
                    </div>
                    
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setQuantity(q => Math.min(getMaxQuantity(), q + 1))}
                      disabled={quantity >= getMaxQuantity()}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {quantity >= getMaxQuantity() && (
                    <p className="text-xs text-amber-600 text-center">
                      Stock maximum atteint
                    </p>
                  )}
                </div>

                <Separator className="my-4" />

                {/* Total et ajout au panier */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center bg-primary/5 p-3 rounded-lg">
                    <span className="font-medium">Total :</span>
                    <span className="text-xl font-bold text-primary">
                      {(saleType === 'carton'
                        ? (foundProduct.price_carton || foundProduct.price * (foundProduct.units_per_carton || 1)) * quantity
                        : foundProduct.price * quantity
                      ).toLocaleString()} GNF
                    </span>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setFoundProduct(null);
                        setVerificationState('idle');
                        if (scanMode === 'external') {
                          externalInputRef.current?.focus();
                        }
                      }}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Scanner autre
                    </Button>
                    
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={handleAddToCart}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Ajouter au panier
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
