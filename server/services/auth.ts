import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { storage } from '../storage.js';
import type { InsertProfile, Profile } from '../../shared/schema.js';

// SÉCURITÉ: Forcer JWT secret en production
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('CRITICAL: JWT_SECRET must be set in production environment');
}

// Fallback seulement en développement
const SECRET_KEY = JWT_SECRET || 'dev-secret-key-ONLY-FOR-DEVELOPMENT';
const JWT_EXPIRY = '7d';
const SALT_ROUNDS = 10;

export interface AuthResponse {
  profile: Omit<Profile, 'password'>;
  token: string;
}

function generateCustomId(): string {
  let letters = '';
  for (let i = 0; i < 3; i++) {
    letters += String.fromCharCode(65 + Math.floor(Math.random() * 26));
  }
  
  let numbers = '';
  for (let i = 0; i < 4; i++) {
    numbers += Math.floor(Math.random() * 10).toString();
  }
  
  return letters + numbers;
}

function generateCardNumber(): string {
  return '4*** **** **** ' + Math.floor(Math.random() * 9999).toString().padStart(4, '0');
}

function generateCVV(): string {
  return (Math.floor(Math.random() * 900) + 100).toString();
}

async function autoSetupUser(userId: string, email: string, firstName?: string, lastName?: string): Promise<void> {
  const customId = generateCustomId();
  
  await storage.createUserId({ userId, customId });
  
  await storage.createWallet({
    userId,
    balance: '10000',
    currency: 'XAF'
  });
  
  const cardholderName = `${firstName || 'Client'} ${lastName || customId}`;
  const expiryDate = new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000);
  
  await storage.createVirtualCard({
    userId,
    cardNumber: generateCardNumber(),
    cardholderName,
    expiryDate,
    cvv: generateCVV(),
    isActive: true,
    dailyLimit: '500000',
    monthlyLimit: '2000000'
  });
}

export function removePassword(profile: Profile): Omit<Profile, 'password'> {
  const { password, ...profileWithoutPassword } = profile;
  return profileWithoutPassword;
}

export const authService = {
  async register(data: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    role?: string;
  }): Promise<AuthResponse> {
    const existingProfile = await storage.getProfileByEmail(data.email);
    if (existingProfile) {
      throw new Error('Email already exists');
    }
    
    const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);
    
    const profile = await storage.createProfile({
      email: data.email,
      password: hashedPassword,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      role: data.role as any || 'client',
      isActive: true
    });
    
    await autoSetupUser(profile.id, profile.email, data.firstName, data.lastName);
    
    const token = jwt.sign({ userId: profile.id, email: profile.email }, SECRET_KEY, {
      expiresIn: JWT_EXPIRY
    });
    
    return {
      profile: removePassword(profile),
      token
    };
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const profile = await storage.getProfileByEmail(email);
    if (!profile) {
      throw new Error('Invalid email or password');
    }
    
    const isPasswordValid = await bcrypt.compare(password, profile.password);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }
    
    if (!profile.isActive) {
      throw new Error('Account is inactive');
    }
    
    const token = jwt.sign({ userId: profile.id, email: profile.email }, SECRET_KEY, {
      expiresIn: JWT_EXPIRY
    });
    
    return {
      profile: removePassword(profile),
      token
    };
  },

  verifyToken(token: string): { userId: string; email: string } {
    try {
      const decoded = jwt.verify(token, SECRET_KEY) as { userId: string; email: string };
      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  },

  async getProfile(userId: string): Promise<Omit<Profile, 'password'> | undefined> {
    const profile = await storage.getProfileById(userId);
    if (!profile) return undefined;
    return removePassword(profile);
  }
};
