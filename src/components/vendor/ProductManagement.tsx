import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurrentVendor } from "@/hooks/useCurrentVendor";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePublicId } from "@/hooks/usePublicId";
import { PublicIdBadge } from "@/components/PublicIdBadge";
import { 
  Package, Plus, Search, Filter, Edit, Trash2, Star, 
  Eye, ShoppingCart, TrendingUp, Camera, Save, X, Sparkles
} from "lucide-react";

interface Product {
  id: string;
  public_id?: string;
  name: string;
  description?: string;
  price: number;
  compare_price?: number;
  cost_price?: number;
  sku?: string;
  barcode?: string;
  stock_quantity: number;
  low_stock_threshold: number;
  is_active: boolean;
  category_id?: string;
  images?: string[];
  tags?: string[];
  weight?: number;
  created_at?: string;
}

interface Category {
  id: string;
  name: string;
  is_active: boolean;
}

export default function ProductManagement() {
  const { vendorId, user, loading: vendorLoading } = useCurrentVendor();
  const { toast } = useToast();
  const { generatePublicId } = usePublicId();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showDialog, setShowDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [generatingCategory, setGeneratingCategory] = useState(false);
  const [generatingTags, setGeneratingTags] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [enhancingImages, setEnhancingImages] = useState(false);
  const [generatingSimilar, setGeneratingSimilar] = useState(false);
  const [generatingSKU, setGeneratingSKU] = useState(false);
  const [generatingBarcode, setGeneratingBarcode] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    compare_price: '',
    cost_price: '',
    sku: '',
    barcode: '',
    stock_quantity: '',
    low_stock_threshold: '10',
    category_id: '',
    category_name: '',
    weight: '',
    tags: '',
    is_active: true
  });

  useEffect(() => {
    if (!vendorId || vendorLoading) return;
    fetchData();
  }, [vendorId, vendorLoading]);

  const fetchData = async () => {
    if (!vendorId) {
      console.warn('⚠️ Pas de vendorId pour charger les produits');
      return;
    }

    try {
      setLoading(true);
      console.log('🔄 Chargement produits pour vendorId:', vendorId);

      // Vérifier si on est dans un contexte agent
      const agentToken = localStorage.getItem('vendor_agent_access_token');
      
      if (agentToken) {
        // Utiliser la fonction Edge pour les agents
        console.log('📡 Chargement via fonction Edge (agent)');
        const response = await fetch(
          'https://uakkxaibujzxdiqzpnpr.supabase.co/functions/v1/vendor-agent-get-products',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVha2t4YWlidWp6eGRpcXpwbnByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwMDA2NTcsImV4cCI6MjA3NDU3NjY1N30.kqYNdg-73BTP0Yht7kid-EZu2APg9qw-b_KW9z5hJbM',
            },
            body: JSON.stringify({ agentToken }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erreur lors du chargement des produits');
        }

        const data = await response.json();
        setProducts(data.products || []);
        setCategories(data.categories || []);
        console.log('✅ Produits chargés (agent):', data.products?.length || 0);
      } else {
        // Chargement direct pour les vendeurs connectés
        console.log('📡 Chargement direct (vendeur)');
        
        // Fetch categories
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('categories')
          .select('id, name, is_active')
          .eq('is_active', true)
          .order('name');

        if (categoriesError) {
          console.error('Erreur chargement catégories:', categoriesError);
          toast({
            title: "Avertissement",
            description: "Impossible de charger les catégories.",
            variant: "destructive"
          });
        } else {
          setCategories(categoriesData || []);
          console.log('Catégories chargées:', categoriesData?.length || 0);
        }

        // Fetch products
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('*')
          .eq('vendor_id', vendorId)
          .order('created_at', { ascending: false });

        if (productsError) throw productsError;

        setProducts(productsData || []);
        console.log('✅ Produits chargés (vendeur):', productsData?.length || 0);
      }
    } catch (error: any) {
      console.error('❌ Erreur fetchData:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de charger les données des produits.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = !searchTerm || 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && product.is_active) ||
      (statusFilter === 'inactive' && !product.is_active);

    const matchesLowStock = !lowStockFilter || 
      (product.stock_quantity <= product.low_stock_threshold);

    return matchesSearch && matchesStatus && matchesLowStock;
  });

  const handleSaveProduct = async () => {
    try {
      // Get vendor ID
      const { data: vendor } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!vendor) throw new Error('Vendor not found');

      // Upload images to storage if any
      let imageUrls: string[] = [];
      console.log('Images sélectionnées:', selectedImages.length);
      
      if (selectedImages.length > 0) {
        toast({
          title: "Upload en cours...",
          description: `Upload de ${selectedImages.length} image(s)...`
        });

        for (const file of selectedImages) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${vendor.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
          
          console.log('Upload de:', fileName);
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(fileName, file, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            console.error('Erreur upload:', uploadError);
            toast({
              title: "Erreur upload",
              description: `Impossible d'uploader ${file.name}: ${uploadError.message}`,
              variant: "destructive"
            });
            continue;
          }

          console.log('Upload réussi:', uploadData);
          
          const { data: { publicUrl } } = supabase.storage
            .from('product-images')
            .getPublicUrl(fileName);

          console.log('URL publique:', publicUrl);
          imageUrls.push(publicUrl);
        }
        
        if (imageUrls.length > 0) {
          toast({
            title: "Images uploadées",
            description: `${imageUrls.length} image(s) uploadée(s) avec succès`
          });
        }
      }

      const productData = {
        name: formData.name,
        description: formData.description || null,
        price: parseFloat(formData.price),
        compare_price: formData.compare_price ? parseFloat(formData.compare_price) : null,
        cost_price: formData.cost_price ? parseFloat(formData.cost_price) : null,
        sku: formData.sku || null,
        barcode: formData.barcode || null,
        stock_quantity: parseInt(formData.stock_quantity),
        low_stock_threshold: parseInt(formData.low_stock_threshold),
        category_id: null as string | null,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()) : null,
        is_active: formData.is_active,
        vendor_id: vendor.id,
        images: imageUrls.length > 0 ? imageUrls : null
      };

      // Gérer la catégorie : chercher ou créer si nécessaire
      if (formData.category_name) {
        // Chercher si la catégorie existe déjà
        const { data: existingCategory } = await supabase
          .from('categories')
          .select('id')
          .ilike('name', formData.category_name.trim())
          .maybeSingle();

        if (existingCategory) {
          productData.category_id = existingCategory.id;
        } else {
          // Créer la nouvelle catégorie
          const { data: newCategory, error: categoryError } = await supabase
            .from('categories')
            .insert([{ 
              name: formData.category_name.trim(), 
              is_active: true 
            }])
            .select('id')
            .single();

          if (categoryError) {
            console.error('Erreur création catégorie:', categoryError);
            // Continuer sans catégorie si échec
          } else if (newCategory) {
            productData.category_id = newCategory.id;
            // Recharger les catégories
            const { data: updatedCategories } = await supabase
              .from('categories')
              .select('id, name, is_active')
              .eq('is_active', true)
              .order('name');
            if (updatedCategories) setCategories(updatedCategories);
          }
        }
      } else if (formData.category_id) {
        productData.category_id = formData.category_id;
      }

      console.log('Données produit à sauvegarder:', productData);

      if (editingProduct) {
        // Lors de l'édition, combiner les anciennes images avec les nouvelles
        const existingImages = editingProduct.images || [];
        const allImages = imageUrls.length > 0 ? [...existingImages, ...imageUrls] : existingImages;
        
        const updateData = {
          ...productData,
          images: allImages.length > 0 ? allImages : null
        };

        const { error } = await supabase
          .from('products')
          .update(updateData)
          .eq('id', editingProduct.id);

        if (error) throw error;

        setProducts(prev => prev.map(p => 
          p.id === editingProduct.id ? { ...p, ...updateData } : p
        ));

        toast({
          title: "Produit mis à jour",
          description: "Le produit a été mis à jour avec succès."
        });
      } else {
        // 🆕 Générer un public_id avant l'insertion
        console.log('🔄 Génération public_id pour nouveau produit...');
        const public_id = await generatePublicId('products', false);
        
        if (!public_id) {
          toast({
            title: "Erreur",
            description: "Impossible de générer l'ID du produit.",
            variant: "destructive"
          });
          return;
        }

        console.log('✅ Public_id généré:', public_id);

        const { data, error } = await supabase
          .from('products')
          .insert([{ ...productData, public_id }])
          .select()
          .single();

        if (error) throw error;

        console.log('✅ Produit créé:', data);

        // Créer une entrée dans l'inventaire pour ce nouveau produit
        console.log('📦 Création entrée inventaire pour produit:', data.id);
        const { data: inventoryData, error: inventoryError } = await supabase
          .from('inventory')
          .insert([{
            product_id: data.id,
            quantity: productData.stock_quantity,
            minimum_stock: productData.low_stock_threshold,
            cost_price: productData.cost_price || 0,
            reorder_point: productData.low_stock_threshold,
            reorder_quantity: 0,
            reserved_quantity: 0
          }])
          .select()
          .single();

        if (inventoryError) {
          console.error('❌ Erreur création inventaire:', inventoryError);
          toast({
            title: "Avertissement",
            description: "Le produit a été créé mais l'inventaire n'a pas pu être initialisé.",
            variant: "destructive"
          });
        } else {
          console.log('✅ Inventaire créé:', inventoryData);
        }

        setProducts(prev => [data, ...prev]);

        toast({
          title: "✅ Produit créé",
          description: "Redirection vers le stock...",
        });

        // Attendre un peu puis rediriger vers la page stock
        setTimeout(() => {
          navigate('/vendeur/warehouse');
        }, 1500);
      }

      setShowDialog(false);
      resetForm();
    } catch (error: any) {
      console.error('❌ Erreur complète:', error);
      
      let errorMessage = "Impossible de sauvegarder le produit";
      
      // Gérer les erreurs spécifiques
      if (error.code === '23505') {
        if (error.message.includes('products_sku_key')) {
          errorMessage = `Le code SKU "${formData.sku}" existe déjà. Veuillez utiliser un code SKU unique.`;
        } else {
          errorMessage = "Ce produit existe déjà dans votre catalogue.";
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      compare_price: '',
      cost_price: '',
      sku: '',
      barcode: '',
      stock_quantity: '',
      low_stock_threshold: '10',
      category_id: '',
      category_name: '',
      weight: '',
      tags: '',
      is_active: true
    });
    setEditingProduct(null);
    setSelectedImages([]);
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const imageFiles = Array.from(files).filter(file => 
      file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024 // 10MB max
    );

    if (imageFiles.length !== files.length) {
      toast({
        title: "Attention",
        description: "Certains fichiers ont été ignorés (format invalide ou taille > 10MB)",
        variant: "destructive"
      });
    }

    setSelectedImages(prev => [...prev, ...imageFiles]);
    
    toast({
      title: "Images ajoutées",
      description: `${imageFiles.length} image(s) sélectionnée(s)`,
    });
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const generateDescription = async () => {
    if (!formData.name) {
      toast({
        title: "Erreur",
        description: "Veuillez d'abord entrer le nom du produit",
        variant: "destructive"
      });
      return;
    }

    try {
      setGeneratingDescription(true);
      
      // Trouver le nom de la catégorie
      const categoryName = formData.category_name || 
        (formData.category_id ? categories.find(c => c.id === formData.category_id)?.name : undefined);

      const { data, error } = await supabase.functions.invoke('generate-product-description', {
        body: {
          productName: formData.name,
          category: categoryName,
          price: formData.price
        }
      });

      if (error) {
        if (error.message.includes('429')) {
          throw new Error('Limite de requêtes atteinte. Veuillez réessayer dans quelques instants.');
        }
        if (error.message.includes('402')) {
          throw new Error('Crédits IA épuisés. Veuillez recharger votre compte.');
        }
        throw error;
      }

      if (data?.description) {
        setFormData(prev => ({ ...prev, description: data.description }));
        toast({
          title: "Description générée",
          description: "La description a été générée avec succès par l'IA",
        });
      }
    } catch (error) {
      console.error('Erreur génération description:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de générer la description",
        variant: "destructive"
      });
    } finally {
      setGeneratingDescription(false);
    }
  };

  const generateCategory = async () => {
    if (!formData.name) {
      toast({
        title: "Erreur",
        description: "Veuillez d'abord entrer le nom du produit",
        variant: "destructive"
      });
      return;
    }

    try {
      setGeneratingCategory(true);
      
      // Utiliser l'IA pour suggérer une catégorie pertinente
      const { data, error } = await supabase.functions.invoke('generate-product-description', {
        body: {
          productName: formData.name,
          category: 'Générer une catégorie appropriée pour ce produit',
          price: formData.price
        }
      });

      if (error) {
        if (error.message.includes('429')) {
          throw new Error('Limite de requêtes atteinte. Veuillez réessayer dans quelques instants.');
        }
        if (error.message.includes('402')) {
          throw new Error('Crédits IA épuisés. Veuillez recharger votre compte.');
        }
        throw error;
      }

      // Extraire une catégorie intelligente basée sur le nom du produit
      const productName = formData.name.toLowerCase();
      let suggestedCategory = '';

      // Catégories communes basées sur des mots-clés
      const categoryKeywords: Record<string, string[]> = {
        'Vêtements': ['chemise', 'pantalon', 'robe', 'jupe', 'veste', 'manteau', 't-shirt', 'pull', 'jean'],
        'Chaussures': ['chaussure', 'basket', 'sandale', 'botte', 'escarpin', 'sneaker'],
        'Électronique': ['téléphone', 'ordinateur', 'tablette', 'écouteur', 'casque', 'moniteur', 'clavier', 'souris'],
        'Alimentation': ['nourriture', 'boisson', 'fruit', 'légume', 'viande', 'poisson', 'pain', 'gâteau'],
        'Beauté': ['parfum', 'crème', 'maquillage', 'cosmétique', 'shampoing', 'savon'],
        'Sport': ['ballon', 'raquette', 'vélo', 'tapis', 'haltère', 'fitness'],
        'Maison': ['meuble', 'décoration', 'cuisine', 'lit', 'table', 'chaise', 'lampe'],
        'Livre': ['livre', 'roman', 'magazine', 'bd', 'manga'],
        'Jouets': ['jouet', 'poupée', 'peluche', 'jeu', 'puzzle'],
      };

      // Chercher la catégorie la plus pertinente
      for (const [category, keywords] of Object.entries(categoryKeywords)) {
        if (keywords.some(keyword => productName.includes(keyword))) {
          suggestedCategory = category;
          break;
        }
      }

      // Si aucune catégorie n'est trouvée, utiliser une approche générique
      if (!suggestedCategory) {
        const words = formData.name.split(' ').filter(w => w.length > 3);
        suggestedCategory = words[0] ? words[0].charAt(0).toUpperCase() + words[0].slice(1) : 'Général';
      }
      
      setFormData(prev => ({ ...prev, category_name: suggestedCategory }));
      toast({
        title: "Catégorie suggérée",
        description: `"${suggestedCategory}" - Vous pouvez la modifier si nécessaire`,
      });
    } catch (error) {
      console.error('Erreur génération catégorie:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de générer la catégorie",
        variant: "destructive"
      });
    } finally {
      setGeneratingCategory(false);
    }
  };

  const generateTags = async () => {
    if (!formData.name) {
      toast({
        title: "Erreur",
        description: "Veuillez d'abord entrer le nom du produit",
        variant: "destructive"
      });
      return;
    }

    try {
      setGeneratingTags(true);
      
      const productName = formData.name.toLowerCase();
      const categoryName = formData.category_name || '';
      let suggestedTags: string[] = [];

      // Tags basés sur les catégories et caractéristiques communes
      const tagsByCategory: Record<string, string[]> = {
        'vêtements': ['mode', 'fashion', 'tendance', 'style', 'confort'],
        'chaussures': ['confortable', 'durable', 'sport', 'casual', 'élégant'],
        'électronique': ['high-tech', 'moderne', 'connecté', 'innovant', 'rapide'],
        'alimentation': ['frais', 'bio', 'local', 'savoureux', 'sain'],
        'beauté': ['soin', 'naturel', 'doux', 'efficace', 'premium'],
        'sport': ['fitness', 'performance', 'entraînement', 'santé', 'actif'],
        'maison': ['décoration', 'pratique', 'design', 'confort', 'moderne'],
        'livre': ['lecture', 'culture', 'éducatif', 'divertissement'],
        'jouets': ['enfant', 'éducatif', 'amusant', 'sécurisé', 'créatif'],
      };

      // Ajouter des tags génériques pertinents
      suggestedTags.push('nouveau', 'qualité');

      // Chercher des tags basés sur la catégorie
      const lowerCategory = categoryName.toLowerCase();
      for (const [category, tags] of Object.entries(tagsByCategory)) {
        if (lowerCategory.includes(category) || productName.includes(category)) {
          suggestedTags.push(...tags.slice(0, 3));
          break;
        }
      }

      // Si on a toujours pas assez de tags, ajouter des tags génériques basés sur le nom du produit
      if (suggestedTags.length < 5) {
        const words = formData.name.split(' ').filter(w => w.length > 3);
        suggestedTags.push(...words.slice(0, 2).map(w => w.toLowerCase()));
      }

      // Enlever les doublons et limiter à 5 tags
      const uniqueTags = [...new Set(suggestedTags)].slice(0, 5);
      
      setFormData(prev => ({ ...prev, tags: uniqueTags.join(', ') }));
      toast({
        title: "Tags suggérés",
        description: `${uniqueTags.length} tags générés - Vous pouvez les modifier`,
      });
    } catch (error) {
      console.error('Erreur génération tags:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de générer les tags",
        variant: "destructive"
      });
    } finally {
      setGeneratingTags(false);
    }
  };

  const generateProductImage = async () => {
    if (!formData.name) {
      toast({
        title: "Erreur",
        description: "Veuillez d'abord entrer le nom du produit",
        variant: "destructive"
      });
      return;
    }

    try {
      setGeneratingImage(true);
      toast({
        title: "Génération en cours...",
        description: "L'IA crée une image professionnelle pour votre produit"
      });

      const { data, error } = await supabase.functions.invoke('generate-product-image', {
        body: {
          productName: formData.name,
          category: formData.category_name,
          description: formData.description
        }
      });

      if (error) {
        if (error.message?.includes('429')) {
          throw new Error('Limite de requêtes atteinte. Veuillez réessayer dans quelques instants.');
        }
        if (error.message?.includes('402')) {
          throw new Error('Crédits IA épuisés. Veuillez recharger votre compte.');
        }
        throw error;
      }

      if (data?.imageUrl) {
        // Convertir l'image base64 en File
        const response = await fetch(data.imageUrl);
        const blob = await response.blob();
        const file = new File([blob], `${formData.name.replace(/\s+/g, '-')}-ai-generated.png`, { type: 'image/png' });
        
        setSelectedImages(prev => [...prev, file]);
        toast({
          title: "Image générée avec succès",
          description: "L'image a été ajoutée à votre sélection"
        });
      }
    } catch (error) {
      console.error('Erreur génération image:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de générer l'image",
        variant: "destructive"
      });
    } finally {
      setGeneratingImage(false);
    }
  };

  const enhanceSelectedImages = async () => {
    if (selectedImages.length === 0) {
      toast({
        title: "Erreur",
        description: "Veuillez d'abord sélectionner des images à améliorer",
        variant: "destructive"
      });
      return;
    }

    try {
      setEnhancingImages(true);
      toast({
        title: "Amélioration en cours...",
        description: `Traitement de ${selectedImages.length} image(s) avec l'IA`
      });

      const enhancedImages: File[] = [];

      for (let i = 0; i < selectedImages.length; i++) {
        const file = selectedImages[i];
        
        // Convertir l'image en base64
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        
        const imageUrl = await base64Promise;

        const { data, error } = await supabase.functions.invoke('enhance-product-image', {
          body: { imageUrl }
        });

        if (error) {
          console.error(`Erreur amélioration image ${i + 1}:`, error);
          // Conserver l'image originale en cas d'erreur
          enhancedImages.push(file);
          continue;
        }

        if (data?.enhancedImageUrl) {
          const response = await fetch(data.enhancedImageUrl);
          const blob = await response.blob();
          const enhancedFile = new File([blob], `enhanced-${file.name}`, { type: 'image/png' });
          enhancedImages.push(enhancedFile);
        } else {
          enhancedImages.push(file);
        }
      }

      setSelectedImages(enhancedImages);
      toast({
        title: "Images améliorées",
        description: `${enhancedImages.length} image(s) ont été optimisées`
      });
    } catch (error) {
      console.error('Erreur amélioration images:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible d'améliorer les images",
        variant: "destructive"
      });
    } finally {
      setEnhancingImages(false);
    }
  };

  const generateSKU = async () => {
    if (!formData.name) {
      toast({
        title: "Erreur",
        description: "Veuillez d'abord entrer le nom du produit",
        variant: "destructive"
      });
      return;
    }

    try {
      setGeneratingSKU(true);

      // Générer un SKU intelligent basé sur le nom du produit
      const productName = formData.name.toUpperCase();
      const words = productName.split(' ').filter(w => w.length > 2);
      
      // Prendre les premières lettres des mots principaux
      let skuPrefix = '';
      if (words.length >= 3) {
        skuPrefix = words.slice(0, 3).map(w => w.substring(0, 3)).join('');
      } else if (words.length === 2) {
        skuPrefix = words[0].substring(0, 4) + words[1].substring(0, 4);
      } else {
        skuPrefix = words[0].substring(0, 6);
      }

      // Ajouter un identifiant unique
      const timestamp = Date.now().toString().slice(-6);
      const randomNum = Math.floor(Math.random() * 100).toString().padStart(2, '0');
      
      const generatedSKU = `${skuPrefix}-${timestamp}-${randomNum}`;
      
      setFormData(prev => ({ ...prev, sku: generatedSKU }));
      toast({
        title: "SKU généré",
        description: `Code SKU: ${generatedSKU}`
      });
    } catch (error) {
      console.error('Erreur génération SKU:', error);
      toast({
        title: "Erreur",
        description: "Impossible de générer le SKU",
        variant: "destructive"
      });
    } finally {
      setGeneratingSKU(false);
    }
  };

  const generateBarcode = async () => {
    if (!formData.name) {
      toast({
        title: "Erreur",
        description: "Veuillez d'abord entrer le nom du produit",
        variant: "destructive"
      });
      return;
    }

    try {
      setGeneratingBarcode(true);

      // Générer un code-barres EAN-13 valide
      // Format: 3 chiffres (préfixe GS1 Guinée fictif) + 9 chiffres (code produit) + 1 chiffre de contrôle
      
      const countryCode = '224'; // Code fictif pour la Guinée
      
      // Générer 9 chiffres basés sur le nom du produit et timestamp
      const productHash = formData.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const timestamp = Date.now().toString().slice(-6);
      const productCode = (productHash.toString() + timestamp).slice(0, 9).padStart(9, '0');
      
      // Calculer le chiffre de contrôle EAN-13
      const codeWithoutChecksum = countryCode + productCode;
      let sum = 0;
      for (let i = 0; i < codeWithoutChecksum.length; i++) {
        const digit = parseInt(codeWithoutChecksum[i]);
        sum += (i % 2 === 0) ? digit : digit * 3;
      }
      const checksum = (10 - (sum % 10)) % 10;
      
      const generatedBarcode = codeWithoutChecksum + checksum;
      
      setFormData(prev => ({ ...prev, barcode: generatedBarcode }));
      toast({
        title: "Code-barres généré",
        description: `EAN-13: ${generatedBarcode}`
      });
    } catch (error) {
      console.error('Erreur génération code-barres:', error);
      toast({
        title: "Erreur",
        description: "Impossible de générer le code-barres",
        variant: "destructive"
      });
    } finally {
      setGeneratingBarcode(false);
    }
  };

  const generateSimilarImage = async (sourceImageFile: File) => {
    try {
      setGeneratingSimilar(true);
      toast({
        title: "Génération en cours...",
        description: "L'IA crée une image similaire basée sur votre photo"
      });

      // Convertir l'image en base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(sourceImageFile);
      });
      
      const imageUrl = await base64Promise;

      const { data, error } = await supabase.functions.invoke('generate-similar-image', {
        body: {
          imageUrl,
          productName: formData.name
        }
      });

      if (error) {
        if (error.message?.includes('429')) {
          throw new Error('Limite de requêtes atteinte. Veuillez réessayer dans quelques instants.');
        }
        if (error.message?.includes('402')) {
          throw new Error('Crédits IA épuisés. Veuillez recharger votre compte.');
        }
        throw error;
      }

      if (data?.similarImageUrl) {
        // Convertir l'image base64 en File
        const response = await fetch(data.similarImageUrl);
        const blob = await response.blob();
        const file = new File([blob], `similar-${sourceImageFile.name}`, { type: 'image/png' });
        
        setSelectedImages(prev => [...prev, file]);
        toast({
          title: "Image similaire générée",
          description: "L'image a été ajoutée à votre sélection"
        });
      }
    } catch (error) {
      console.error('Erreur génération image similaire:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de générer une image similaire",
        variant: "destructive"
      });
    } finally {
      setGeneratingSimilar(false);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price?.toString() || '0',
      compare_price: product.compare_price?.toString() || '',
      cost_price: product.cost_price?.toString() || '',
      sku: product.sku || '',
      barcode: product.barcode || '',
      stock_quantity: product.stock_quantity?.toString() || '0',
      low_stock_threshold: product.low_stock_threshold?.toString() || '10',
      category_id: product.category_id || '',
      category_name: product.category_id ? categories.find(c => c.id === product.category_id)?.name || '' : '',
      weight: product.weight?.toString() || '',
      tags: product.tags?.join(', ') || '',
      is_active: product.is_active
    });
    // Note: Les images existantes ne peuvent pas être chargées dans selectedImages (File[])
    // car ce sont des URLs. On les affichera séparément dans le formulaire d'édition.
    setSelectedImages([]);
    setShowDialog(true);
  };

  const toggleProductStatus = async (productId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: !isActive })
        .eq('id', productId);

      if (error) throw error;

      setProducts(prev => prev.map(p => 
        p.id === productId ? { ...p, is_active: !isActive } : p
      ));

      toast({
        title: isActive ? "Produit désactivé" : "Produit activé",
        description: `Le produit a été ${isActive ? 'désactivé' : 'activé'} avec succès.`
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de modifier le statut du produit.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer "${product.name}" ? Cette action est irréversible.`)) {
      return;
    }

    try {
      console.log('Suppression du produit:', product.id);
      
      // Supprimer les entrées liées dans inventory
      await supabase.from('inventory').delete().eq('product_id', product.id);
      
      // Supprimer les entrées liées dans inventory_alerts
      await supabase.from('inventory_alerts').delete().eq('product_id', product.id);
      
      // Supprimer les entrées liées dans inventory_history
      await supabase.from('inventory_history').delete().eq('product_id', product.id);
      
      // Supprimer les entrées dans order_items
      await supabase.from('order_items').delete().eq('product_id', product.id);
      
      // Supprimer le produit
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', product.id);
      
      if (error) throw error;
      
      // Mettre à jour l'état local
      setProducts(prev => prev.filter(p => p.id !== product.id));
      
      toast({
        title: "Produit supprimé",
        description: `"${product.name}" a été supprimé avec succès.`
      });
    } catch (error: any) {
      console.error('Erreur suppression produit:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le produit: " + error.message,
        variant: "destructive"
      });
    }
  };

  if (loading) return <div className="p-4">Chargement des produits...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestion des Produits</h2>
          <p className="text-muted-foreground">Gérez votre catalogue de produits avec précision</p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button 
              className="bg-vendeur-gradient hover:opacity-90" 
              onClick={() => resetForm()}
              data-testid="add-product-button"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nouveau produit
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? 'Modifier le produit' : 'Ajouter un produit'}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              {/* Section Images */}
              <div className="space-y-3">
                <Label>Images du produit</Label>
                
                {/* Afficher les images existantes lors de l'édition */}
                {editingProduct && editingProduct.images && editingProduct.images.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm text-muted-foreground mb-2">Images actuelles:</p>
                    <div className="grid grid-cols-3 gap-2">
                      {editingProduct.images.map((url, index) => (
                        <div key={index} className="relative">
                          <img
                            src={url}
                            alt={`Image ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg border"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="border-2 border-dashed border-muted rounded-lg p-6">
                  <div className="flex flex-col items-center gap-3">
                    <Camera className="w-8 h-8 text-muted-foreground" />
                    <div className="text-center">
                      <p className="text-sm font-medium">
                        {editingProduct ? 'Ajouter de nouvelles images' : 'Glissez vos images ici'}
                      </p>
                      <p className="text-xs text-muted-foreground">PNG, JPG jusqu'à 10MB chacune</p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Choisir des fichiers
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={generateProductImage}
                      disabled={generatingImage || !formData.name}
                      title="Générer une image avec l'IA"
                    >
                      {generatingImage ? (
                        <>
                          <span className="animate-spin mr-2">⏳</span>
                          Génération...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Générer avec IA
                        </>
                      )}
                    </Button>
                    {selectedImages.length > 0 && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={enhanceSelectedImages}
                        disabled={enhancingImages}
                        title="Améliorer les images sélectionnées avec l'IA"
                      >
                        {enhancingImages ? (
                          <>
                            <span className="animate-spin mr-2">⏳</span>
                            Amélioration...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Améliorer {selectedImages.length} image(s)
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                  
                  {/* Affichage des nouvelles images sélectionnées */}
                  {selectedImages.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm text-muted-foreground mb-2">Nouvelles images à ajouter:</p>
                      <div className="grid grid-cols-3 gap-2">
                        {selectedImages.map((file, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={URL.createObjectURL(file)}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-24 object-cover rounded-lg"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => generateSimilarImage(file)}
                                disabled={generatingSimilar}
                                className="bg-primary text-primary-foreground rounded-full p-1.5 hover:bg-primary/90 transition-colors"
                                title="Générer une image similaire avec l'IA"
                              >
                                <Sparkles className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeImage(index)}
                                className="bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors"
                                title="Supprimer l'image"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Informations de base */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground">INFORMATIONS DE BASE</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nom du produit *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ex: iPhone 15 Pro"
                      className={!formData.name ? "border-red-300 focus:border-red-500" : ""}
                    />
                    {!formData.name && <p className="text-xs text-red-500">Le nom est obligatoire</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sku">Code SKU</Label>
                    <div className="flex gap-2">
                      <Input
                        id="sku"
                        value={formData.sku}
                        onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                        placeholder="Ex: IPH15PRO-170123-45"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={generateSKU}
                        disabled={!formData.name || generatingSKU}
                        title="Générer un SKU avec l'IA"
                      >
                        {generatingSKU ? (
                          <span className="animate-spin">⏳</span>
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Ex: Un smartphone haut de gamme avec écran OLED 6.7 pouces, processeur A17 Pro, caméra 48MP..."
                      rows={3}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={generateDescription}
                    disabled={generatingDescription || !formData.name}
                    className="w-full"
                  >
                    {generatingDescription ? (
                      <>
                        <span className="animate-spin mr-2">⏳</span>
                        Génération en cours...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Optimiser avec l'IA
                      </>
                    )}
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">
                      Catégorie
                      <span className="text-xs text-muted-foreground ml-2">(Optionnel)</span>
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="category"
                        value={formData.category_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, category_name: e.target.value }))}
                        placeholder="Ex: Électronique, Vêtements, Alimentation..."
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={generateCategory}
                        disabled={!formData.name || generatingCategory}
                        title="Générer une catégorie avec l'IA"
                      >
                        {generatingCategory ? (
                          <span className="animate-spin">⏳</span>
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    {formData.category_name && (
                      <p className="text-xs text-muted-foreground">
                        Catégorie: {formData.category_name}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="barcode">Code-barres</Label>
                    <div className="flex gap-2">
                      <Input
                        id="barcode"
                        value={formData.barcode}
                        onChange={(e) => setFormData(prev => ({ ...prev, barcode: e.target.value }))}
                        placeholder="Ex: 2241234567890"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={generateBarcode}
                        disabled={!formData.name || generatingBarcode}
                        title="Générer un code-barres avec l'IA"
                      >
                        {generatingBarcode ? (
                          <span className="animate-spin">⏳</span>
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Prix et coûts */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground">PRIX ET COÛTS</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Prix de vente * (GNF)</Label>
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                      placeholder="Ex: 5000000"
                      className={!formData.price ? "border-red-300 focus:border-red-500" : ""}
                    />
                    {!formData.price && <p className="text-xs text-red-500">Le prix est obligatoire</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="compare_price">Prix comparatif (GNF)</Label>
                    <Input
                      id="compare_price"
                      type="number"
                      min="0"
                      value={formData.compare_price}
                      onChange={(e) => setFormData(prev => ({ ...prev, compare_price: e.target.value }))}
                      placeholder="Ex: 6000000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cost_price">Prix de revient (GNF)</Label>
                    <Input
                      id="cost_price"
                      type="number"
                      min="0"
                      value={formData.cost_price}
                      onChange={(e) => setFormData(prev => ({ ...prev, cost_price: e.target.value }))}
                      placeholder="Ex: 4000000"
                    />
                  </div>
                </div>
                {formData.price && formData.compare_price && parseFloat(formData.price) > parseFloat(formData.compare_price) && (
                  <p className="text-xs text-orange-500">⚠️ Le prix de vente est supérieur au prix comparatif</p>
                )}
              </div>

              {/* Inventaire */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground">INVENTAIRE</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="stock_quantity">Stock initial</Label>
                    <Input
                      id="stock_quantity"
                      type="number"
                      min="0"
                      value={formData.stock_quantity}
                      onChange={(e) => setFormData(prev => ({ ...prev, stock_quantity: e.target.value }))}
                      placeholder="Ex: 50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="low_stock_threshold">Seuil stock bas</Label>
                    <Input
                      id="low_stock_threshold"
                      type="number"
                      min="0"
                      value={formData.low_stock_threshold}
                      onChange={(e) => setFormData(prev => ({ ...prev, low_stock_threshold: e.target.value }))}
                      placeholder="10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weight">Poids (kg)</Label>
                    <Input
                      id="weight"
                      type="number"
                      min="0"
                      step="0.1"
                      value={formData.weight}
                      onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value }))}
                      placeholder="Ex: 0.5"
                    />
                  </div>
                </div>
              </div>

              {/* Métadonnées */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground">MÉTADONNÉES</h4>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="tags">
                      Tags (séparés par des virgules)
                      <span className="text-xs text-muted-foreground ml-2">(Optionnel)</span>
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="tags"
                        value={formData.tags}
                        onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                        placeholder="Ex: électronique, smartphone, apple, 5g, promotion"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={generateTags}
                        disabled={!formData.name || generatingTags}
                        title="Générer des tags avec l'IA"
                      >
                        {generatingTags ? (
                          <span className="animate-spin">⏳</span>
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Utilisez des virgules pour séparer les tags</p>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <Label htmlFor="is_active" className="font-medium">Statut du produit</Label>
                      <p className="text-sm text-muted-foreground">
                        {formData.is_active ? 'Produit actif et visible dans la boutique' : 'Produit inactif et masqué'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="is_active"
                        checked={formData.is_active}
                        onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                        className="w-4 h-4 text-vendeur-primary"
                      />
                      <Label htmlFor="is_active" className="text-sm font-medium">
                        {formData.is_active ? 'Actif' : 'Inactif'}
                      </Label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Boutons d'action */}
              <div className="flex justify-between pt-4 border-t">
                <Button variant="outline" onClick={() => {
                  setShowDialog(false);
                  resetForm();
                }}>
                  <X className="w-4 h-4 mr-2" />
                  Annuler
                </Button>
                <div className="flex gap-2">
                  {editingProduct && (
                    <Button 
                      variant="destructive" 
                      onClick={async () => {
                        if (window.confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) {
                          try {
                            console.log('Suppression du produit:', editingProduct.id);
                            
                            // Supprimer d'abord les entrées liées dans inventory
                            const { error: inventoryError } = await supabase
                              .from('inventory')
                              .delete()
                              .eq('product_id', editingProduct.id);
                            
                            if (inventoryError) {
                              console.error('Erreur suppression inventaire:', inventoryError);
                            }

                            // Supprimer les entrées liées dans inventory_alerts
                            const { error: alertsError } = await supabase
                              .from('inventory_alerts')
                              .delete()
                              .eq('product_id', editingProduct.id);
                            
                            if (alertsError) {
                              console.error('Erreur suppression alertes:', alertsError);
                            }

                            // Supprimer les entrées liées dans inventory_history
                            const { error: historyError } = await supabase
                              .from('inventory_history')
                              .delete()
                              .eq('product_id', editingProduct.id);
                            
                            if (historyError) {
                              console.error('Erreur suppression historique:', historyError);
                            }

                            // Supprimer les entrées dans order_items
                            const { error: orderItemsError } = await supabase
                              .from('order_items')
                              .delete()
                              .eq('product_id', editingProduct.id);
                            
                            if (orderItemsError) {
                              console.error('Erreur suppression order_items:', orderItemsError);
                            }

                            // Supprimer les favoris
                            const { error: favoritesError } = await supabase
                              .from('favorites')
                              .delete()
                              .eq('product_id', editingProduct.id);
                            
                            if (favoritesError) {
                              console.error('Erreur suppression favoris:', favoritesError);
                            }

                            // Supprimer les entrées dans carts
                            const { error: cartsError } = await supabase
                              .from('carts')
                              .delete()
                              .eq('product_id', editingProduct.id);
                            
                            if (cartsError) {
                              console.error('Erreur suppression panier:', cartsError);
                            }

                            // Maintenant supprimer le produit
                            const { error: productError } = await supabase
                              .from('products')
                              .delete()
                              .eq('id', editingProduct.id);
                            
                            if (productError) {
                              console.error('Erreur suppression produit:', productError);
                              throw productError;
                            }
                            
                            console.log('Produit supprimé avec succès');
                            setProducts(prev => prev.filter(p => p.id !== editingProduct.id));
                            setShowDialog(false);
                            resetForm();
                            
                            toast({
                              title: "Produit supprimé",
                              description: "Le produit et toutes ses données ont été supprimés avec succès."
                            });
                          } catch (error: any) {
                            console.error('Erreur complète:', error);
                            toast({
                              title: "Erreur",
                              description: `Impossible de supprimer le produit: ${error.message || 'Erreur inconnue'}`,
                              variant: "destructive"
                            });
                          }
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Supprimer
                    </Button>
                  )}
                  <Button 
                    onClick={handleSaveProduct} 
                    disabled={!formData.name || !formData.price}
                    className="bg-vendeur-gradient hover:opacity-90"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {editingProduct ? 'Mettre à jour' : 'Ajouter le produit'}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total produits</p>
                <p className="text-2xl font-bold">{products.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Produits actifs</p>
                <p className="text-2xl font-bold text-green-600">
                  {products.filter(p => p.is_active).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all hover:shadow-lg ${lowStockFilter ? 'ring-2 ring-orange-600' : ''}`}
          onClick={() => setLowStockFilter(!lowStockFilter)}
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="text-sm text-muted-foreground">Stock bas</p>
                <p className="text-2xl font-bold text-orange-600">
                  {products.filter(p => p.stock_quantity <= p.low_stock_threshold).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-blue-600 rounded-full" />
              <div>
                <p className="text-sm text-muted-foreground">Valeur totale</p>
                <p className="text-2xl font-bold">
                  {products.reduce((acc, p) => acc + (p.price * p.stock_quantity), 0).toLocaleString()} GNF
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher un produit..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "active" | "all" | "inactive")}
              className="px-3 py-2 border rounded-md"
            >
              <option value="all">Tous les produits</option>
              <option value="active">Produits actifs</option>
              <option value="inactive">Produits inactifs</option>
            </select>
            {lowStockFilter && (
              <Badge 
                variant="outline" 
                className="border-orange-600 text-orange-600 cursor-pointer"
                onClick={() => setLowStockFilter(false)}
              >
                Stock faible uniquement ✕
              </Badge>
            )}
            <Filter className="w-4 h-4 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>

      {/* Liste des produits */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product) => (
          <Card key={product.id} className="hover:shadow-lg transition-shadow duration-300">
            <CardContent className="p-6">
              {/* Image du produit */}
              {product.images && product.images.length > 0 && (
                <div className="mb-4 rounded-lg overflow-hidden bg-muted">
                  <img 
                    src={product.images[0]} 
                    alt={product.name}
                    className="w-full h-48 object-cover"
                  />
                </div>
              )}
              
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {product.public_id && (
                      <PublicIdBadge 
                        publicId={product.public_id}
                        variant="secondary"
                        size="sm"
                        copyable={true}
                      />
                    )}
                    {product.sku && (
                      <Badge variant="outline">{product.sku}</Badge>
                    )}
                  </div>
                  <h3 className="font-semibold text-lg mb-1 line-clamp-2">{product.name}</h3>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => handleEdit(product)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => toggleProductStatus(product.id, product.is_active)}
                    className={product.is_active ? 'text-green-600' : 'text-gray-400'}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => handleDeleteProduct(product)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold text-vendeur-primary">
                    {product.price.toLocaleString()} GNF
                  </span>
                  {product.compare_price && product.compare_price > product.price && (
                    <span className="text-sm text-muted-foreground line-through">
                      {product.compare_price.toLocaleString()} GNF
                    </span>
                  )}
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Stock:</span>
                  <span className={`font-medium ${
                    product.stock_quantity <= product.low_stock_threshold 
                      ? 'text-orange-600' 
                      : 'text-green-600'
                  }`}>
                    {product.stock_quantity} unités
                  </span>
                </div>

                {product.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {product.description}
                  </p>
                )}

                <div className="flex items-center justify-between pt-2">
                  <Badge variant={product.is_active ? "default" : "secondary"}>
                    {product.is_active ? "Actif" : "Inactif"}
                  </Badge>
                  {product.stock_quantity <= product.low_stock_threshold && (
                    <Badge variant="destructive" className="text-xs">
                      Stock bas
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <Card>
          <CardContent className="p-12">
            <div className="text-center">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucun produit trouvé</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Aucun produit ne correspond aux critères de recherche.' 
                  : 'Commencez par ajouter votre premier produit.'}
              </p>
              <Button onClick={() => setShowDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Ajouter un produit
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}