/**
 * 🤖 MODULE COPILOTE PDG - API BACKEND
 * Architecture complète avec OpenAI, Supabase et Cursor
 * Mode additif uniquement - aucune suppression
 */

const express = require('express');
const router = express.Router();
const { Configuration, OpenAIApi } = require('openai');
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

// Middleware d'authentification renforcé
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

// Middleware de vérification des permissions PDG
const requirePDG = (req, res, next) => {
  if (req.user.role !== 'PDG' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accès réservé au PDG et administrateurs' });
  }
  next();
};

/**
 * POST /api/copilot - Chat avec le Copilote PDG
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { message, context } = req.body;
    const userId = req.user.sub;
    const userRole = req.user.role;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message requis' });
    }

    console.log(`🤖 Copilote PDG - Message de ${userId} (${userRole}): ${message}`);

    // 1️⃣ Récupérer le profil complet utilisateur
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        first_name,
        last_name,
        role,
        created_at,
        kyc_verified,
        is_active
      `)
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // 2️⃣ Récupérer les données financières
    const { data: wallet } = await supabase
      .from('wallets')
      .select('balance, currency, is_active')
      .eq('user_id', userId)
      .single();

    // 3️⃣ Récupérer les transactions récentes
    const { data: transactions } = await supabase
      .from('transactions')
      .select('amount, currency, type, description, created_at, status')
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

    // 5️⃣ Récupérer les rapports d'audit récents
    const { data: auditReports } = await supabase
      .from('audit_reports')
      .select('summary, status, created_at')
      .order('created_at', { ascending: false })
      .limit(3);

    // 6️⃣ Construire le prompt système riche
    const systemPrompt = `Tu es le Copilote PDG de l'application 224SOLUTIONS, un assistant IA intelligent et expert.

INFORMATIONS UTILISATEUR:
- Nom: ${user.first_name} ${user.last_name}
- Email: ${user.email}
- Rôle: ${user.role}
- KYC Vérifié: ${user.kyc_verified ? 'Oui' : 'Non'}
- Statut: ${user.is_active ? 'Actif' : 'Inactif'}
- Solde wallet: ${wallet?.balance || 0} ${wallet?.currency || 'GNF'}
- Devise par défaut: ${wallet?.currency || 'GNF'}

CAPACITÉS AVANCÉES:
- Gestion financière complète (wallet, transactions, taux de change)
- Audit système et analyse de code
- Communication avec Cursor pour corrections automatiques
- Rapports d'audit et recommandations
- Simulation de conversions et calculs financiers
- Gestion des utilisateurs et permissions

CONTEXTE SYSTÈME:
- Transactions récentes: ${transactions?.length || 0} transactions
- Rapports d'audit: ${auditReports?.length || 0} rapports récents
- Mode: ${userRole === 'PDG' ? 'Administrateur complet' : 'Utilisateur standard'}

ACTIONS MÉTIERS DISPONIBLES:
- /audit run → Lancer un audit système complet
- /audit report → Consulter les rapports d'audit
- /cursor analyze → Analyser du code avec Cursor
- /cursor patch → Appliquer des correctifs automatiques
- /finance simulation → Simuler des conversions
- /rate show → Afficher les taux de change
- /rate edit → Modifier les taux (PDG uniquement)
- /users manage → Gestion des utilisateurs
- /system status → Statut du système

STYLE DE RÉPONSE:
- Réponds en français naturel, style ChatGPT professionnel
- Sois précis, technique mais accessible
- Utilise des emojis appropriés pour la clarté
- Structure tes réponses avec des listes et explications détaillées
- Si une action nécessite des permissions spéciales, l'expliquer clairement

AUDIT ET CURSOR:
- Tu peux lancer des audits système complets
- Tu peux communiquer avec Cursor pour analyser et corriger du code
- Tu peux appliquer des correctifs automatiques (avec autorisation)
- Tu peux créer des PRs automatiques sur GitHub
- Tu peux générer des rapports détaillés

RÉPONSES RÉCENTES:
${transactions?.map(t => `- ${t.type}: ${t.amount} ${t.currency} (${t.description}) - ${t.status}`).join('\n') || 'Aucune transaction récente'}

RAPPORTS D'AUDIT RÉCENTS:
${auditReports?.map(r => `- ${r.summary} (${r.status})`).join('\n') || 'Aucun rapport d\'audit récent'}

Réponds de manière naturelle, utile et professionnelle à l'utilisateur.`;

    // 7️⃣ Construire les messages pour OpenAI
    const messages = [
      { role: 'system', content: systemPrompt },
      // Historique de conversation
      ...history.map(h => ({
        role: h.role === 'user' ? 'user' : 'assistant',
        content: h.message
      })),
      { role: 'user', content: message }
    ];

    // 8️⃣ Appel OpenAI GPT-4o-mini
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages,
      temperature: 0.7,
      max_tokens: 1500,
    });

    const reply = completion.choices[0].message.content;

    // 9️⃣ Sauvegarder la conversation
    await supabase.from('ai_chats').insert([
      { user_id: userId, role: 'user', message: message.trim() },
      { user_id: userId, role: 'assistant', message: reply }
    ]);

    // 🔟 Logger l'interaction
    await supabase.from('ai_logs').insert({
      user_id: userId,
      action: 'copilot_chat',
      payload_json: { message, context },
      result: { reply_length: reply.length, model: 'gpt-4o-mini' },
      timestamp: new Date().toISOString()
    });

    console.log(`✅ Copilote PDG - Réponse générée pour ${userId}`);

    res.json({ 
      reply,
      timestamp: new Date().toISOString(),
      user_context: {
        name: `${user.first_name} ${user.last_name}`,
        role: user.role,
        balance: wallet?.balance || 0,
        currency: wallet?.currency || 'GNF',
        kyc_verified: user.kyc_verified,
        is_active: user.is_active
      },
      capabilities: {
        audit: userRole === 'PDG' || userRole === 'admin',
        cursor: userRole === 'PDG' || userRole === 'admin',
        finance: true,
        users: userRole === 'PDG' || userRole === 'admin'
      }
    });

  } catch (error) {
    console.error('❌ Erreur Copilote PDG:', error);
    
    const fallbackReply = `Désolé, je rencontre une difficulté technique. Veuillez réessayer dans quelques instants. Si le problème persiste, contactez le support technique.`;
    
    res.status(500).json({ 
      error: 'Erreur serveur copilote',
      reply: fallbackReply
    });
  }
});

/**
 * POST /api/copilot/action - Exécuter une action métier
 */
router.post('/action', authenticateToken, async (req, res) => {
  try {
    const { action, params } = req.body;
    const userId = req.user.sub;
    const userRole = req.user.role;

    console.log(`🎯 Action métier ${action} pour ${userId} (${userRole})`);

    let result;

    switch (action) {
      case 'audit_run':
        if (userRole !== 'PDG' && userRole !== 'admin') {
          return res.status(403).json({ error: 'Action réservée au PDG' });
        }
        // Importer et exécuter l'audit
        const { runAudit } = require('../audit/runAudit');
        result = await runAudit();
        break;

      case 'audit_report':
        const { data: reports } = await supabase
          .from('audit_reports')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);
        result = { reports };
        break;

      case 'cursor_analyze':
        if (userRole !== 'PDG' && userRole !== 'admin') {
          return res.status(403).json({ error: 'Action réservée au PDG' });
        }
        const { sendToCursor } = require('../cursor/connector');
        result = await sendToCursor('analyze', params);
        break;

      case 'cursor_patch':
        if (userRole !== 'PDG' && userRole !== 'admin') {
          return res.status(403).json({ error: 'Action réservée au PDG' });
        }
        const { applyPatch } = require('../cursor/connector');
        result = await applyPatch(params);
        break;

      case 'finance_simulation':
        const { simulateConversion } = require('../finance/simulator');
        result = await simulateConversion(params);
        break;

      case 'rate_show':
        const { data: rates } = await supabase
          .from('exchange_rates')
          .select('*')
          .order('created_at', { ascending: false });
        result = { rates };
        break;

      case 'rate_edit':
        if (userRole !== 'PDG' && userRole !== 'admin') {
          return res.status(403).json({ error: 'Action réservée au PDG' });
        }
        const { updateRate } = require('../finance/rateManager');
        result = await updateRate(params);
        break;

      default:
        return res.status(400).json({ error: 'Action non supportée' });
    }

    // Logger l'action
    await supabase.from('ai_logs').insert({
      user_id: userId,
      action: `copilot_action_${action}`,
      payload_json: params,
      result: result,
      timestamp: new Date().toISOString()
    });

    res.json({ 
      success: true,
      action,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Erreur action métier:', error);
    
    res.status(500).json({ 
      error: 'Erreur lors de l\'exécution de l\'action métier',
      details: error.message
    });
  }
});

/**
 * GET /api/copilot/status - Statut du service
 */
router.get('/status', authenticateToken, (req, res) => {
  res.json({ 
    status: 'active',
    service: 'Copilote PDG 224Solutions',
    version: '2.0.0',
    features: [
      'ChatGPT style conversation',
      'Intégration Supabase complète',
      'Actions métiers avancées',
      'Audit système automatique',
      'Communication Cursor',
      'Push automatique GitHub',
      'Sécurité par rôle renforcée'
    ],
    capabilities: {
      audit: req.user.role === 'PDG' || req.user.role === 'admin',
      cursor: req.user.role === 'PDG' || req.user.role === 'admin',
      finance: true,
      users: req.user.role === 'PDG' || req.user.role === 'admin'
    }
  });
});

module.exports = router;
