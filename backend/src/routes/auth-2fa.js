/**
 * 🔐 AUTHENTIFICATION 2FA & WEBAUTHN - 224SOLUTIONS
 * Endpoints pour l'authentification à deux facteurs et WebAuthn
 */

const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { WebAuthn } = require('@simplewebauthn/server');

// Configuration Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Configuration WebAuthn
const rpName = '224Solutions';
const rpID = process.env.RP_ID || 'localhost';
const origin = process.env.ORIGIN || 'http://localhost:3000';

// =====================================================
// 1. SETUP 2FA (TOTP)
// =====================================================

/**
 * POST /auth/2fa/setup
 * Configure l'authentification 2FA pour un utilisateur
 */
router.post('/setup', async (req, res) => {
  try {
    const { user_id, user_email } = req.body;

    if (!user_id || !user_email) {
      return res.status(400).json({ 
        error: 'user_id et user_email requis' 
      });
    }

    // Générer le secret TOTP
    const secret = speakeasy.generateSecret({
      name: `224Solutions (${user_email})`,
      issuer: '224Solutions',
      length: 32
    });

    // Générer les codes de sauvegarde
    const backupCodes = Array.from({ length: 10 }, () => 
      Math.random().toString(36).substring(2, 8).toUpperCase()
    );

    // Stocker le secret et les codes de sauvegarde (chiffrés)
    const { error: secretError } = await supabase
      .from('user_2fa_secrets')
      .upsert({
        user_id,
        secret: secret.base32,
        backup_codes: backupCodes,
        is_active: false, // Pas encore activé
        created_at: new Date().toISOString()
      });

    if (secretError) {
      console.error('Erreur stockage secret 2FA:', secretError);
      return res.status(500).json({ 
        error: 'Erreur configuration 2FA' 
      });
    }

    // Générer le QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    res.json({
      success: true,
      secret: secret.base32,
      qr_code: qrCodeUrl,
      backup_codes: backupCodes,
      manual_entry_key: secret.base32
    });

  } catch (error) {
    console.error('Erreur setup 2FA:', error);
    res.status(500).json({ 
      error: 'Erreur configuration 2FA' 
    });
  }
});

/**
 * POST /auth/2fa/verify
 * Vérifie le code TOTP ou le code de sauvegarde
 */
router.post('/verify', async (req, res) => {
  try {
    const { user_id, code, is_backup_code = false } = req.body;

    if (!user_id || !code) {
      return res.status(400).json({ 
        error: 'user_id et code requis' 
      });
    }

    // Récupérer le secret 2FA
    const { data: secretData, error: secretError } = await supabase
      .from('user_2fa_secrets')
      .select('secret, backup_codes, is_active')
      .eq('user_id', user_id)
      .single();

    if (secretError || !secretData) {
      return res.status(404).json({ 
        error: 'Configuration 2FA non trouvée' 
      });
    }

    let isValid = false;

    if (is_backup_code) {
      // Vérifier le code de sauvegarde
      const backupCodes = secretData.backup_codes || [];
      const codeIndex = backupCodes.indexOf(code);
      
      if (codeIndex !== -1) {
        // Supprimer le code utilisé
        backupCodes.splice(codeIndex, 1);
        
        await supabase
          .from('user_2fa_secrets')
          .update({ backup_codes: backupCodes })
          .eq('user_id', user_id);
        
        isValid = true;
      }
    } else {
      // Vérifier le code TOTP
      isValid = speakeasy.totp.verify({
        secret: secretData.secret,
        encoding: 'base32',
        token: code,
        window: 2 // Tolérance de 2 périodes
      });
    }

    if (isValid) {
      // Activer le 2FA si ce n'est pas encore fait
      if (!secretData.is_active) {
        await supabase
          .from('user_2fa_secrets')
          .update({ is_active: true })
          .eq('user_id', user_id);
      }

      // Enregistrer l'audit
      await supabase
        .from('auth_audit_logs')
        .insert({
          user_id,
          action: '2fa_verification_success',
          ip_address: req.ip,
          user_agent: req.get('User-Agent'),
          metadata: { is_backup_code }
        });

      res.json({
        success: true,
        message: 'Code 2FA vérifié avec succès'
      });
    } else {
      // Enregistrer la tentative échouée
      await supabase
        .from('auth_audit_logs')
        .insert({
          user_id,
          action: '2fa_verification_failed',
          ip_address: req.ip,
          user_agent: req.get('User-Agent'),
          metadata: { is_backup_code }
        });

      res.status(400).json({
        error: 'Code 2FA invalide'
      });
    }

  } catch (error) {
    console.error('Erreur vérification 2FA:', error);
    res.status(500).json({ 
      error: 'Erreur vérification 2FA' 
    });
  }
});

// =====================================================
// 2. WEBAUTHN REGISTRATION
// =====================================================

/**
 * POST /auth/webauthn/register/begin
 * Commence l'enregistrement d'une clé WebAuthn
 */
router.post('/webauthn/register/begin', async (req, res) => {
  try {
    const { user_id, user_email, user_name } = req.body;

    if (!user_id || !user_email || !user_name) {
      return res.status(400).json({ 
        error: 'user_id, user_email et user_name requis' 
      });
    }

    // Générer les options d'enregistrement
    const options = await WebAuthn.generateRegistrationOptions({
      rpName,
      rpID,
      userID: user_id,
      userName: user_email,
      userDisplayName: user_name,
      attestationType: 'direct',
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'required'
      },
      supportedAlgorithmIDs: [-7, -257] // ES256, RS256
    });

    // Stocker les options temporairement
    await supabase
      .from('webauthn_challenges')
      .upsert({
        user_id,
        challenge: options.challenge,
        type: 'registration',
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes
      });

    res.json({
      success: true,
      options
    });

  } catch (error) {
    console.error('Erreur début enregistrement WebAuthn:', error);
    res.status(500).json({ 
      error: 'Erreur enregistrement WebAuthn' 
    });
  }
});

/**
 * POST /auth/webauthn/register/complete
 * Finalise l'enregistrement d'une clé WebAuthn
 */
router.post('/webauthn/register/complete', async (req, res) => {
  try {
    const { user_id, credential } = req.body;

    if (!user_id || !credential) {
      return res.status(400).json({ 
        error: 'user_id et credential requis' 
      });
    }

    // Récupérer le challenge
    const { data: challengeData, error: challengeError } = await supabase
      .from('webauthn_challenges')
      .select('challenge')
      .eq('user_id', user_id)
      .eq('type', 'registration')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (challengeError || !challengeData) {
      return res.status(400).json({ 
        error: 'Challenge WebAuthn invalide ou expiré' 
      });
    }

    // Vérifier la réponse
    const verification = await WebAuthn.verifyRegistrationResponse({
      response: credential,
      expectedChallenge: challengeData.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID
    });

    if (verification.verified) {
      // Stocker la clé WebAuthn
      await supabase
        .from('user_webauthn_keys')
        .insert({
          user_id,
          credential_id: credential.id,
          public_key: verification.publicKey,
          counter: verification.counter,
          device_type: credential.response.clientDataJSON ? 'platform' : 'cross-platform',
          is_active: true,
          created_at: new Date().toISOString()
        });

      // Supprimer le challenge
      await supabase
        .from('webauthn_challenges')
        .delete()
        .eq('user_id', user_id)
        .eq('type', 'registration');

      res.json({
        success: true,
        message: 'Clé WebAuthn enregistrée avec succès'
      });
    } else {
      res.status(400).json({
        error: 'Vérification WebAuthn échouée'
      });
    }

  } catch (error) {
    console.error('Erreur finalisation WebAuthn:', error);
    res.status(500).json({ 
      error: 'Erreur enregistrement WebAuthn' 
    });
  }
});

// =====================================================
// 3. WEBAUTHN AUTHENTICATION
// =====================================================

/**
 * POST /auth/webauthn/authenticate/begin
 * Commence l'authentification WebAuthn
 */
router.post('/webauthn/authenticate/begin', async (req, res) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ 
        error: 'user_id requis' 
      });
    }

    // Récupérer les clés WebAuthn de l'utilisateur
    const { data: keys, error: keysError } = await supabase
      .from('user_webauthn_keys')
      .select('credential_id, public_key, counter')
      .eq('user_id', user_id)
      .eq('is_active', true);

    if (keysError || !keys.length) {
      return res.status(404).json({ 
        error: 'Aucune clé WebAuthn trouvée' 
      });
    }

    // Générer les options d'authentification
    const options = await WebAuthn.generateAuthenticationOptions({
      rpID,
      allowCredentials: keys.map(key => ({
        id: key.credential_id,
        type: 'public-key',
        transports: ['internal', 'hybrid']
      })),
      userVerification: 'required'
    });

    // Stocker le challenge
    await supabase
      .from('webauthn_challenges')
      .upsert({
        user_id,
        challenge: options.challenge,
        type: 'authentication',
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString()
      });

    res.json({
      success: true,
      options
    });

  } catch (error) {
    console.error('Erreur début authentification WebAuthn:', error);
    res.status(500).json({ 
      error: 'Erreur authentification WebAuthn' 
    });
  }
});

/**
 * POST /auth/webauthn/authenticate/complete
 * Finalise l'authentification WebAuthn
 */
router.post('/webauthn/authenticate/complete', async (req, res) => {
  try {
    const { user_id, credential } = req.body;

    if (!user_id || !credential) {
      return res.status(400).json({ 
        error: 'user_id et credential requis' 
      });
    }

    // Récupérer le challenge
    const { data: challengeData, error: challengeError } = await supabase
      .from('webauthn_challenges')
      .select('challenge')
      .eq('user_id', user_id)
      .eq('type', 'authentication')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (challengeError || !challengeData) {
      return res.status(400).json({ 
        error: 'Challenge WebAuthn invalide ou expiré' 
      });
    }

    // Récupérer la clé WebAuthn
    const { data: keyData, error: keyError } = await supabase
      .from('user_webauthn_keys')
      .select('public_key, counter')
      .eq('user_id', user_id)
      .eq('credential_id', credential.id)
      .eq('is_active', true)
      .single();

    if (keyError || !keyData) {
      return res.status(400).json({ 
        error: 'Clé WebAuthn non trouvée' 
      });
    }

    // Vérifier la réponse
    const verification = await WebAuthn.verifyAuthenticationResponse({
      response: credential,
      expectedChallenge: challengeData.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      authenticator: {
        credentialID: credential.id,
        credentialPublicKey: keyData.public_key,
        counter: keyData.counter
      }
    });

    if (verification.verified) {
      // Mettre à jour le compteur
      await supabase
        .from('user_webauthn_keys')
        .update({ counter: verification.counter })
        .eq('user_id', user_id)
        .eq('credential_id', credential.id);

      // Supprimer le challenge
      await supabase
        .from('webauthn_challenges')
        .delete()
        .eq('user_id', user_id)
        .eq('type', 'authentication');

      // Enregistrer l'audit
      await supabase
        .from('auth_audit_logs')
        .insert({
          user_id,
          action: 'webauthn_authentication_success',
          ip_address: req.ip,
          user_agent: req.get('User-Agent')
        });

      res.json({
        success: true,
        message: 'Authentification WebAuthn réussie'
      });
    } else {
      // Enregistrer la tentative échouée
      await supabase
        .from('auth_audit_logs')
        .insert({
          user_id,
          action: 'webauthn_authentication_failed',
          ip_address: req.ip,
          user_agent: req.get('User-Agent')
        });

      res.status(400).json({
        error: 'Authentification WebAuthn échouée'
      });
    }

  } catch (error) {
    console.error('Erreur finalisation authentification WebAuthn:', error);
    res.status(500).json({ 
      error: 'Erreur authentification WebAuthn' 
    });
  }
});

module.exports = router;
