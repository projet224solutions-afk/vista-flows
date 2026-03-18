/**
 * INDICATEUR DE STATUT RÉSEAU COMPACT
 * Composant pour afficher le statut de connexion avec sync auto
 * 224SOLUTIONS - Interface Vendeur
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Wifi, WifiOff, RefreshCw, Check } from "lucide-react";
import { toast } from 'sonner';

export default function NetworkStatusIndicator() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [pendingSync, setPendingSync] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);

    const checkPendingData = useCallback(async () => {
        try {
            const dbRequest = indexedDB.open('224Solutions-OfflineDB', 3);
            dbRequest.onsuccess = () => {
                const db = dbRequest.result;
                if (db.objectStoreNames.contains('events')) {
                    const tx = db.transaction('events', 'readonly');
                    const store = tx.objectStore('events');
                    const index = store.index('by-status');
                    const countRequest = index.count('pending');
                    countRequest.onsuccess = () => {
                        setPendingSync(countRequest.result);
                    };
                }
                db.close();
            };
        } catch (e) {
            // Ignorer
        }
    }, []);

    // Forcer la synchronisation des événements pending
    const forceSyncPending = useCallback(async () => {
        if (!navigator.onLine || isSyncing) return;
        
        setIsSyncing(true);
        try {
            const { default: offlineDB } = await import('@/lib/offlineDB');
            const pendingEvents = await offlineDB.getPendingEvents();
            
            if (pendingEvents.length === 0) {
                setPendingSync(0);
                toast.success('Tout est synchronisé');
                return;
            }

            let syncedCount = 0;
            const { supabase } = await import('@/integrations/supabase/client');

            for (const event of pendingEvents) {
                try {
                    const saleData = event.data;
                    const vendorId = event.vendor_id;
                    if (!vendorId) continue;

                    const isCreditSale = event.type === 'credit_sale';
                    const customerName = saleData.customer_name || 'Client comptoir';

                    // Obtenir ou créer customer
                    const { data: existingCustomer } = await supabase
                        .from('customers')
                        .select('id')
                        .eq('user_id', vendorId)
                        .eq('name', customerName)
                        .maybeSingle();

                    let customerId = existingCustomer?.id;
                    if (!customerId) {
                        const { data: newCustomer } = await supabase
                            .from('customers')
                            .insert({ user_id: vendorId, name: customerName, phone: saleData.customer_phone || null })
                            .select('id')
                            .single();
                        customerId = newCustomer?.id;
                    }
                    if (!customerId) continue;

                    const syncOrderNumber = saleData.order_number || `SYNC-${Date.now().toString(36).toUpperCase()}`;

                    // Créer la commande
                    const { data: order, error: orderError } = await supabase
                        .from('orders')
                        .insert({
                            order_number: syncOrderNumber,
                            vendor_id: vendorId,
                            customer_id: customerId,
                            total_amount: saleData.total_amount,
                            subtotal: saleData.subtotal,
                            tax_amount: saleData.tax_amount,
                            discount_amount: saleData.discount_amount,
                            payment_status: isCreditSale ? 'pending' : 'paid',
                            status: 'confirmed',
                            payment_method: 'cash',
                            shipping_address: isCreditSale
                                ? { address: 'Vente à crédit', is_credit_sale: true }
                                : { address: 'Point de vente' },
                            notes: isCreditSale
                                ? `🔖 VENTE À CRÉDIT (sync) - Client: ${customerName}`
                                : `Vente offline synchronisée - ${syncOrderNumber}`,
                            source: isCreditSale ? 'pos_offline_credit_synced' : 'pos_offline_synced',
                            created_at: saleData.sale_date
                        })
                        .select('id')
                        .single();

                    if (orderError) throw orderError;

                    // Créer les items
                    if (saleData.items?.length > 0) {
                        await supabase.from('order_items').insert(
                            saleData.items.map((item: any) => ({
                                order_id: order.id,
                                product_id: item.product_id,
                                quantity: item.quantity,
                                unit_price: item.unit_price,
                                total_price: item.total_price
                            }))
                        );
                    }

                    // Si vente à crédit
                    if (isCreditSale) {
                        await supabase.from('vendor_credit_sales').insert([{
                            vendor_id: vendorId,
                            customer_name: customerName,
                            customer_phone: saleData.customer_phone || null,
                            order_number: syncOrderNumber,
                            total: saleData.total_amount,
                            subtotal: saleData.subtotal,
                            remaining_amount: saleData.total_amount,
                            due_date: saleData.due_date,
                            notes: saleData.credit_notes || '',
                            items: saleData.items?.map((i: any) => ({
                                id: i.product_id, name: i.product_name,
                                price: i.unit_price, quantity: i.quantity, images: i.images || []
                            })) || [],
                            status: 'pending'
                        }]);
                    }

                    await offlineDB.markEventAsSynced(event.client_event_id);
                    syncedCount++;
                } catch (syncErr) {
                    console.error('Erreur sync:', syncErr);
                    await offlineDB.markEventAsFailed(event.client_event_id, String(syncErr));
                }
            }

            await checkPendingData();
            if (syncedCount > 0) {
                toast.success(`${syncedCount} vente(s) synchronisée(s)`);
            }
        } catch (error) {
            console.error('Erreur sync globale:', error);
            toast.error('Erreur de synchronisation');
        } finally {
            setIsSyncing(false);
        }
    }, [isSyncing, checkPendingData]);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            // Auto-sync quand on revient en ligne
            setTimeout(() => forceSyncPending(), 2000);
        };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        checkPendingData();
        const interval = setInterval(checkPendingData, 15000);

        // Auto-sync au montage si online et pending
        if (navigator.onLine) {
            setTimeout(() => forceSyncPending(), 3000);
        }

        return () => {
            clearInterval(interval);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [checkPendingData, forceSyncPending]);

    // Ne rien afficher si tout est OK et en ligne
    if (isOnline && pendingSync === 0 && !isSyncing) {
        return null;
    }

    const getStatusColor = () => {
        if (isSyncing) return 'bg-blue-500';
        if (!isOnline) return 'bg-destructive';
        if (pendingSync > 0) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    const getStatusText = () => {
        if (isSyncing) return 'Sync...';
        if (!isOnline) return 'Offline';
        if (pendingSync > 0) return `${pendingSync}`;
        return '';
    };

    const getIcon = () => {
        if (isSyncing) return <RefreshCw className="w-2.5 h-2.5 animate-spin" />;
        if (!isOnline) return <WifiOff className="w-2.5 h-2.5" />;
        if (pendingSync > 0) return <RefreshCw className="w-2.5 h-2.5" />;
        return <Check className="w-2.5 h-2.5" />;
    };

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Badge
                        onClick={isOnline && pendingSync > 0 ? forceSyncPending : undefined}
                        className={`${getStatusColor()} text-white text-[10px] px-1.5 py-0.5 flex items-center gap-0.5 ${isOnline && pendingSync > 0 ? 'cursor-pointer hover:opacity-80' : 'cursor-help'}`}
                        variant="default"
                    >
                        {getIcon()}
                        <span>{getStatusText()}</span>
                    </Badge>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                    <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-2">
                            {isOnline ? <Wifi className="w-3 h-3 text-green-500" /> : <WifiOff className="w-3 h-3 text-destructive" />}
                            <span className="font-medium">{isOnline ? 'Connecté' : 'Hors ligne'}</span>
                        </div>
                        {pendingSync > 0 && (
                            <p className="text-muted-foreground">
                                {pendingSync} opération(s) en attente — {isOnline ? 'Cliquez pour synchroniser' : 'Sera synchronisé à la reconnexion'}
                            </p>
                        )}
                        {isSyncing && <p className="text-blue-500">Synchronisation en cours...</p>}
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}