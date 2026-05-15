/**
 * Composant de gestion du menu restaurant
 * Catégories et plats avec CRUD complet + multi-images + vidéo Elite
 */

import { useState } from 'react';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus, Edit2, Trash2, UtensilsCrossed, Tag,
  Clock, Star, Eye, EyeOff,
  Search, Upload, X, Loader2, Image as ImageIcon, Video, Lock
} from 'lucide-react';
import { useRestaurantMenu, MenuCategory, MenuItem } from '@/hooks/useRestaurantMenu';
import { useUnifiedSubscription } from '@/hooks/useUnifiedSubscription';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RestaurantMenuManagerProps {
  serviceId: string;
}

const DIETARY_TAGS = [
  { value: 'vegetarien', label: 'Végétarien', icon: '🥬' },
  { value: 'vegan', label: 'Végan', icon: '🌱' },
  { value: 'halal', label: 'Halal', icon: '🕌' },
  { value: 'casher', label: 'Casher', icon: '✡️' },
  { value: 'sans_gluten', label: 'Sans gluten', icon: '🌾' },
  { value: 'bio', label: 'Bio', icon: '🌿' },
];

const MAX_IMAGES = 5;
const MAX_VIDEO_SIZE_MB = 50;
const MAX_VIDEO_DURATION_S = 45;

export function RestaurantMenuManager({ serviceId }: RestaurantMenuManagerProps) {
  const formatCurrency = useFormatCurrency();
  const { subscription } = useUnifiedSubscription();
  const isElite = subscription?.plan_name?.toLowerCase() === 'elite';

  const {
    categories,
    menuItems,
    loading,
    createCategory,
    updateCategory,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
    toggleItemAvailability,
  } = useRestaurantMenu(serviceId);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  // États du formulaire plat
  const [itemForm, setItemForm] = useState({
    name: '',
    description: '',
    price: '',
    category_id: '',
    preparation_time: '15',
    spicy_level: '0',
    is_featured: false,
    dietary_tags: [] as string[],
    image_url: '',
    images: [] as string[],
    video_url: '',
  });

  // États du formulaire catégorie
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    icon: '🍽️',
  });

  const resetItemForm = () => {
    setItemForm({
      name: '',
      description: '',
      price: '',
      category_id: '',
      preparation_time: '15',
      spicy_level: '0',
      is_featured: false,
      dietary_tags: [],
      image_url: '',
      images: [],
      video_url: '',
    });
    setEditingItem(null);
  };

  const resetCategoryForm = () => {
    setCategoryForm({ name: '', description: '', icon: '🍽️' });
    setEditingCategory(null);
  };

  const handleSaveItem = async () => {
    if (!itemForm.name || !itemForm.price) {
      toast.error('Nom et prix requis');
      return;
    }

    const allImages = itemForm.images.length > 0
      ? itemForm.images
      : itemForm.image_url
        ? [itemForm.image_url]
        : [];

    try {
      if (editingItem) {
        await updateMenuItem(editingItem.id, {
          name: itemForm.name,
          description: itemForm.description || null,
          price: parseFloat(itemForm.price),
          category_id: itemForm.category_id || null,
          preparation_time: parseInt(itemForm.preparation_time),
          spicy_level: parseInt(itemForm.spicy_level),
          is_featured: itemForm.is_featured,
          dietary_tags: itemForm.dietary_tags,
          image_url: allImages[0] || null,
          images: allImages,
          video_url: itemForm.video_url || null,
        });
        toast.success('Plat mis à jour');
      } else {
        await createMenuItem({
          name: itemForm.name,
          description: itemForm.description || undefined,
          price: parseFloat(itemForm.price),
          category_id: itemForm.category_id || undefined,
          preparation_time: parseInt(itemForm.preparation_time),
          spicy_level: parseInt(itemForm.spicy_level),
          is_featured: itemForm.is_featured,
          dietary_tags: itemForm.dietary_tags,
          image_url: allImages[0] || undefined,
          images: allImages,
          video_url: itemForm.video_url || undefined,
        });
        toast.success('Plat ajouté');
      }
      setShowItemDialog(false);
      resetItemForm();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name) { toast.error('Nom requis'); return; }
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, categoryForm);
        toast.success('Catégorie mise à jour');
      } else {
        await createCategory(categoryForm);
        toast.success('Catégorie ajoutée');
      }
      setShowCategoryDialog(false);
      resetCategoryForm();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleEditItem = (item: MenuItem) => {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      description: item.description || '',
      price: item.price.toString(),
      category_id: item.category_id || '',
      preparation_time: item.preparation_time.toString(),
      spicy_level: item.spicy_level.toString(),
      is_featured: item.is_featured,
      dietary_tags: item.dietary_tags || [],
      image_url: item.image_url || '',
      images: item.images || (item.image_url ? [item.image_url] : []),
      video_url: item.video_url || '',
    });
    setShowItemDialog(true);
  };

  const handleImageUpload = async (file: File) => {
    if (!file) return;
    if (itemForm.images.length >= MAX_IMAGES) {
      toast.error(`Maximum ${MAX_IMAGES} images par plat`);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("L'image ne doit pas dépasser 5 MB");
      return;
    }
    try {
      setUploadingImage(true);
      const ext = file.name.split('.').pop();
      const path = `restaurant-dishes/${serviceId}_${Date.now()}.${ext}`;
      const { error: storageError } = await supabase.storage
        .from('public-images')
        .upload(path, file, { upsert: true });
      if (storageError) throw storageError;
      const { data: { publicUrl } } = supabase.storage.from('public-images').getPublicUrl(path);
      setItemForm(prev => ({
        ...prev,
        images: [...prev.images, publicUrl],
        image_url: prev.images.length === 0 ? publicUrl : prev.image_url,
      }));
      toast.success('Image ajoutée !');
    } catch (err: any) {
      toast.error("Erreur upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    setItemForm(prev => {
      const newImages = prev.images.filter((_, i) => i !== index);
      return { ...prev, images: newImages, image_url: newImages[0] || '' };
    });
  };

  const handleVideoUpload = async (file: File) => {
    if (!file) return;
    if (!isElite) {
      toast.error('Upload vidéo réservé au plan Elite');
      return;
    }
    if (file.size > MAX_VIDEO_SIZE_MB * 1024 * 1024) {
      toast.error(`La vidéo ne doit pas dépasser ${MAX_VIDEO_SIZE_MB} MB`);
      return;
    }

    // Vérification durée via élément video HTML
    const duration = await getVideoDuration(file);
    if (duration > MAX_VIDEO_DURATION_S) {
      toast.error(`La vidéo ne doit pas dépasser ${MAX_VIDEO_DURATION_S} secondes (durée : ${Math.round(duration)}s)`);
      return;
    }

    try {
      setUploadingVideo(true);
      const ext = file.name.split('.').pop();
      const path = `restaurant-dishes/video_${serviceId}_${Date.now()}.${ext}`;
      const { error: storageError } = await supabase.storage
        .from('product-videos')
        .upload(path, file, { upsert: true });
      if (storageError) throw storageError;
      const { data: { publicUrl } } = supabase.storage.from('product-videos').getPublicUrl(path);
      setItemForm(prev => ({ ...prev, video_url: publicUrl }));
      toast.success('Vidéo uploadée !');
    } catch (err: any) {
      toast.error("Erreur upload vidéo");
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleEditCategory = (cat: MenuCategory) => {
    setEditingCategory(cat);
    setCategoryForm({ name: cat.name, description: cat.description || '', icon: cat.icon || '🍽️' });
    setShowCategoryDialog(true);
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Supprimer ce plat ?')) return;
    try {
      await deleteMenuItem(id);
      toast.success('Plat supprimé');
    } catch (err: any) {
      toast.error(err.message);
    }
  };


  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || item.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex-1 w-full md:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un plat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={resetCategoryForm}>
                <Tag className="w-4 h-4 mr-2" />
                Catégorie
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingCategory ? 'Modifier la catégorie' : 'Nouvelle catégorie'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nom</Label>
                  <Input
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Entrées, Plats principaux..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Icône (emoji)</Label>
                  <Input
                    value={categoryForm.icon}
                    onChange={(e) => setCategoryForm(prev => ({ ...prev, icon: e.target.value }))}
                    placeholder="🍽️"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={categoryForm.description}
                    onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCategoryDialog(false)}>Annuler</Button>
                <Button onClick={handleSaveCategory}>{editingCategory ? 'Mettre à jour' : 'Créer'}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
            <DialogTrigger asChild>
              <Button onClick={resetItemForm}>
                <Plus className="w-4 h-4 mr-2" />
                Ajouter un plat
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingItem ? 'Modifier le plat' : 'Nouveau plat'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label>Nom du plat *</Label>
                    <Input
                      value={itemForm.name}
                      onChange={(e) => setItemForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ex: Poulet yassa"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Prix (FG) *</Label>
                    <Input
                      type="number"
                      value={itemForm.price}
                      onChange={(e) => setItemForm(prev => ({ ...prev, price: e.target.value }))}
                      placeholder="50000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Catégorie</Label>
                    <Select
                      value={itemForm.category_id}
                      onValueChange={(v) => setItemForm(prev => ({ ...prev, category_id: v }))}
                    >
                      <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.icon} {cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={itemForm.description}
                    onChange={(e) => setItemForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Décrivez le plat..."
                    rows={2}
                  />
                </div>

                {/* Multi-images du plat */}
                <div className="space-y-2">
                  <Label>
                    Photos du plat
                    <span className="text-xs text-muted-foreground ml-2">
                      ({itemForm.images.length}/{MAX_IMAGES})
                    </span>
                  </Label>
                  <div className="border-2 border-dashed rounded-lg p-3 space-y-3">
                    {/* Grille d'images */}
                    {itemForm.images.length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {itemForm.images.map((url, idx) => (
                          <div key={idx} className="relative group">
                            <img
                              src={url}
                              alt={`Photo ${idx + 1}`}
                              className="w-full h-20 object-cover rounded-md"
                            />
                            {idx === 0 && (
                              <span className="absolute top-1 left-1 text-[10px] bg-primary text-primary-foreground px-1 rounded">
                                Principale
                              </span>
                            )}
                            <button
                              onClick={() => handleRemoveImage(idx)}
                              className="absolute -top-1.5 -right-1.5 p-0.5 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {itemForm.images.length === 0 && (
                      <div className="text-center py-2">
                        <ImageIcon className="w-8 h-8 text-muted-foreground mx-auto mb-1" />
                        <p className="text-xs text-muted-foreground">Aucune photo</p>
                      </div>
                    )}
                    {itemForm.images.length < MAX_IMAGES && (
                      <label className="block text-center">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                          disabled={uploadingImage}
                        />
                        <Button variant="outline" size="sm" asChild disabled={uploadingImage}>
                          <span className="cursor-pointer">
                            {uploadingImage
                              ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              : <Upload className="w-4 h-4 mr-2" />
                            }
                            {uploadingImage ? 'Upload...' : 'Ajouter une photo'}
                          </span>
                        </Button>
                      </label>
                    )}
                  </div>
                </div>

                {/* Vidéo du plat — Elite uniquement */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Vidéo du plat (max 45 s)
                    {!isElite && (
                      <Badge variant="secondary" className="text-xs gap-1">
                        <Lock className="w-3 h-3" /> Elite
                      </Badge>
                    )}
                  </Label>
                  <div className={`border-2 border-dashed rounded-lg p-3 ${!isElite ? 'opacity-60' : ''}`}>
                    {itemForm.video_url ? (
                      <div className="space-y-2">
                        <video
                          src={itemForm.video_url}
                          controls
                          className="w-full rounded-md max-h-32 object-contain bg-black"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setItemForm(prev => ({ ...prev, video_url: '' }))}
                          className="w-full"
                        >
                          <X className="w-4 h-4 mr-2" /> Supprimer la vidéo
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center py-2">
                        <Video className="w-8 h-8 text-muted-foreground mx-auto mb-1" />
                        <p className="text-xs text-muted-foreground mb-2">
                          {isElite ? 'MP4 / MOV · max 45 s · max 50 MB' : 'Disponible avec le plan Elite'}
                        </p>
                        {isElite && (
                          <label className="block">
                            <input
                              type="file"
                              accept="video/*"
                              className="hidden"
                              onChange={(e) => e.target.files?.[0] && handleVideoUpload(e.target.files[0])}
                              disabled={uploadingVideo}
                            />
                            <Button variant="outline" size="sm" asChild disabled={uploadingVideo}>
                              <span className="cursor-pointer">
                                {uploadingVideo
                                  ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  : <Upload className="w-4 h-4 mr-2" />
                                }
                                {uploadingVideo ? 'Upload...' : 'Ajouter une vidéo'}
                              </span>
                            </Button>
                          </label>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Temps de préparation (min)</Label>
                    <Input
                      type="number"
                      value={itemForm.preparation_time}
                      onChange={(e) => setItemForm(prev => ({ ...prev, preparation_time: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Niveau épicé (0-3)</Label>
                    <Select
                      value={itemForm.spicy_level}
                      onValueChange={(v) => setItemForm(prev => ({ ...prev, spicy_level: v }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Non épicé</SelectItem>
                        <SelectItem value="1">🌶️ Léger</SelectItem>
                        <SelectItem value="2">🌶️🌶️ Moyen</SelectItem>
                        <SelectItem value="3">🌶️🌶️🌶️ Fort</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Tags alimentaires</Label>
                  <div className="flex flex-wrap gap-2">
                    {DIETARY_TAGS.map(tag => (
                      <Badge
                        key={tag.value}
                        variant={itemForm.dietary_tags.includes(tag.value) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => {
                          setItemForm(prev => ({
                            ...prev,
                            dietary_tags: prev.dietary_tags.includes(tag.value)
                              ? prev.dietary_tags.filter(t => t !== tag.value)
                              : [...prev.dietary_tags, tag.value]
                          }));
                        }}
                      >
                        {tag.icon} {tag.label}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm font-medium">Plat signature</span>
                  </div>
                  <Switch
                    checked={itemForm.is_featured}
                    onCheckedChange={(v) => setItemForm(prev => ({ ...prev, is_featured: v }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowItemDialog(false)}>Annuler</Button>
                <Button onClick={handleSaveItem}>{editingItem ? 'Mettre à jour' : 'Créer'}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filtres par catégorie */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={!selectedCategory ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setSelectedCategory(null)}
          >
            Tous ({menuItems.length})
          </Badge>
          {categories.map(cat => {
            const count = menuItems.filter(i => i.category_id === cat.id).length;
            return (
              <Badge
                key={cat.id}
                variant={selectedCategory === cat.id ? 'default' : 'outline'}
                className="cursor-pointer group"
                onClick={() => setSelectedCategory(cat.id)}
              >
                {cat.icon} {cat.name} ({count})
                <button
                  className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => { e.stopPropagation(); handleEditCategory(cat); }}
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}

      {/* Liste des plats */}
      {filteredItems.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <UtensilsCrossed className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {searchQuery || selectedCategory
                ? 'Aucun plat trouvé avec ces filtres'
                : 'Ajoutez votre premier plat au menu'}
            </p>
            {!searchQuery && !selectedCategory && (
              <Button className="mt-4" onClick={() => setShowItemDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Ajouter un plat
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map(item => {
            const category = categories.find(c => c.id === item.category_id);
            const displayImages = item.images && item.images.length > 0
              ? item.images
              : item.image_url
                ? [item.image_url]
                : [];
            return (
              <Card key={item.id} className={`relative ${!item.is_available ? 'opacity-60' : ''}`}>
                {item.is_featured && (
                  <div className="absolute top-2 right-2 z-10">
                    <Badge className="bg-yellow-500">
                      <Star className="w-3 h-3 mr-1" />
                      Signature
                    </Badge>
                  </div>
                )}
                {item.is_new && (
                  <div className="absolute top-2 left-2 z-10">
                    <Badge variant="secondary">Nouveau</Badge>
                  </div>
                )}

                {/* Aperçu image principale */}
                {displayImages.length > 0 && (
                  <div className="relative h-32 overflow-hidden rounded-t-lg">
                    <img
                      src={displayImages[0]}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                    {displayImages.length > 1 && (
                      <span className="absolute bottom-1 right-1 bg-black/60 text-white text-xs px-1.5 rounded">
                        +{displayImages.length - 1}
                      </span>
                    )}
                    {item.video_url && (
                      <span className="absolute bottom-1 left-1 bg-black/60 text-white rounded p-0.5">
                        <Video className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                )}

                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{item.name}</h3>
                      {category && (
                        <span className="text-xs text-muted-foreground">
                          {category.icon} {category.name}
                        </span>
                      )}
                    </div>
                    <span className="font-bold text-primary">{formatCurrency(item.price)}</span>
                  </div>

                  {item.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{item.description}</p>
                  )}

                  <div className="flex flex-wrap gap-1 mb-3">
                    {item.spicy_level > 0 && (
                      <Badge variant="outline" className="text-xs">{'🌶️'.repeat(item.spicy_level)}</Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      <Clock className="w-3 h-3 mr-1" />{item.preparation_time} min
                    </Badge>
                    {item.dietary_tags?.map(tag => {
                      const tagInfo = DIETARY_TAGS.find(t => t.value === tag);
                      return tagInfo ? (
                        <Badge key={tag} variant="outline" className="text-xs">{tagInfo.icon}</Badge>
                      ) : null;
                    })}
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t">
                    <Button variant="ghost" size="sm" onClick={() => toggleItemAvailability(item.id)}>
                      {item.is_available ? (
                        <><Eye className="w-4 h-4 mr-1 text-green-600" /><span className="text-green-600">Disponible</span></>
                      ) : (
                        <><EyeOff className="w-4 h-4 mr-1" />Indisponible</>
                      )}
                    </Button>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEditItem(item)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => handleDeleteItem(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default RestaurantMenuManager;

/** Lit la durée d'un fichier vidéo via l'API HTML5 */
function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(video.duration); };
    video.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Impossible de lire la vidéo')); };
    video.src = url;
  });
}
