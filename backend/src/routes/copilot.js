/**
 * 🤖 API COPILOTE 224 - CHATGPT INTÉGRAL
 * Backend pour le Copilote IA avec OpenAI GPT-4o-mini
 * Intégration complète avec Supabase et actions métiers
 */

const express = require("express");
const router = express.Router();
const { Configuration, OpenAIApi } = require("openai");
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

// Configuration Supabase
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://uakkxaibujzxdiqzpnpr.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

// Configuration OpenAI
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Middleware d'authentification
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token d\'authentification requis' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Token invalide' });
  }
};

// POST /api/copilot - Chat avec le Copilote
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.user.sub;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message requis' });
    }

    console.log(`🤖 Copilote 224 - Message de ${userId}: ${message}`);

    // 1️⃣ Récupérer le contexte utilisateur depuis Supabase
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        first_name,
        last_name,
        role,
        created_at
      `)
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // 2️⃣ Récupérer les données du wallet
    const { data: wallet } = await supabase
      .from('wallets')
      .select('balance, currency')
      .eq('user_id', userId)
      .single();

    // 3️⃣ Récupérer les transactions récentes
    const { data: transactions } = await supabase
      .from('transactions')
      .select('amount, currency, type, description, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    // 4️⃣ Récupérer l'historique de conversation
    const { data: history } = await supabase
      .from('ai_chats')
      .select('role, message, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(10);

    // 5️⃣ Construire le contexte système
    const systemPrompt = `Tu es Copilote 224, l'assistant intelligent de l'application 224SOLUTIONS.

INFORMATIONS UTILISATEUR:
- Nom: ${user.first_name} ${user.last_name}
- Email: ${user.email}
- Rôle: ${user.role}
- Solde wallet: ${wallet?.balance || 0} ${wallet?.currency || 'GNF'}
- Devise par défaut: ${wallet?.currency || 'GNF'}

CAPACITÉS:
- Tu peux répondre à toutes les questions sur l'application 224SOLUTIONS
- Tu peux simuler des calculs financiers et conversions de devises
- Tu peux expliquer les fonctionnalités du système
- Tu peux aider avec les transactions et le wallet
- Tu peux donner des conseils sur l'utilisation de l'application

STYLE DE RÉPONSE:
- Réponds en français naturel, style ChatGPT
- Sois professionnel, clair, complet et engageant
- Utilise des emojis appropriés
- Structure tes réponses avec des listes et des explications détaillées
- Si tu ne peux pas exécuter une action, explique poliment pourquoi

ACTIONS MÉTIERS DISPONIBLES:
- /wallet balance → Affiche le solde du wallet
- /transaction history → Liste les transactions récentes
- /finance simulation → Simule des conversions de devises
- /rate show → Affiche les taux de change actuels
- /help → Affiche l'aide et les commandes disponibles

TRANSACTIONS RÉCENTES:
${transactions?.map(t => `- ${t.type}: ${t.amount} ${t.currency} (${t.description})`).join('\n') || 'Aucune transaction récente'}

Réponds de manière naturelle et utile à l'utilisateur.`;

    // 6️⃣ Construire les messages pour OpenAI
    const messages = [
      { role: 'system', content: systemPrompt },
      // Historique de conversation
      ...history.map(h => ({
        role: h.role === 'user' ? 'user' : 'assistant',
        content: h.message
      })),
      { role: 'user', content: message }
    ];

    // 7️⃣ Appel OpenAI GPT-4o-mini
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages,
      temperature: 0.7,
      max_tokens: 1000,
    });

    const reply = completion.choices[0].message.content;

    // 8️⃣ Sauvegarder la conversation
    await supabase.from('ai_chats').insert([
      { user_id: userId, role: 'user', message: message.trim() },
      { user_id: userId, role: 'assistant', message: reply }
    ]);

    // 9️⃣ Logger l'interaction
    await supabase.from('ai_logs').insert({
      user_id: userId,
      user_role: user.role,
      message: message.trim(),
      response: reply,
      timestamp: new Date().toISOString()
    });

    console.log(`✅ Copilote 224 - Réponse générée pour ${userId}`);

    res.json({ 
      reply,
      timestamp: new Date().toISOString(),
      user_context: {
        name: `${user.first_name} ${user.last_name}`,
        role: user.role,
        balance: wallet?.balance || 0,
        currency: wallet?.currency || 'GNF'
      }
    });

  } catch (error) {
    console.error('❌ Erreur Copilote 224:', error);
    
    // Fallback en cas d'erreur
    const fallbackReply = `Désolé, je rencontre une difficulté technique. Veuillez réessayer dans quelques instants. Si le problème persiste, contactez le support technique.`;
    
    res.status(500).json({ 
      error: 'Erreur serveur copilote',
      reply: fallbackReply
    });
  }
});

// GET /api/copilot/history - Récupérer l'historique
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    const { limit = 20 } = req.query;

    const { data: history, error } = await supabase
      .from('ai_chats')
      .select('role, message, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (error) {
      return res.status(500).json({ error: 'Erreur lors de la récupération de l\'historique' });
    }

    res.json({ history: history.reverse() });
  } catch (error) {
    console.error('❌ Erreur historique:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/copilot/clear - Effacer l'historique
router.post('/clear', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.sub;

    const { error } = await supabase
      .from('ai_chats')
      .delete()
      .eq('user_id', userId);

    if (error) {
      return res.status(500).json({ error: 'Erreur lors de l\'effacement de l\'historique' });
    }

    res.json({ message: 'Historique effacé avec succès' });
  } catch (error) {
    console.error('❌ Erreur effacement:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/copilot/status - Statut du service
router.get('/status', (req, res) => {
  res.json({ 
    status: 'active',
    service: 'Copilote 224 - ChatGPT Intégral',
    version: '1.0.0',
    features: [
      'ChatGPT style conversation',
      'Intégration Supabase',
      'Actions métiers',
      'Historique conversationnel',
      'Sécurité par rôle'
    ]
  });
});

module.exports = router;
