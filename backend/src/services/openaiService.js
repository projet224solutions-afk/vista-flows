/**
 * 🤖 SERVICE OPENAI - 224SOLUTIONS
 * Service d'intégration avec OpenAI GPT-4o-mini pour l'analyse de projets
 */

const OpenAI = require('openai');
const { RateLimiterMemory } = require('rate-limiter-flexible');
const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');

// Supabase (service role) for logging/metrics
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Configuration par défaut
const CONFIG = {
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '1000', 10),
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
    maxRetries: 3,
    timeout: 30000 // 30s
};

class OpenAIService {
    constructor() {
        this.enabled = !!process.env.OPENAI_API_KEY;
        if (!this.enabled) {
            logger.warn('OPENAI_API_KEY manquante - le service OpenAI sera désactivé.');
            this.client = null;
        } else {
            this.client = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY,
                timeout: CONFIG.timeout,
            });
        }

        this.model = CONFIG.model;
        this.maxTokens = CONFIG.maxTokens;
        this.temperature = CONFIG.temperature;

        // Rate limiter: 50 req / heure par utilisateur
        this.userLimiter = new RateLimiterMemory({ points: 50, duration: 3600 });

        // Stats internes (indicatif)
        this.stats = {
            totalRequests: 0,
            totalTokensUsed: 0,
            totalCost: 0,
            errors: 0,
            averageResponseTime: 0
        };

        logger.info('Service OpenAI initialisé', {
            model: this.model,
            maxTokens: this.maxTokens,
            temperature: this.temperature,
            enabled: this.enabled
        });
    }

    /**
     * 🔍 Analyser un projet avec OpenAI GPT-4o-mini
     * @param {string} projectText - Texte du projet à analyser
     * @param {Object} user - Informations de l'utilisateur
     * @param {Object} options - Options d'analyse
     * @returns {Promise<Object>} Résultat de l'analyse
     */
    async analyzeProject(projectText, user, options = {}) {
        try {
            if (!this.enabled || !this.client) {
                throw new Error('Service OpenAI non configuré');
            }
            // Rate limit par utilisateur
            await this.checkRateLimit(user?.id);
            // Validation des entrées
            this.validatePrompt(projectText);

            // Logging de la requête
            logger.info('Début analyse projet OpenAI', {
                userId: user.id,
                userRole: user.role,
                textLength: projectText.length,
                model: this.model
            });
            this.logRequest(user.id, 'analyze_project', projectText.length).catch(() => {});

            // Construction du prompt système optimisé pour 224Solutions
            const systemPrompt = this.buildSystemPrompt();

            // Construction du prompt utilisateur
            const userPrompt = this.buildUserPrompt(projectText, options);

            // Appel à OpenAI
            const startTime = Date.now();

            const completion = await this.client.chat.completions.create({
                model: this.model,
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
                    },
                    {
                        role: 'user',
                        content: userPrompt
                    }
                ],
                max_tokens: this.maxTokens,
                temperature: this.temperature,
                top_p: 0.9,
                frequency_penalty: 0.1,
                presence_penalty: 0.1
            });

            const duration = Date.now() - startTime;

            // Extraction et formatage de la réponse
            const analysis = this.formatResponse(completion);

            // Stats
            const tokensUsed = completion.usage?.total_tokens || 0;
            this.updateStats(duration, tokensUsed);
            this.logMetric(user.id, 'openai_analyze_project', { duration_ms: duration, tokens: tokensUsed }).catch(() => {});

            // Logging du succès
            logger.info('Analyse projet OpenAI terminée', {
                userId: user.id,
                duration: `${duration}ms`,
                tokensUsed,
                model: completion.model
            });

            // Retour du résultat structuré
            return {
                success: true,
                analysis: analysis,
                metadata: {
                    model: completion.model,
                    tokensUsed: completion.usage?.total_tokens || 0,
                    duration: duration,
                    timestamp: new Date().toISOString(),
                    userId: user.id,
                    requestId: this.generateRequestId()
                }
            };

        } catch (error) {
            // Logging de l'erreur
            logger.error('Erreur analyse projet OpenAI', {
                userId: user?.id,
                error: error.message,
                stack: error.stack
            });
            this.stats.errors++;

            // Gestion des erreurs spécifiques OpenAI
            if (error.code === 'insufficient_quota') {
                throw new Error('Quota OpenAI dépassé. Contactez l\'administrateur.');
            }

            if (error.code === 'rate_limit_exceeded') {
                throw new Error('Limite de taux OpenAI dépassée. Réessayez dans quelques minutes.');
            }

            if (error.code === 'invalid_api_key') {
                throw new Error('Clé API OpenAI invalide. Contactez l\'administrateur.');
            }

            // Erreur générique
            throw new Error(`Erreur lors de l'analyse: ${error.message}`);
        }
    }

    // Vérifie le quota utilisateur
    async checkRateLimit(userId) {
        if (!userId) return;
        try {
            await this.userLimiter.consume(String(userId), 1);
        } catch (e) {
            throw new Error('Limite de requêtes OpenAI dépassée');
        }
    }

    // Valide le prompt
    validatePrompt(projectText) {
        if (!projectText || typeof projectText !== 'string') {
            throw new Error('Le texte du projet est requis et doit être une chaîne de caractères');
        }
        if (projectText.length < 10) {
            throw new Error('Le texte du projet doit contenir au moins 10 caractères');
        }
        if (projectText.length > 50000) {
            throw new Error('Le texte du projet ne peut pas dépasser 50 000 caractères');
        }
    }

    // Log la requête dans Supabase (table ai_logs si disponible)
    async logRequest(userId, action, promptLength) {
        try {
            await supabase.from('ai_logs').insert({
                id: crypto.randomUUID ? crypto.randomUUID() : undefined,
                user_id: userId,
                action,
                prompt_length: promptLength,
                created_at: new Date().toISOString()
            });
        } catch (_) {
            // Ignore si table absente
        }
    }

    // Log métriques
    async logMetric(userId, event, data) {
        try {
            await supabase.from('system_metrics').insert({
                id: crypto.randomUUID ? crypto.randomUUID() : undefined,
                user_id: userId,
                event,
                data,
                created_at: new Date().toISOString()
            });
        } catch (_) {
            // Ignore si table absente
        }
    }

    // Met à jour les stats internes
    updateStats(durationMs, tokensUsed) {
        this.stats.totalRequests += 1;
        this.stats.totalTokensUsed += tokensUsed;
        const n = this.stats.totalRequests;
        this.stats.averageResponseTime = ((this.stats.averageResponseTime * (n - 1)) + durationMs) / n;
    }

    /**
     * 🎯 Construire le prompt système optimisé pour 224Solutions
     * @returns {string} Prompt système
     */
    buildSystemPrompt() {
        return `Tu es un expert consultant en analyse de projets pour 224Solutions, une plateforme technologique innovante en Guinée.

CONTEXTE 224SOLUTIONS:
- Plateforme multi-services (marketplace, taxi-moto, livraison, syndicats)
- Système de wallet intégré et cartes virtuelles
- Gestion des vendeurs, livreurs, taxis, syndicats
- Technologies: React, Node.js, Supabase, OpenAI
- Marché cible: Afrique de l'Ouest, focus Guinée

TON RÔLE:
Analyser les projets soumis par le PDG/Admin avec une expertise technique et business adaptée au contexte africain.

FORMAT DE RÉPONSE REQUIS (JSON):
{
  "resume": "Résumé exécutif en 2-3 phrases",
  "analyse_technique": {
    "faisabilite": "score/10 avec justification",
    "complexite": "Faible/Moyenne/Élevée avec détails",
    "technologies_recommandees": ["tech1", "tech2"],
    "integration_224solutions": "Comment intégrer dans l'écosystème existant"
  },
  "analyse_business": {
    "potentiel_marche": "Évaluation du potentiel en Afrique de l'Ouest",
    "modele_economique": "Recommandations de monétisation",
    "concurrence": "Analyse concurrentielle",
    "risques": ["risque1", "risque2"]
  },
  "recommandations": {
    "priorite": "Haute/Moyenne/Faible",
    "etapes_implementation": ["étape1", "étape2", "étape3"],
    "ressources_necessaires": "Équipe, budget, délais estimés",
    "kpis_succes": ["kpi1", "kpi2"]
  },
  "conclusion": "Recommandation finale GO/NO-GO avec justification"
}

INSTRUCTIONS:
- Sois concis mais précis
- Adapte tes recommandations au contexte africain
- Considère les contraintes techniques et économiques locales
- Propose des solutions pragmatiques et réalisables`;
    }

    /**
     * 👤 Construire le prompt utilisateur
     * @param {string} projectText - Texte du projet
     * @param {Object} options - Options d'analyse
     * @returns {string} Prompt utilisateur
     */
    buildUserPrompt(projectText, options) {
        let prompt = `PROJET À ANALYSER:\n\n${projectText}\n\n`;

        if (options.focusArea) {
            prompt += `FOCUS SPÉCIFIQUE: ${options.focusArea}\n\n`;
        }

        if (options.budget) {
            prompt += `BUDGET ESTIMÉ: ${options.budget}\n\n`;
        }

        if (options.timeline) {
            prompt += `DÉLAI SOUHAITÉ: ${options.timeline}\n\n`;
        }

        prompt += `Analyse ce projet selon le format JSON requis, en tenant compte du contexte 224Solutions et du marché africain.`;

        return prompt;
    }

    /**
     * 📊 Formater la réponse OpenAI
     * @param {Object} completion - Réponse OpenAI
     * @returns {Object} Réponse formatée
     */
    formatResponse(completion) {
        try {
            const content = completion.choices[0]?.message?.content;

            if (!content) {
                throw new Error('Réponse vide de OpenAI');
            }

            // Tentative de parsing JSON
            try {
                return JSON.parse(content);
            } catch (jsonError) {
                // Si le JSON n'est pas valide, retourner le texte brut avec structure de base
                logger.warn('Réponse OpenAI non-JSON, formatage automatique', {
                    content: content.substring(0, 200)
                });

                return {
                    resume: "Analyse générée par IA",
                    analyse_technique: {
                        faisabilite: "À évaluer",
                        complexite: "À déterminer",
                        technologies_recommandees: [],
                        integration_224solutions: content.substring(0, 500)
                    },
                    analyse_business: {
                        potentiel_marche: "À analyser",
                        modele_economique: "À définir",
                        concurrence: "À étudier",
                        risques: []
                    },
                    recommandations: {
                        priorite: "À déterminer",
                        etapes_implementation: [],
                        ressources_necessaires: "À estimer",
                        kpis_succes: []
                    },
                    conclusion: content,
                    note: "Réponse formatée automatiquement - JSON non valide reçu"
                };
            }
        } catch (error) {
            logger.error('Erreur formatage réponse OpenAI', { error: error.message });
            throw new Error('Impossible de formater la réponse OpenAI');
        }
    }

    /**
     * 🆔 Générer un ID unique pour la requête
     * @returns {string} ID unique
     */
    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 📊 Obtenir les statistiques d'utilisation
     * @returns {Object} Statistiques
     */
    getUsageStats() {
        return {
            model: this.model,
            maxTokens: this.maxTokens,
            temperature: this.temperature,
            apiKeyConfigured: !!process.env.OPENAI_API_KEY,
            serviceStatus: 'operational'
        };
    }

    /**
     * 🔍 Tester la connexion OpenAI
     * @returns {Promise<Object>} Résultat du test
     */
    async testConnection() {
        try {
            if (!this.enabled || !this.client) {
                return {
                    success: false,
                    message: 'Service OpenAI désactivé (clé absente)'
                };
            }
            const testCompletion = await this.client.chat.completions.create({
                model: this.model,
                messages: [
                    {
                        role: 'user',
                        content: 'Test de connexion - réponds simplement "OK"'
                    }
                ],
                max_tokens: 10,
                temperature: 0
            });

            return {
                success: true,
                message: 'Connexion OpenAI opérationnelle',
                model: testCompletion.model,
                response: testCompletion.choices[0]?.message?.content
            };
        } catch (error) {
            return {
                success: false,
                message: 'Échec de connexion OpenAI',
                error: error.message
            };
        }
    }
}

// Export singleton
module.exports = new OpenAIService();
