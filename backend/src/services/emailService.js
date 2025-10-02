/**
 * 📧 SERVICE D'ENVOI D'EMAIL BACKEND - 224SOLUTIONS
 * Service pour l'envoi d'emails via Nodemailer
 */

const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  /**
   * Initialise le transporteur d'email
   */
  initializeTransporter() {
    try {
      // Configuration pour Gmail (vous pouvez changer selon votre fournisseur)
      this.transporter = nodemailer.createTransporter({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER, // Votre email
          pass: process.env.EMAIL_PASSWORD // Votre mot de passe d'application
        }
      });

      // Alternative pour d'autres fournisseurs SMTP
      if (process.env.SMTP_HOST) {
        this.transporter = nodemailer.createTransporter({
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT || 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD
          }
        });
      }

      logger.info('✅ Email transporter initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize email transporter:', error);
    }
  }

  /**
   * Envoie un email
   */
  async sendEmail({ to, subject, html, text }) {
    try {
      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }

      const mailOptions = {
        from: {
          name: '224Solutions',
          address: process.env.EMAIL_FROM || process.env.EMAIL_USER
        },
        to,
        subject,
        html,
        text
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      logger.info(`✅ Email sent successfully to ${to}`, {
        messageId: result.messageId,
        subject
      });

      return {
        success: true,
        messageId: result.messageId
      };
    } catch (error) {
      logger.error(`❌ Failed to send email to ${to}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Vérifie la configuration email
   */
  async verifyConnection() {
    try {
      if (!this.transporter) {
        return { success: false, error: 'Transporter not initialized' };
      }

      await this.transporter.verify();
      logger.info('✅ Email connection verified successfully');
      return { success: true };
    } catch (error) {
      logger.error('❌ Email connection verification failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Envoie un email de test
   */
  async sendTestEmail(to) {
    const testEmailData = {
      to,
      subject: '🧪 Test Email - 224Solutions',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc; border-radius: 8px;">
          <div style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
            <h1 style="margin: 0; font-size: 24px;">🧪 Test Email</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">224Solutions Email System</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #1e293b; margin-top: 0;">Test de Fonctionnement</h2>
            <p>Ceci est un email de test pour vérifier le bon fonctionnement du système d'envoi d'emails 224Solutions.</p>
            
            <div style="background-color: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 6px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0;"><strong>📅 Date d'envoi:</strong> ${new Date().toLocaleString('fr-FR')}</p>
              <p style="margin: 10px 0 0 0;"><strong>🎯 Destinataire:</strong> ${to}</p>
            </div>
            
            <p>Si vous recevez cet email, le système fonctionne parfaitement ! ✅</p>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
              <p style="color: #64748b; margin: 0;">224Solutions - Système d'Email Professionnel</p>
            </div>
          </div>
        </div>
      `,
      text: `
TEST EMAIL - 224SOLUTIONS

Ceci est un email de test pour vérifier le bon fonctionnement du système d'envoi d'emails.

Date d'envoi: ${new Date().toLocaleString('fr-FR')}
Destinataire: ${to}

Si vous recevez cet email, le système fonctionne parfaitement !

224Solutions - Système d'Email Professionnel
      `
    };

    return await this.sendEmail(testEmailData);
  }
}

module.exports = new EmailService();
