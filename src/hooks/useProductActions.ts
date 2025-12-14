/**
 * Hook pour gérer les actions CRUD sur les produits
 * Extraction de la logique métier de ProductManagement
 */

import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { usePublicId } from '@/hooks/usePublicId';

interface ProductFormData {
  name: string;
  description?: string;
  price: string;
  compare_price?: string;
  cost_price?: string;
  sku?: string;
  barcode?: string;
  stock_quantity: string;
  low_stock_threshold: string;
  category_id?: string;
  category_name?: string;
  weight?: string;
  tags?: string;
  is_active: boolean;
}

interface UseProductActionsProps {
  vendorId: string | null;
  onProductCreated?: () => void;
  onProductUpdated?: () => void;
  onProductDeleted?: () => void;
}

export function useProductActions({
  vendorId,
  onProductCreated,
  onProductUpdated,
  onProductDeleted,
}: UseProductActionsProps) {
  const { generatePublicId } = usePublicId();

  /**
   * Upload des images vers Supabase Storage
   */
  const uploadImages = useCallback(async (files: File[]): Promise<string[]> => {
    if (!vendorId || files.length === 0) return [];

    const imageUrls: string[] = [];
    
    toast.info(`Upload de ${files.length} image(s)...`);

    for (const file of files) {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${vendorId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('[ProductUpload] Error:', uploadError);
          toast.error(`Échec upload ${file.name}: ${uploadError.message}`);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName);

        imageUrls.push(publicUrl);
      } catch (error) {
        console.error('[ProductUpload] Exception:', error);
      }
    }

    if (imageUrls.length > 0) {
      toast.success(`${imageUrls.length} image(s) uploadée(s)`);
    }

    return imageUrls;
  }, [vendorId]);

  /**
   * Gérer la catégorie (créer si n'existe pas)
   */
  const handleCategory = useCallback(async (categoryName?: string, categoryId?: string): Promise<string | null> => {
    console.log('[Category] handleCategory called:', { categoryName, categoryId });
    
    // Si un ID de catégorie est fourni, l'utiliser directement
    if (categoryId && categoryId.trim() !== '') {
      console.log('[Category] Using existing category_id:', categoryId);
      return categoryId;
    }
    
    // Si pas de nom de catégorie, retourner null
    if (!categoryName || categoryName.trim() === '') {
      console.log('[Category] No category name provided');
      return null;
    }

    try {
      // Chercher catégorie existante par nom
      const { data: existingCategory, error: searchError } = await supabase
        .from('categories')
        .select('id')
        .ilike('name', categoryName.trim())
        .maybeSingle();

      if (searchError) {
        console.error('[Category] Search error:', searchError);
      }

      if (existingCategory) {
        console.log('[Category] Found existing category:', existingCategory.id);
        return existingCategory.id;
      }

      // Créer nouvelle catégorie
      console.log('[Category] Creating new category:', categoryName.trim());
      const { data: newCategory, error: categoryError } = await supabase
        .from('categories')
        .insert([{ 
          name: categoryName.trim(), 
          is_active: true 
        }])
        .select('id')
        .single();

      if (categoryError) {
        console.error('[Category] Creation error:', categoryError);
        return null;
      }

      console.log('[Category] Created new category:', newCategory?.id);
      return newCategory?.id || null;
    } catch (error) {
      console.error('[Category] Exception:', error);
      return null;
    }
  }, []);

  /**
   * Générer un SKU unique automatiquement
   */
  const generateUniqueSKU = useCallback(async (): Promise<string> => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `SKU-${timestamp}-${random}`;
  }, []);

  /**
   * Créer un nouveau produit
   */
  const createProduct = useCallback(async (
    formData: ProductFormData,
    images: File[]
  ): Promise<{ success: boolean; product?: any }> => {
    if (!vendorId) {
      toast.error('Vendeur introuvable');
      return { success: false };
    }

    try {
      // Upload images
      const imageUrls = await uploadImages(images);

      // Gérer catégorie - log pour debug
      console.log('[ProductCreate] Category data received:', { 
        category_id: formData.category_id, 
        category_name: formData.category_name 
      });
      const categoryId = await handleCategory(formData.category_name, formData.category_id);
      console.log('[ProductCreate] Category ID resolved:', categoryId);

      // Générer public_id
      const public_id = await generatePublicId('products', false);
      if (!public_id) {
        toast.error('Impossible de générer l\'ID du produit');
        return { success: false };
      }

      // Générer SKU unique si non fourni
      const sku = formData.sku?.trim() || await generateUniqueSKU();

      // Préparer données produit
      const productData = {
        public_id,
        name: formData.name,
        description: formData.description || null,
        price: parseFloat(formData.price),
        compare_price: formData.compare_price ? parseFloat(formData.compare_price) : null,
        cost_price: formData.cost_price ? parseFloat(formData.cost_price) : null,
        sku,
        barcode: formData.barcode || null,
        stock_quantity: parseInt(formData.stock_quantity),
        low_stock_threshold: parseInt(formData.low_stock_threshold),
        category_id: categoryId,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()) : null,
        is_active: formData.is_active,
        vendor_id: vendorId,
        images: imageUrls.length > 0 ? imageUrls : null
      };

      console.log('[ProductCreate] Data:', productData);

      // Insérer produit
      const { data, error } = await supabase
        .from('products')
        .insert([productData])
        .select()
        .single();

      if (error) throw error;

      toast.success('✅ Produit créé avec succès');
      onProductCreated?.();

      return { success: true, product: data };
    } catch (error: any) {
      console.error('[ProductCreate] Error:', error);
      toast.error(`Erreur création: ${error.message}`);
      return { success: false };
    }
  }, [vendorId, uploadImages, handleCategory, generatePublicId, onProductCreated]);

  /**
   * Mettre à jour un produit
   */
  const updateProduct = useCallback(async (
    productId: string,
    formData: ProductFormData,
    newImages: File[],
    existingImages: string[] = []
  ): Promise<{ success: boolean; product?: any }> => {
    if (!vendorId) {
      toast.error('Vendeur introuvable');
      return { success: false };
    }

    try {
      // Upload nouvelles images
      const newImageUrls = await uploadImages(newImages);

      // Combiner anciennes et nouvelles images
      const allImages = newImageUrls.length > 0 
        ? [...existingImages, ...newImageUrls] 
        : existingImages;

      // Gérer catégorie
      const categoryId = await handleCategory(formData.category_name, formData.category_id);

      // Préparer données mise à jour
      const updateData = {
        name: formData.name,
        description: formData.description || null,
        price: parseFloat(formData.price),
        compare_price: formData.compare_price ? parseFloat(formData.compare_price) : null,
        cost_price: formData.cost_price ? parseFloat(formData.cost_price) : null,
        sku: formData.sku || null,
        barcode: formData.barcode || null,
        stock_quantity: parseInt(formData.stock_quantity),
        low_stock_threshold: parseInt(formData.low_stock_threshold),
        category_id: categoryId,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()) : null,
        is_active: formData.is_active,
        images: allImages.length > 0 ? allImages : null
      };

      console.log('[ProductUpdate] Data:', updateData);

      // Mettre à jour produit
      const { data, error } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', productId)
        .select()
        .single();

      if (error) throw error;

      toast.success('✅ Produit mis à jour');
      onProductUpdated?.();

      return { success: true, product: data };
    } catch (error: any) {
      console.error('[ProductUpdate] Error:', error);
      toast.error(`Erreur mise à jour: ${error.message}`);
      return { success: false };
    }
  }, [vendorId, uploadImages, handleCategory, onProductUpdated]);

  /**
   * Supprimer un produit
   */
  const deleteProduct = useCallback(async (productId: string): Promise<boolean> => {
    if (!vendorId) {
      toast.error('Vendeur introuvable');
      return false;
    }

    try {
      // Vérifier si produit a des commandes
      const { data: orders, error: ordersError } = await supabase
        .from('order_items')
        .select('id')
        .eq('product_id', productId)
        .limit(1);

      if (ordersError) throw ordersError;

      if (orders && orders.length > 0) {
        toast.error('Impossible de supprimer: produit utilisé dans des commandes');
        return false;
      }

      // Supprimer produit
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      toast.success('🗑️ Produit supprimé');
      onProductDeleted?.();

      return true;
    } catch (error: any) {
      console.error('[ProductDelete] Error:', error);
      toast.error(`Erreur suppression: ${error.message}`);
      return false;
    }
  }, [vendorId, onProductDeleted]);

  /**
   * Dupliquer un produit
   */
  const duplicateProduct = useCallback(async (productId: string): Promise<{ success: boolean; product?: any }> => {
    if (!vendorId) {
      toast.error('Vendeur introuvable');
      return { success: false };
    }

    try {
      // Récupérer produit original
      const { data: original, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (fetchError) throw fetchError;

      // Générer nouveau public_id
      const public_id = await generatePublicId('products', false);
      if (!public_id) {
        toast.error('Impossible de générer l\'ID du produit');
        return { success: false };
      }

      // Générer un nouveau SKU unique pour la copie
      const newSKU = await generateUniqueSKU();

      // Créer copie
      const duplicateData = {
        ...original,
        id: undefined, // Laisser DB générer nouvel ID
        public_id,
        name: `${original.name} (Copie)`,
        sku: newSKU,
        barcode: null, // Ne pas dupliquer barcode
        created_at: undefined,
        updated_at: undefined
      };

      const { data, error } = await supabase
        .from('products')
        .insert([duplicateData])
        .select()
        .single();

      if (error) throw error;

      toast.success('✅ Produit dupliqué');
      onProductCreated?.();

      return { success: true, product: data };
    } catch (error: any) {
      console.error('[ProductDuplicate] Error:', error);
      toast.error(`Erreur duplication: ${error.message}`);
      return { success: false };
    }
  }, [vendorId, generatePublicId, onProductCreated]);

  /**
   * Mise à jour en masse du stock
   */
  const bulkUpdateStock = useCallback(async (updates: { productId: string; quantity: number }[]): Promise<boolean> => {
    if (!vendorId) {
      toast.error('Vendeur introuvable');
      return false;
    }

    try {
      for (const update of updates) {
        const { error } = await supabase
          .from('products')
          .update({ stock_quantity: update.quantity })
          .eq('id', update.productId)
          .eq('vendor_id', vendorId);

        if (error) throw error;
      }

      toast.success(`✅ Stock mis à jour pour ${updates.length} produit(s)`);
      onProductUpdated?.();

      return true;
    } catch (error: any) {
      console.error('[BulkUpdateStock] Error:', error);
      toast.error(`Erreur mise à jour stock: ${error.message}`);
      return false;
    }
  }, [vendorId, onProductUpdated]);

  return {
    createProduct,
    updateProduct,
    deleteProduct,
    duplicateProduct,
    bulkUpdateStock,
    uploadImages,
  };
}
