/**
 * VENDOR KYC REVIEW - INTERFACE CEO
 * Permet au CEO d'approuver/rejeter les KYC soumis par les vendeurs
 * 224SOLUTIONS
 */

import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  CheckCircle2, 
  XCircle, 
  Eye,
  FileText,
  Phone,
  User,
  AlertTriangle,
  Clock,
  Download
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VendorKYC {
  id: string;
  vendor_id: string;
  status: 'pending' | 'verified' | 'rejected' | 'under_review';
  phone_verified: boolean;
  phone_number?: string;
  id_document_url?: string;
  id_document_type?: string;
  verified_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  // Joined from profiles
  vendor_name?: string;
  vendor_email?: string;
}

export function VendorKYCReview() {
  const [kycRecords, setKycRecords] = useState<VendorKYC[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<VendorKYC[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  
  // Dialog state
  const [selectedKYC, setSelectedKYC] = useState<VendorKYC | null>(null);
  const [dialogAction, setDialogAction] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [viewImageDialog, setViewImageDialog] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    under_review: 0,
    verified: 0,
    rejected: 0
  });

  useEffect(() => {
    loadKYCRecords();
  }, []);

  useEffect(() => {
    filterRecords();
  }, [kycRecords, statusFilter]);

  const loadKYCRecords = async () => {
    try {
      setLoading(true);

      // Fetch KYC records with vendor info
      const { data, error } = await supabase
        .from('vendor_kyc')
        .select(`
          *,
          profiles!vendor_kyc_vendor_id_fkey (
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const enrichedData: VendorKYC[] = (data || []).map((record: any) => ({
        ...record,
        vendor_name: record.profiles?.full_name || 'Nom inconnu',
        vendor_email: record.profiles?.email || 'Email inconnu'
      }));

      setKycRecords(enrichedData);

      // Calculate stats
      const newStats = {
        total: enrichedData.length,
        pending: enrichedData.filter(k => k.status === 'pending').length,
        under_review: enrichedData.filter(k => k.status === 'under_review').length,
        verified: enrichedData.filter(k => k.status === 'verified').length,
        rejected: enrichedData.filter(k => k.status === 'rejected').length
      };
      setStats(newStats);

    } catch (error) {
      console.error('Error loading KYC records:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const filterRecords = () => {
    if (statusFilter === 'ALL') {
      setFilteredRecords(kycRecords);
    } else {
      setFilteredRecords(kycRecords.filter(k => k.status === statusFilter));
    }
  };

  const handleAction = async () => {
    if (!selectedKYC || !dialogAction) return;

    if (dialogAction === 'REJECT' && !rejectionReason.trim()) {
      toast.error('Veuillez fournir une raison de rejet');
      return;
    }

    setSubmitting(true);
    try {
      const updateData: any = {
        status: dialogAction === 'APPROVE' ? 'verified' : 'rejected',
        updated_at: new Date().toISOString()
      };

      if (dialogAction === 'APPROVE') {
        updateData.verified_at = new Date().toISOString();
        updateData.rejection_reason = null;
      } else {
        updateData.rejection_reason = rejectionReason;
      }

      const { error: kycError } = await supabase
        .from('vendor_kyc')
        .update(updateData)
        .eq('id', selectedKYC.id);

      if (kycError) throw kycError;

      // Update vendors table kyc_status
      const { error: vendorError } = await supabase
        .from('vendors')
        .update({ kyc_status: updateData.status })
        .eq('user_id', selectedKYC.vendor_id);

      if (vendorError) {
        console.warn('Warning updating vendors table:', vendorError);
      }

      // Update vendor_certifications kyc_status
      const { error: certError } = await supabase
        .from('vendor_certifications')
        .update({
          kyc_status: updateData.status,
          kyc_verified_at: updateData.verified_at || null
        })
        .eq('vendor_id', selectedKYC.vendor_id);

      if (certError) {
        console.warn('Warning updating certifications:', certError);
      }

      toast.success(
        dialogAction === 'APPROVE' 
          ? 'KYC approuvé avec succès' 
          : 'KYC rejeté'
      );
      
      // Reload records
      await loadKYCRecords();
      
      // Close dialog
      setSelectedKYC(null);
      setDialogAction(null);
      setRejectionReason('');

    } catch (error: any) {
      console.error('Error updating KYC:', error);
      toast.error(error.message || 'Erreur lors de la mise à jour');
    } finally {
      setSubmitting(false);
    }
  };

  const openDialog = (kyc: VendorKYC, action: 'APPROVE' | 'REJECT') => {
    setSelectedKYC(kyc);
    setDialogAction(action);
    setRejectionReason(kyc.rejection_reason || '');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-green-500 text-white">✓ Vérifié</Badge>;
      case 'rejected':
        return <Badge variant="destructive">✗ Rejeté</Badge>;
      case 'under_review':
        return <Badge className="bg-blue-500 text-white">En révision</Badge>;
      case 'pending':
      default:
        return <Badge variant="secondary">En attente</Badge>;
    }
  };

  const getDocumentTypeName = (type?: string) => {
    const types: Record<string, string> = {
      carte_identite: 'Carte d\'identité',
      passeport: 'Passeport',
      permis_conduire: 'Permis de conduire',
      registre_commerce: 'Registre de commerce'
    };
    return types[type || ''] || type || 'Document non spécifié';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="w-8 h-8 text-primary" />
            Vérification KYC Vendeurs
          </h1>
          <p className="text-muted-foreground mt-1">
            Approuver ou rejeter les documents d'identité des vendeurs
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total</CardDescription>
            <CardTitle className="text-2xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="pb-2">
            <CardDescription>En attente</CardDescription>
            <CardTitle className="text-2xl text-yellow-600">{stats.pending}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-2">
            <CardDescription>En révision</CardDescription>
            <CardTitle className="text-2xl text-blue-600">{stats.under_review}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-2">
            <CardDescription>Vérifiés</CardDescription>
            <CardTitle className="text-2xl text-green-600">{stats.verified}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <CardDescription>Rejetés</CardDescription>
            <CardTitle className="text-2xl text-red-600">{stats.rejected}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList className="grid grid-cols-5 w-full max-w-3xl">
              <TabsTrigger value="ALL">Tous ({stats.total})</TabsTrigger>
              <TabsTrigger value="pending">En attente ({stats.pending})</TabsTrigger>
              <TabsTrigger value="under_review">Révision ({stats.under_review})</TabsTrigger>
              <TabsTrigger value="verified">Vérifiés ({stats.verified})</TabsTrigger>
              <TabsTrigger value="rejected">Rejetés ({stats.rejected})</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
      </Card>

      {/* KYC List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredRecords.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Aucun KYC à afficher dans cette catégorie
            </CardContent>
          </Card>
        ) : (
          filteredRecords.map(kyc => (
            <Card key={kyc.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  {/* Vendor Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <User className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-semibold text-lg">{kyc.vendor_name}</p>
                        <p className="text-sm text-muted-foreground">{kyc.vendor_email}</p>
                      </div>
                      {getStatusBadge(kyc.status)}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                      {/* Phone */}
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span>{kyc.phone_number || 'Non fourni'}</span>
                        {kyc.phone_verified && (
                          <Badge variant="outline" className="text-xs">Vérifié</Badge>
                        )}
                      </div>

                      {/* Document Type */}
                      <div className="flex items-center gap-2 text-sm">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span>{getDocumentTypeName(kyc.id_document_type)}</span>
                      </div>

                      {/* Date */}
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span>{new Date(kyc.created_at).toLocaleDateString('fr-FR')}</span>
                      </div>
                    </div>

                    {/* Rejection Reason */}
                    {kyc.rejection_reason && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-sm text-red-800">
                          <span className="font-semibold">Raison du rejet: </span>
                          {kyc.rejection_reason}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    {kyc.id_document_url && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedKYC(kyc);
                          setViewImageDialog(true);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Voir document
                      </Button>
                    )}

                    {(kyc.status === 'pending' || kyc.status === 'under_review') && (
                      <>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => openDialog(kyc, 'APPROVE')}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Approuver
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => openDialog(kyc, 'REJECT')}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Rejeter
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Approve/Reject Dialog */}
      <Dialog 
        open={selectedKYC !== null && dialogAction !== null} 
        onOpenChange={(open) => {
          if (!open) {
            setSelectedKYC(null);
            setDialogAction(null);
            setRejectionReason('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogAction === 'APPROVE' ? 'Approuver le KYC' : 'Rejeter le KYC'}
            </DialogTitle>
            <DialogDescription>
              {selectedKYC?.vendor_name} ({selectedKYC?.vendor_email})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {dialogAction === 'REJECT' && (
              <div>
                <Label htmlFor="rejection_reason">Raison du rejet *</Label>
                <Textarea
                  id="rejection_reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Expliquez pourquoi le document est rejeté (photo floue, document expiré, etc.)..."
                  rows={4}
                  required
                />
              </div>
            )}

            {dialogAction === 'APPROVE' && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-900">Vérification KYC</p>
                    <p className="text-sm text-green-700 mt-1">
                      En approuvant ce KYC, le vendeur pourra être certifié par le CEO.
                      Assurez-vous que le document est valide et lisible.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedKYC(null);
                setDialogAction(null);
                setRejectionReason('');
              }}
              disabled={submitting}
            >
              Annuler
            </Button>
            <Button
              onClick={handleAction}
              disabled={submitting || (dialogAction === 'REJECT' && !rejectionReason.trim())}
              className={
                dialogAction === 'APPROVE' 
                  ? 'bg-green-600 hover:bg-green-700'
                  : ''
              }
            >
              {submitting ? 'En cours...' : dialogAction === 'APPROVE' ? 'Approuver' : 'Rejeter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Image Dialog */}
      <Dialog open={viewImageDialog} onOpenChange={setViewImageDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Document d'identité</DialogTitle>
            <DialogDescription>
              {selectedKYC?.vendor_name} - {getDocumentTypeName(selectedKYC?.id_document_type)}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[70vh] overflow-auto">
            {selectedKYC?.id_document_url ? (
              <img 
                src={selectedKYC.id_document_url} 
                alt="Document d'identité" 
                className="w-full h-auto rounded-lg border"
              />
            ) : (
              <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
                <p className="text-muted-foreground">Aucun document disponible</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewImageDialog(false)}>
              Fermer
            </Button>
            {selectedKYC?.id_document_url && (
              <Button 
                onClick={() => window.open(selectedKYC.id_document_url, '_blank')}
              >
                <Download className="w-4 h-4 mr-2" />
                Télécharger
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
