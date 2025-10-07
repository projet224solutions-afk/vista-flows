/**
 * 💬 SERVICE COMMUNICATION DÉMO - 224SOLUTIONS
 * Service de démonstration pour communication quand Supabase n'est pas configuré
 */

// Données de démonstration pour les utilisateurs
const DEMO_USERS = [
  {
    id: 'user-001',
    email: 'marie.diallo@224solutions.com',
    first_name: 'Marie',
    last_name: 'Diallo',
    avatar_url: null,
    role: 'Vendeur',
    phone: '+221 77 123 45 67',
    created_at: '2024-01-15T10:30:00Z',
    last_seen: '2025-01-02T14:30:00Z'
  },
  {
    id: 'user-002',
    email: 'amadou.ba@client.com',
    first_name: 'Amadou',
    last_name: 'Ba',
    avatar_url: null,
    role: 'Client',
    phone: '+221 76 987 65 43',
    created_at: '2024-02-20T09:15:00Z',
    last_seen: '2025-01-02T13:45:00Z'
  },
  {
    id: 'user-003',
    email: 'fatou.sall@transitaire.com',
    first_name: 'Fatou',
    last_name: 'Sall',
    avatar_url: null,
    role: 'Transitaire',
    phone: '+221 78 456 78 90',
    created_at: '2024-03-10T16:20:00Z',
    last_seen: '2025-01-02T12:15:00Z'
  },
  {
    id: 'user-004',
    email: 'pierre.durand@agent.com',
    first_name: 'Pierre',
    last_name: 'Durand',
    avatar_url: null,
    role: 'Agent',
    phone: '+221 77 234 56 78',
    created_at: '2024-04-05T11:45:00Z',
    last_seen: '2025-01-02T11:30:00Z'
  },
  {
    id: 'user-005',
    email: 'sophie.bernard@vendeur.com',
    first_name: 'Sophie',
    last_name: 'Bernard',
    avatar_url: null,
    role: 'Vendeur',
    phone: '+221 76 345 67 89',
    created_at: '2024-05-12T14:10:00Z',
    last_seen: '2025-01-02T10:45:00Z'
  },
  {
    id: 'user-006',
    email: 'paul.moreau@client.com',
    first_name: 'Paul',
    last_name: 'Moreau',
    avatar_url: null,
    role: 'Client',
    phone: '+221 78 567 89 01',
    created_at: '2024-06-18T08:30:00Z',
    last_seen: '2025-01-01T18:20:00Z'
  }
];

class MockCommunicationService {
  async searchUsers(query: string, limit: number = 10): Promise<any[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const filteredUsers = DEMO_USERS.filter(user =>
      user.first_name.toLowerCase().includes(query.toLowerCase()) ||
      user.last_name.toLowerCase().includes(query.toLowerCase()) ||
      user.email.toLowerCase().includes(query.toLowerCase()) ||
      user.role.toLowerCase().includes(query.toLowerCase())
    );
    
    return filteredUsers.slice(0, limit);
  }

  async getAllUsers(limit: number = 50, offset: number = 0): Promise<any[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return DEMO_USERS.slice(offset, offset + limit);
  }

  async getUsersByRole(role: string, limit: number = 20): Promise<any[]> {
    await new Promise(resolve => setTimeout(resolve, 250));
    
    const filteredUsers = DEMO_USERS.filter(user =>
      user.role.toLowerCase() === role.toLowerCase()
    );
    
    return filteredUsers.slice(0, limit);
  }

  async createConversation(participantIds: string[], isGroup: boolean = false): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 400));
    
    return {
      id: `conv-${Date.now()}`,
      participants: participantIds,
      is_group: isGroup,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  async getUserConversations(userId: string): Promise<any[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Retourner des conversations de démonstration
    return [
      {
        id: 'conv-001',
        participants: ['user-001', 'user-002'],
        is_group: false,
        last_message: 'Bonjour, avez-vous reçu ma commande ?',
        last_message_at: '2025-01-02T14:30:00Z',
        unread_count: 2,
        created_at: '2025-01-01T10:00:00Z'
      },
      {
        id: 'conv-002',
        participants: ['user-001', 'user-003'],
        is_group: false,
        last_message: 'Le colis est en route vers Conakry',
        last_message_at: '2025-01-02T13:15:00Z',
        unread_count: 0,
        created_at: '2025-01-01T15:30:00Z'
      }
    ];
  }

  async sendMessage(conversationId: string, senderId: string, content: string, type: string = 'text'): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      id: `msg-${Date.now()}`,
      conversation_id: conversationId,
      sender_id: senderId,
      content,
      type,
      created_at: new Date().toISOString()
    };
  }

  async getConversationMessages(conversationId: string, limit: number = 50): Promise<any[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Retourner des messages de démonstration
    return [
      {
        id: 'msg-001',
        conversation_id: conversationId,
        sender_id: 'user-002',
        content: 'Bonjour, avez-vous reçu ma commande ?',
        type: 'text',
        created_at: '2025-01-02T14:30:00Z'
      },
      {
        id: 'msg-002',
        conversation_id: conversationId,
        sender_id: 'user-001',
        content: 'Bonjour ! Oui, je viens de la recevoir. Je prépare votre colis.',
        type: 'text',
        created_at: '2025-01-02T14:32:00Z'
      }
    ];
  }

  async updateUserPresence(userId: string, status: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log(`🎭 Statut démo mis à jour: ${userId} -> ${status}`);
  }

  async getUserPresence(userIds: string[]): Promise<any[]> {
    await new Promise(resolve => setTimeout(resolve, 150));
    
    return userIds.map(userId => ({
      user_id: userId,
      status: Math.random() > 0.5 ? 'online' : 'offline',
      last_seen: new Date().toISOString()
    }));
  }
}

export const mockCommunicationService = new MockCommunicationService();
export default mockCommunicationService;
