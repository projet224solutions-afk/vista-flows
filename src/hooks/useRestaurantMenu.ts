/**
 * Hook: Gestion du menu restaurant
 * CRUD catégories et plats avec professional_service_id
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MenuCategory {
  id: string;
  professional_service_id: string;
  name: string;
  description: string | null;
  icon: string | null;
  display_order: number;
  is_active: boolean;
  available_from: string | null;
  available_until: string | null;
  image_url: string | null;
  created_at: string;
}

export interface MenuItem {
  id: string;
  professional_service_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  cost_price: number | null;
  image_url: string | null;
  preparation_time: number;
  calories: number | null;
  allergens: string[] | null;
  dietary_tags: string[] | null;
  spicy_level: number;
  is_available: boolean;
  is_featured: boolean;
  is_new: boolean;
  display_order: number;
  ingredients: any;
  variants: any;
  created_at: string;
  category?: MenuCategory;
}

export function useRestaurantMenu(serviceId: string) {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMenu = useCallback(async () => {
    if (!serviceId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Charger les catégories
      const { data: categoriesData, error: catError } = await supabase
        .from('restaurant_menu_categories')
        .select('*')
        .eq('professional_service_id', serviceId)
        .order('display_order', { ascending: true });

      if (catError) throw catError;
      setCategories(categoriesData || []);

      // Charger les plats
      const { data: itemsData, error: itemsError } = await supabase
        .from('restaurant_menu_items')
        .select('*')
        .eq('professional_service_id', serviceId)
        .order('display_order', { ascending: true });

      if (itemsError) throw itemsError;
      setMenuItems(itemsData || []);

    } catch (err: any) {
      console.error('Erreur chargement menu:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [serviceId]);

  // CRUD Catégories
  const createCategory = async (data: { name: string } & Partial<Omit<MenuCategory, 'name'>>) => {
    const { data: newCat, error } = await supabase
      .from('restaurant_menu_categories')
      .insert([{ 
        name: data.name,
        description: data.description,
        icon: data.icon,
        display_order: data.display_order ?? 0,
        is_active: data.is_active ?? true,
        available_from: data.available_from,
        available_until: data.available_until,
        image_url: data.image_url,
        professional_service_id: serviceId 
      }])
      .select()
      .single();
    
    if (error) throw error;
    setCategories(prev => [...prev, newCat]);
    return newCat;
  };

  const updateCategory = async (id: string, data: Partial<MenuCategory>) => {
    const { data: updated, error } = await supabase
      .from('restaurant_menu_categories')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    setCategories(prev => prev.map(c => c.id === id ? updated : c));
    return updated;
  };

  const deleteCategory = async (id: string) => {
    const { error } = await supabase
      .from('restaurant_menu_categories')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    setCategories(prev => prev.filter(c => c.id !== id));
  };

  // CRUD Menu Items
  const createMenuItem = async (data: { name: string; price: number } & Partial<Omit<MenuItem, 'name' | 'price'>>) => {
    const { data: newItem, error } = await supabase
      .from('restaurant_menu_items')
      .insert([{ 
        name: data.name,
        price: data.price,
        description: data.description,
        category_id: data.category_id,
        image_url: data.image_url,
        preparation_time: data.preparation_time ?? 15,
        is_available: data.is_available ?? true,
        is_featured: data.is_featured ?? false,
        is_new: data.is_new ?? false,
        spicy_level: data.spicy_level ?? 0,
        display_order: data.display_order ?? 0,
        allergens: data.allergens,
        dietary_tags: data.dietary_tags,
        professional_service_id: serviceId 
      }])
      .select()
      .single();
    
    if (error) throw error;
    setMenuItems(prev => [...prev, newItem]);
    return newItem;
  };

  const updateMenuItem = async (id: string, data: Partial<MenuItem>) => {
    const { data: updated, error } = await supabase
      .from('restaurant_menu_items')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    setMenuItems(prev => prev.map(i => i.id === id ? updated : i));
    return updated;
  };

  const deleteMenuItem = async (id: string) => {
    const { error } = await supabase
      .from('restaurant_menu_items')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    setMenuItems(prev => prev.filter(i => i.id !== id));
  };

  const toggleItemAvailability = async (id: string) => {
    const item = menuItems.find(i => i.id === id);
    if (!item) return;
    
    await updateMenuItem(id, { is_available: !item.is_available });
  };

  useEffect(() => {
    loadMenu();
  }, [loadMenu]);

  return {
    categories,
    menuItems,
    loading,
    error,
    refresh: loadMenu,
    createCategory,
    updateCategory,
    deleteCategory,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
    toggleItemAvailability,
  };
}
