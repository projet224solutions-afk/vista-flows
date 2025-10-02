/**
 * ROUTES API POUR GESTION BUREAU SYNDICAT
 * Gestion complète des membres et taxi-motards
 * 224Solutions - Syndicate Management API
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const QRCode = require('qrcode');
const { supabase } = require('../config/supabase');
const authMiddleware = require('../middleware/auth');
const permissionMiddleware = require('../middleware/permissions');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * Génère un token sécurisé
 */
function generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
}

/**
 * Génère un numéro de badge unique
 */
async function generateBadgeNumber(type = 'TM') {
    const year = new Date().getFullYear();
    let attempts = 0;
    
    while (attempts < 100) {
        const random = Math.floor(Math.random() * 9000) + 1000;
        const badgeNumber = `${type}-${year}-${random}`;
        
        // Vérifier l'unicité
        const { data: existing } = await supabase
            .from('taxi_motards')
            .select('badge_number')
            .eq('badge_number', badgeNumber)
            .single();
            
        if (!existing) {
            return badgeNumber;
        }
        
        attempts++;
    }
    
    throw new Error('Unable to generate unique badge number');
}

/**
 * Crée un QR Code pour un badge
 */
async function generateBadgeQRCode(badgeCode) {
    const url = `${process.env.APP_BASE_URL || 'https://224solutions.com'}/badge/verify?code=${badgeCode}`;
    try {
        const qrDataURL = await QRCode.toDataURL(url, {
            width: 300,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });
        return { url, qrDataURL };
    } catch (error) {
        logger.error('Erreur génération QR Code:', error);
        return { url, qrDataURL: null };
    }
}

/**
 * POST /api/syndicate/taxi-motard
 * Ajouter un nouveau taxi-motard
 */
router.post('/taxi-motard', authMiddleware, permissionMiddleware(['admin', 'president']), async (req, res) => {
    try {
        const {
            first_name,
            last_name,
            phone,
            email,
            gilet_number,
            plate_number,
            moto_serial_number,
            syndicate_id
        } = req.body;

        // Validation des champs obligatoires
        if (!first_name || !last_name || !phone || !plate_number || !moto_serial_number) {
            return res.status(400).json({
                error: 'missing_required_fields',
                message: 'Nom, prénom, téléphone, plaque et série moto sont obligatoires'
            });
        }

        // Vérifier que le syndicat existe
        if (syndicate_id) {
            const { data: syndicate } = await supabase
                .from('syndicate_bureaus')
                .select('id')
                .eq('id', syndicate_id)
                .single();
                
            if (!syndicate) {
                return res.status(404).json({
                    error: 'syndicate_not_found',
                    message: 'Bureau syndicat non trouvé'
                });
            }
        }

        // Vérifier l'unicité de la plaque et série moto
        const { data: existingVehicle } = await supabase
            .from('taxi_motards')
            .select('id')
            .or(`plate_number.eq.${plate_number},moto_serial_number.eq.${moto_serial_number}`)
            .single();
            
        if (existingVehicle) {
            return res.status(409).json({
                error: 'vehicle_already_exists',
                message: 'Plaque ou série moto déjà enregistrée'
            });
        }

        // Créer l'utilisateur
        const userId = uuidv4();
        const { data: user, error: userError } = await supabase
            .from('users')
            .insert({
                id: userId,
                email: email || null,
                phone,
                first_name,
                last_name,
                role: 'taxi_motard',
                is_worker: true,
                metadata: {
                    added_by: req.user.id,
                    syndicate_id: syndicate_id || null
                }
            })
            .select()
            .single();

        if (userError) {
            logger.error('Erreur création utilisateur:', userError);
            return res.status(500).json({
                error: 'user_creation_failed',
                message: 'Erreur lors de la création de l\'utilisateur'
            });
        }

        // Le wallet sera créé automatiquement par le trigger
        // Attendre un peu pour s'assurer que le trigger s'est exécuté
        await new Promise(resolve => setTimeout(resolve, 100));

        // Récupérer le wallet créé
        const { data: wallet } = await supabase
            .from('wallets')
            .select('id, balance')
            .eq('user_id', userId)
            .single();

        // Générer le badge
        const badgeNumber = await generateBadgeNumber('TM');
        const badgeCode = generateSecureToken(16);
        const { url: badgeUrl, qrDataURL } = await generateBadgeQRCode(badgeCode);

        // Créer l'entrée taxi-motard
        const { data: taxiMotard, error: taxiError } = await supabase
            .from('taxi_motards')
            .insert({
                user_id: userId,
                syndicate_id: syndicate_id || null,
                gilet_number: gilet_number || null,
                plate_number,
                moto_serial_number,
                badge_number: badgeNumber,
                badge_code: badgeCode,
                badge_qr_code: qrDataURL,
                added_by: req.user.id
            })
            .select()
            .single();

        if (taxiError) {
            logger.error('Erreur création taxi-motard:', taxiError);
            // Supprimer l'utilisateur créé en cas d'erreur
            await supabase.from('users').delete().eq('id', userId);
            return res.status(500).json({
                error: 'taxi_motard_creation_failed',
                message: 'Erreur lors de la création du taxi-motard'
            });
        }

        // Créer le badge numérique
        const { data: digitalBadge } = await supabase
            .from('digital_badges')
            .insert({
                user_id: userId,
                badge_number: badgeNumber,
                badge_code: badgeCode,
                qr_code_data: badgeUrl,
                qr_code_url: qrDataURL,
                badge_type: 'taxi_motard'
            })
            .select()
            .single();

        // Créer un lien de validation
        const validationToken = generateSecureToken(32);
        const validationUrl = `${process.env.APP_BASE_URL || 'https://224solutions.com'}/validate/taxi-motard?token=${validationToken}`;
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 jours

        const { data: validationLink } = await supabase
            .from('validation_links')
            .insert({
                target_type: 'taxi_motard',
                target_id: userId,
                token: validationToken,
                link_url: validationUrl,
                created_by: req.user.id,
                expires_at: expiresAt.toISOString(),
                is_permanent: false
            })
            .select()
            .single();

        // Mettre à jour l'utilisateur avec les infos du badge
        await supabase
            .from('users')
            .update({
                badge_number: badgeNumber,
                badge_code: badgeCode
            })
            .eq('id', userId);

        logger.info('Taxi-motard créé avec succès:', {
            userId,
            badgeNumber,
            plateNumber: plate_number
        });

        res.status(201).json({
            success: true,
            data: {
                user: {
                    id: userId,
                    first_name,
                    last_name,
                    phone,
                    email,
                    role: 'taxi_motard'
                },
                wallet: {
                    id: wallet?.id,
                    balance: wallet?.balance || 1000,
                    currency: 'FCFA'
                },
                taxi_motard: taxiMotard,
                badge: {
                    id: digitalBadge?.id,
                    number: badgeNumber,
                    code: badgeCode,
                    qr_code_url: qrDataURL,
                    verification_url: badgeUrl
                },
                validation_link: {
                    url: validationUrl,
                    token: validationToken,
                    expires_at: expiresAt.toISOString()
                }
            },
            message: 'Taxi-motard créé avec succès'
        });

    } catch (error) {
        logger.error('Erreur création taxi-motard:', error);
        res.status(500).json({
            error: 'internal_server_error',
            message: 'Erreur interne du serveur'
        });
    }
});

/**
 * GET /api/syndicate/:syndicateId/taxi-motards
 * Récupérer tous les taxi-motards d'un syndicat
 */
router.get('/:syndicateId/taxi-motards', authMiddleware, async (req, res) => {
    try {
        const { syndicateId } = req.params;
        const { page = 1, limit = 20, search, status } = req.query;

        let query = supabase
            .from('taxi_motards')
            .select(`
                *,
                user:users(id, first_name, last_name, phone, email),
                digital_badge:digital_badges(*)
            `)
            .eq('syndicate_id', syndicateId);

        // Filtrer par statut si spécifié
        if (status) {
            query = query.eq('is_active', status === 'active');
        }

        // Recherche
        if (search) {
            query = query.or(`
                plate_number.ilike.%${search}%,
                moto_serial_number.ilike.%${search}%,
                badge_number.ilike.%${search}%
            `);
        }

        // Pagination
        const offset = (page - 1) * limit;
        query = query.range(offset, offset + limit - 1);

        const { data: taxiMotards, error } = await query;

        if (error) {
            logger.error('Erreur récupération taxi-motards:', error);
            return res.status(500).json({
                error: 'fetch_failed',
                message: 'Erreur lors de la récupération des taxi-motards'
            });
        }

        res.json({
            success: true,
            data: taxiMotards,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: taxiMotards.length
            }
        });

    } catch (error) {
        logger.error('Erreur récupération taxi-motards:', error);
        res.status(500).json({
            error: 'internal_server_error',
            message: 'Erreur interne du serveur'
        });
    }
});

/**
 * POST /api/syndicate/:syndicateId/member
 * Ajouter un membre au bureau syndicat
 */
router.post('/:syndicateId/member', authMiddleware, permissionMiddleware(['admin', 'president']), async (req, res) => {
    try {
        const { syndicateId } = req.params;
        const {
            first_name,
            last_name,
            phone,
            email,
            role = 'member'
        } = req.body;

        // Validation
        if (!first_name || !last_name || !phone) {
            return res.status(400).json({
                error: 'missing_required_fields',
                message: 'Nom, prénom et téléphone sont obligatoires'
            });
        }

        if (!['president', 'secretary', 'member'].includes(role)) {
            return res.status(400).json({
                error: 'invalid_role',
                message: 'Rôle invalide'
            });
        }

        // Vérifier que le syndicat existe
        const { data: syndicate } = await supabase
            .from('syndicate_bureaus')
            .select('id')
            .eq('id', syndicateId)
            .single();
            
        if (!syndicate) {
            return res.status(404).json({
                error: 'syndicate_not_found',
                message: 'Bureau syndicat non trouvé'
            });
        }

        // Créer l'utilisateur
        const userId = uuidv4();
        const { data: user, error: userError } = await supabase
            .from('users')
            .insert({
                id: userId,
                email: email || null,
                phone,
                first_name,
                last_name,
                role: 'member',
                is_worker: true,
                metadata: {
                    added_by: req.user.id,
                    syndicate_id: syndicateId
                }
            })
            .select()
            .single();

        if (userError) {
            logger.error('Erreur création utilisateur membre:', userError);
            return res.status(500).json({
                error: 'user_creation_failed',
                message: 'Erreur lors de la création de l\'utilisateur'
            });
        }

        // Attendre la création du wallet
        await new Promise(resolve => setTimeout(resolve, 100));

        // Récupérer le wallet
        const { data: wallet } = await supabase
            .from('wallets')
            .select('id, balance')
            .eq('user_id', userId)
            .single();

        // Ajouter le membre au syndicat
        const { data: syndicateMember, error: memberError } = await supabase
            .from('syndicate_members')
            .insert({
                syndicate_id: syndicateId,
                user_id: userId,
                role,
                added_by: req.user.id,
                permissions: {
                    can_add_members: role === 'president',
                    can_manage_finances: ['president', 'secretary'].includes(role),
                    can_view_reports: true
                }
            })
            .select()
            .single();

        if (memberError) {
            logger.error('Erreur ajout membre syndicat:', memberError);
            await supabase.from('users').delete().eq('id', userId);
            return res.status(500).json({
                error: 'member_creation_failed',
                message: 'Erreur lors de l\'ajout du membre'
            });
        }

        // Créer un badge pour le membre
        const badgeNumber = await generateBadgeNumber('SM');
        const badgeCode = generateSecureToken(16);
        const { url: badgeUrl, qrDataURL } = await generateBadgeQRCode(badgeCode);

        const { data: digitalBadge } = await supabase
            .from('digital_badges')
            .insert({
                user_id: userId,
                badge_number: badgeNumber,
                badge_code: badgeCode,
                qr_code_data: badgeUrl,
                qr_code_url: qrDataURL,
                badge_type: 'syndicate_member'
            })
            .select()
            .single();

        // Créer un lien de validation
        const validationToken = generateSecureToken(32);
        const validationUrl = `${process.env.APP_BASE_URL || 'https://224solutions.com'}/validate/syndicate-member?token=${validationToken}`;
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        await supabase
            .from('validation_links')
            .insert({
                target_type: 'syndicate_member',
                target_id: userId,
                token: validationToken,
                link_url: validationUrl,
                created_by: req.user.id,
                expires_at: expiresAt.toISOString(),
                is_permanent: false
            });

        logger.info('Membre syndicat créé avec succès:', {
            userId,
            syndicateId,
            role
        });

        res.status(201).json({
            success: true,
            data: {
                user: {
                    id: userId,
                    first_name,
                    last_name,
                    phone,
                    email,
                    role: 'member'
                },
                wallet: {
                    id: wallet?.id,
                    balance: wallet?.balance || 1000,
                    currency: 'FCFA'
                },
                syndicate_member: syndicateMember,
                badge: {
                    id: digitalBadge?.id,
                    number: badgeNumber,
                    code: badgeCode,
                    qr_code_url: qrDataURL,
                    verification_url: badgeUrl
                },
                validation_link: {
                    url: validationUrl,
                    token: validationToken,
                    expires_at: expiresAt.toISOString()
                }
            },
            message: 'Membre ajouté avec succès au bureau syndicat'
        });

    } catch (error) {
        logger.error('Erreur création membre syndicat:', error);
        res.status(500).json({
            error: 'internal_server_error',
            message: 'Erreur interne du serveur'
        });
    }
});

/**
 * GET /api/syndicate/:syndicateId/wallet
 * Récupérer les informations du wallet du bureau
 */
router.get('/:syndicateId/wallet', authMiddleware, async (req, res) => {
    try {
        const { syndicateId } = req.params;

        // Récupérer les informations du bureau
        const { data: syndicate } = await supabase
            .from('syndicate_bureaus')
            .select('id, balance, wallet_id')
            .eq('id', syndicateId)
            .single();

        if (!syndicate) {
            return res.status(404).json({
                error: 'syndicate_not_found',
                message: 'Bureau syndicat non trouvé'
            });
        }

        // Récupérer les transactions récentes du bureau
        const { data: transactions } = await supabase
            .from('wallet_transactions')
            .select(`
                id, type, amount, description, created_at, status,
                from_wallet:from_wallet_id(user:user_id(first_name, last_name)),
                to_wallet:to_wallet_id(user:user_id(first_name, last_name))
            `)
            .or(`wallet_id.eq.${syndicate.wallet_id},from_wallet_id.eq.${syndicate.wallet_id},to_wallet_id.eq.${syndicate.wallet_id}`)
            .order('created_at', { ascending: false })
            .limit(20);

        res.json({
            success: true,
            data: {
                syndicate_id: syndicateId,
                balance: syndicate.balance || 0,
                currency: 'FCFA',
                wallet_id: syndicate.wallet_id,
                recent_transactions: transactions || []
            }
        });

    } catch (error) {
        logger.error('Erreur récupération wallet bureau:', error);
        res.status(500).json({
            error: 'internal_server_error',
            message: 'Erreur interne du serveur'
        });
    }
});

/**
 * GET /api/syndicate/validation-links
 * Récupérer tous les liens de validation (pour PDG)
 */
router.get('/validation-links', authMiddleware, permissionMiddleware(['admin', 'president']), async (req, res) => {
    try {
        const { page = 1, limit = 20, target_type, status } = req.query;

        let query = supabase
            .from('validation_links')
            .select(`
                *,
                target_user:target_id(first_name, last_name, phone, email, role)
            `)
            .order('created_at', { ascending: false });

        // Filtrer par type si spécifié
        if (target_type) {
            query = query.eq('target_type', target_type);
        }

        // Filtrer par statut si spécifié
        if (status === 'used') {
            query = query.eq('is_used', true);
        } else if (status === 'unused') {
            query = query.eq('is_used', false);
        }

        // Pagination
        const offset = (page - 1) * limit;
        query = query.range(offset, offset + limit - 1);

        const { data: validationLinks, error } = await query;

        if (error) {
            logger.error('Erreur récupération liens validation:', error);
            return res.status(500).json({
                error: 'fetch_failed',
                message: 'Erreur lors de la récupération des liens'
            });
        }

        res.json({
            success: true,
            data: validationLinks,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: validationLinks.length
            }
        });

    } catch (error) {
        logger.error('Erreur récupération liens validation:', error);
        res.status(500).json({
            error: 'internal_server_error',
            message: 'Erreur interne du serveur'
        });
    }
});

module.exports = router;
