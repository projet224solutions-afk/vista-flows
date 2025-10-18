/**
 * 🏢 ROUTES SYNDICAT - 224SOLUTIONS
 * Backend pour la gestion des bureaux syndicaux
 */

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

const router = express.Router();

// Configuration Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Configuration email
const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Créer un nouveau bureau syndical
 * POST /api/syndicat/create-bureau
 */
router.post('/create-bureau', async (req, res) => {
  try {
    const { nom, email_president, ville, telephone } = req.body;

    // Validation des données
    if (!nom || !email_president || !ville) {
      return res.status(400).json({ 
        error: 'Nom, email du président et ville sont requis' 
      });
    }

    // Générer un token unique
    const token = crypto.randomUUID();
    const interfaceUrl = `${process.env.FRONTEND_URL}/bureau/${token}`;

    // Créer le bureau dans la base de données
    const { data, error } = await supabase
      .from('bureaux_syndicaux')
      .insert({
        nom,
        email_president,
        ville,
        telephone,
        interface_url: interfaceUrl,
        token,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Erreur création bureau:', error);
      return res.status(500).json({ error: 'Erreur lors de la création du bureau' });
    }

    // Envoyer l'email avec le lien permanent
    try {
      await transporter.sendMail({
        from: `"224Solutions" <${process.env.SMTP_USER}>`,
        to: email_president,
        subject: 'Votre bureau syndical est prêt - 224Solutions',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">🏢 Votre Bureau Syndical est Prêt !</h2>
            <p>Bonjour,</p>
            <p>Votre bureau syndical <strong>${nom}</strong> a été créé avec succès.</p>
            <p>Vous pouvez maintenant accéder à votre interface de gestion :</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${interfaceUrl}" 
                 style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                📱 Télécharger l'Interface
              </a>
            </div>
            <p><strong>Lien permanent :</strong> ${interfaceUrl}</p>
            <p>Ce lien vous permettra de :</p>
            <ul>
              <li>✅ Ajouter et gérer vos travailleurs</li>
              <li>✅ Enregistrer les numéros de série des motos</li>
              <li>✅ Recevoir des notifications et alertes</li>
              <li>✅ Contacter l'équipe technique</li>
            </ul>
            <p>L'interface s'adapte automatiquement à votre appareil (mobile, tablette, ordinateur).</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">
              Cet email a été envoyé automatiquement par le système 224Solutions.<br>
              Si vous n'avez pas demandé cette création, veuillez contacter le support.
            </p>
          </div>
        `
      });
    } catch (emailError) {
      console.error('Erreur envoi email:', emailError);
      // Ne pas faire échouer la création du bureau si l'email échoue
    }

    // Log de l'action
    await supabase.from('audit_logs').insert({
      actor_id: req.user?.id,
      action: 'BUREAU_CREATED',
      target_type: 'bureau',
      target_id: data.id,
      details: { 
        bureau_nom: nom, 
        email: email_president,
        ville: ville,
        interface_url: interfaceUrl
      }
    });

    res.json({ 
      success: true, 
      bureau: data,
      interface_url: interfaceUrl,
      message: 'Bureau créé et email envoyé avec succès'
    });

  } catch (error) {
    console.error('Erreur serveur:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

/**
 * Créer un nouveau travailleur
 * POST /api/syndicat/create-travailleur
 */
router.post('/create-travailleur', async (req, res) => {
  try {
    const { bureau_id, nom, email, telephone, access_level } = req.body;

    // Validation des données
    if (!bureau_id || !nom || !email) {
      return res.status(400).json({ 
        error: 'ID du bureau, nom et email sont requis' 
      });
    }

    // Vérifier que le bureau existe
    const { data: bureau, error: bureauError } = await supabase
      .from('bureaux_syndicaux')
      .select('*')
      .eq('id', bureau_id)
      .single();

    if (bureauError || !bureau) {
      return res.status(404).json({ error: 'Bureau non trouvé' });
    }

    // Générer un token unique
    const token = crypto.randomUUID();
    const interfaceUrl = `${process.env.FRONTEND_URL}/travailleur/${token}`;

    // Créer le travailleur dans la base de données
    const { data, error } = await supabase
      .from('travailleurs')
      .insert({
        bureau_id,
        nom,
        email,
        telephone,
        interface_url: interfaceUrl,
        token,
        access_level: access_level || 'limité',
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Erreur création travailleur:', error);
      return res.status(500).json({ error: 'Erreur lors de la création du travailleur' });
    }

    // Envoyer l'email avec le lien permanent
    try {
      await transporter.sendMail({
        from: `"224Solutions" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Votre accès au bureau syndical - 224Solutions',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">👷 Votre Accès Travailleur est Prêt !</h2>
            <p>Bonjour ${nom},</p>
            <p>Vous avez été ajouté comme travailleur au bureau syndical <strong>${bureau.nom}</strong>.</p>
            <p>Vous pouvez maintenant accéder à votre interface de travailleur :</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${interfaceUrl}" 
                 style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                📱 Télécharger l'Interface
              </a>
            </div>
            <p><strong>Lien permanent :</strong> ${interfaceUrl}</p>
            <p><strong>Niveau d'accès :</strong> ${access_level || 'limité'}</p>
            <p>Avec votre interface, vous pourrez :</p>
            <ul>
              <li>✅ Enregistrer vos motos</li>
              <li>✅ Recevoir des notifications</li>
              <li>✅ Contacter l'équipe technique</li>
              <li>✅ Voir vos alertes</li>
            </ul>
            <p>L'interface s'adapte automatiquement à votre appareil (mobile, tablette, ordinateur).</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">
              Cet email a été envoyé automatiquement par le système 224Solutions.<br>
              Si vous n'avez pas demandé cet accès, veuillez contacter le support.
            </p>
          </div>
        `
      });
    } catch (emailError) {
      console.error('Erreur envoi email:', emailError);
      // Ne pas faire échouer la création du travailleur si l'email échoue
    }

    // Log de l'action
    await supabase.from('audit_logs').insert({
      actor_id: req.user?.id,
      action: 'TRAVAILLEUR_CREATED',
      target_type: 'travailleur',
      target_id: data.id,
      details: { 
        travailleur_nom: nom, 
        email: email,
        bureau_nom: bureau.nom,
        access_level: access_level || 'limité',
        interface_url: interfaceUrl
      }
    });

    res.json({ 
      success: true, 
      travailleur: data,
      interface_url: interfaceUrl,
      message: 'Travailleur créé et email envoyé avec succès'
    });

  } catch (error) {
    console.error('Erreur serveur:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

/**
 * Renvoyer un lien permanent
 * POST /api/syndicat/resend-link
 */
router.post('/resend-link', async (req, res) => {
  try {
    const { email, type } = req.body; // type: 'bureau' ou 'travailleur'

    if (!email || !type) {
      return res.status(400).json({ 
        error: 'Email et type sont requis' 
      });
    }

    let data, error;
    const emailField = type === 'bureau' ? 'email_president' : 'email';
    const table = type === 'bureau' ? 'bureaux_syndicaux' : 'travailleurs';

    // Récupérer les données
    const { data: result, error: fetchError } = await supabase
      .from(table)
      .select('*')
      .eq(emailField, email)
      .single();

    if (fetchError || !result) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Renvoyer l'email avec le lien
    try {
      const subject = type === 'bureau' 
        ? 'Renvoyé - Votre bureau syndical - 224Solutions'
        : 'Renvoyé - Votre accès travailleur - 224Solutions';

      const title = type === 'bureau' 
        ? '🏢 Votre Bureau Syndical'
        : '👷 Votre Accès Travailleur';

      await transporter.sendMail({
        from: `"224Solutions" <${process.env.SMTP_USER}>`,
        to: email,
        subject: subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">${title}</h2>
            <p>Bonjour,</p>
            <p>Voici votre lien permanent pour accéder à votre interface :</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${result.interface_url}" 
                 style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                📱 Accéder à l'Interface
              </a>
            </div>
            <p><strong>Lien permanent :</strong> ${result.interface_url}</p>
            <p>Ce lien vous permet d'accéder à votre interface depuis n'importe quel appareil.</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">
              Cet email a été renvoyé par le système 224Solutions.<br>
              Si vous n'avez pas demandé ce renvoi, veuillez contacter le support.
            </p>
          </div>
        `
      });
    } catch (emailError) {
      console.error('Erreur envoi email:', emailError);
      return res.status(500).json({ error: 'Erreur lors de l\'envoi de l\'email' });
    }

    // Log de l'action
    await supabase.from('audit_logs').insert({
      actor_id: req.user?.id,
      action: 'LINK_RESENT',
      target_type: type,
      target_id: result.id,
      details: { 
        email: email,
        type: type,
        interface_url: result.interface_url
      }
    });

    res.json({ 
      success: true, 
      message: 'Lien renvoyé avec succès',
      interface_url: result.interface_url
    });

  } catch (error) {
    console.error('Erreur serveur:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

/**
 * Obtenir les statistiques des bureaux
 * GET /api/syndicat/stats
 */
router.get('/stats', async (req, res) => {
  try {
    // Statistiques globales
    const { data: bureaux, error: bureauxError } = await supabase
      .from('bureaux_syndicaux')
      .select('id, is_active');

    if (bureauxError) throw bureauxError;

    const { data: travailleurs, error: travailleursError } = await supabase
      .from('travailleurs')
      .select('id, is_active');

    if (travailleursError) throw travailleursError;

    const { data: motos, error: motosError } = await supabase
      .from('motos')
      .select('id, statut');

    if (motosError) throw motosError;

    const { data: alertes, error: alertesError } = await supabase
      .from('alertes')
      .select('id, level, is_resolved');

    if (alertesError) throw alertesError;

    const stats = {
      total_bureaux: bureaux?.length || 0,
      bureaux_actifs: bureaux?.filter(b => b.is_active).length || 0,
      total_travailleurs: travailleurs?.length || 0,
      travailleurs_actifs: travailleurs?.filter(t => t.is_active).length || 0,
      total_motos: motos?.length || 0,
      motos_actives: motos?.filter(m => m.statut === 'actif').length || 0,
      total_alertes: alertes?.length || 0,
      alertes_critiques: alertes?.filter(a => a.level === 'critical' && !a.is_resolved).length || 0
    };

    res.json({ success: true, stats });

  } catch (error) {
    console.error('Erreur serveur:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

/**
 * Obtenir la liste des bureaux
 * GET /api/syndicat/bureaux
 */
router.get('/bureaux', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('bureaux_syndicaux')
      .select(`
        *,
        total_travailleurs:travailleurs(count),
        total_motos:motos(count),
        alertes_critiques:alertes(count).eq(level, 'critical')
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, bureaux: data });

  } catch (error) {
    console.error('Erreur serveur:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

/**
 * Obtenir la liste des travailleurs
 * GET /api/syndicat/travailleurs
 */
router.get('/travailleurs', async (req, res) => {
  try {
    const { bureau_id } = req.query;

    let query = supabase
      .from('travailleurs')
      .select(`
        *,
        bureau:bureaux_syndicaux!travailleurs_bureau_id_fkey(nom)
      `)
      .order('created_at', { ascending: false });

    if (bureau_id) {
      query = query.eq('bureau_id', bureau_id);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({ success: true, travailleurs: data });

  } catch (error) {
    console.error('Erreur serveur:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

export default router;
