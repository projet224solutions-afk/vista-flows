import { apiRequest } from "@/lib/queryClient";

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role?: string;
  location?: string;
  createdAt?: string;
}

export interface CreateUserData {
  email: string;
  fullName: string;
  phone: string;
  role?: string;
  location?: string;
}

export class UserApiService {
  static async getProfile(userId: string): Promise<User> {
    return apiRequest(`/api/profiles/${userId}`);
  }

  static async getProfileByEmail(email: string): Promise<User> {
    return apiRequest(`/api/profiles/email/${email}`);
  }

  static async createProfile(data: CreateUserData): Promise<User> {
    return apiRequest('/api/profiles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async updateProfile(userId: string, updates: Partial<User>): Promise<User> {
    return apiRequest(`/api/profiles/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  static async getCurrentUser(): Promise<User> {
    return apiRequest('/api/auth/me');
  }
}
