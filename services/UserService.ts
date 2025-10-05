
// Service de gestion des utilisateurs
import { supabase } from './supabase';
import type { User } from './supabase';

export class UserService {
  // Créer un utilisateur complet
  static async createUser(userData: {
    email: string;
    full_name: string;
    phone: string;
    role?: string;
    location?: string;
  }) {
    const { data, error } = await supabase.rpc('create_user_complete', {
      p_email: userData.email,
      p_full_name: userData.full_name,
      p_phone: userData.phone,
      p_role: userData.role || 'client',
      p_location: userData.location || 'Conakry, Guinée'
    });

    if (error) throw error;
    return data;
  }

  // Obtenir les informations complètes d'un utilisateur
  static async getUserComplete(userId: string) {
    const { data, error } = await supabase.rpc('get_user_complete', {
      p_user_id: userId
    });

    if (error) throw error;
    return data;
  }

  // Obtenir tous les utilisateurs
  static async getAllUsers() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  // Mettre à jour un utilisateur
  static async updateUser(userId: string, updates: Partial<User>) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select();

    if (error) throw error;
    return data[0];
  }

  // Supprimer un utilisateur
  static async deleteUser(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (error) throw error;
    return data;
  }
}
