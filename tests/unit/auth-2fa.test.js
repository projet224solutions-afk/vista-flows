/**
 * 🧪 TESTS UNITAIRES - 2FA/WEB AUTHN - 224SOLUTIONS
 * Tests pour l'authentification à deux facteurs
 */

const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const request = require('supertest');
const app = require('../../backend/src/app');

describe('2FA Authentication', () => {
  let testUser;
  let testToken;

  beforeEach(async () => {
    // Créer un utilisateur de test
    testUser = {
      id: 'test-user-123',
      email: 'test@224solutions.com',
      role: 'pdg'
    };
    
    testToken = 'test-jwt-token';
  });

  afterEach(async () => {
    // Nettoyer les données de test
  });

  describe('POST /auth/2fa/setup', () => {
    it('should setup 2FA for PDG user', async () => {
      const response = await request(app)
        .post('/auth/2fa/setup')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          user_id: testUser.id
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('secret');
      expect(response.body.data).toHaveProperty('qr_code');
      expect(response.body.data).toHaveProperty('backup_codes');
      expect(response.body.data.backup_codes).toHaveLength(10);
    });

    it('should reject 2FA setup for non-PDG users', async () => {
      const response = await request(app)
        .post('/auth/2fa/setup')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          user_id: 'regular-user-123'
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('PDG or Admin role required');
    });

    it('should handle missing user_id', async () => {
      const response = await request(app)
        .post('/auth/2fa/setup')
        .set('Authorization', `Bearer ${testToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /auth/2fa/verify', () => {
    it('should verify valid TOTP code', async () => {
      // Setup 2FA first
      await request(app)
        .post('/auth/2fa/setup')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ user_id: testUser.id });

      const response = await request(app)
        .post('/auth/2fa/verify')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          user_id: testUser.id,
          totp_code: '123456' // Code de test
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject invalid TOTP code', async () => {
      const response = await request(app)
        .post('/auth/2fa/verify')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          user_id: testUser.id,
          totp_code: '000000'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /auth/webauthn/register', () => {
    it('should register WebAuthn credential', async () => {
      const response = await request(app)
        .post('/auth/webauthn/register')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          user_id: testUser.id,
          credential_name: 'Test Security Key'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('challenge');
    });
  });

  describe('POST /auth/webauthn/verify', () => {
    it('should verify WebAuthn credential', async () => {
      const response = await request(app)
        .post('/auth/webauthn/verify')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          user_id: testUser.id,
          credential_id: 'test-credential-id',
          signature: 'test-signature'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
