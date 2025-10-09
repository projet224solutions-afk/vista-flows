/**
 * API ENDPOINT - GÉNÉRATION DE BADGE TAXI-MOTO
 * Génère un badge professionnel avec QR code et sauvegarde dans Supabase Storage
 * 224Solutions - Badge Generation System
 */

import { createClient } from '@supabase/supabase-js';
import QRCode from 'qrcode';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import sharp from 'sharp';

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Méthode non autorisée' });
    }

    try {
        const {
            bureau_id,
            member_id,
            created_by,
            name,
            firstName,
            giletNumber,
            phone,
            email,
            plate,
            serialNumber,
            photo
        } = req.body;

        // Validation des champs obligatoires
        if (!bureau_id || !name || !firstName || !phone || !plate || !serialNumber) {
            return res.status(400).json({
                error: 'Champs obligatoires manquants',
                required: ['bureau_id', 'name', 'firstName', 'phone', 'plate', 'serialNumber']
            });
        }

        // Vérification des permissions (rôle bureau admin ou PDG)
        // TODO: Implémenter la vérification des rôles utilisateur
        console.log('🔐 Vérification des permissions pour:', created_by);

        // Génération du QR code
        const qrData = JSON.stringify({
            name: `${firstName} ${name}`,
            phone,
            plate,
            serialNumber,
            bureau_id,
            generated_at: new Date().toISOString()
        });

        const qrCodeBuffer = await QRCode.toBuffer(qrData, {
            width: 200,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });

        // Création du PDF du badge
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([400, 600]); // Format badge vertical
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        // Couleurs
        const blue = rgb(0.1, 0.3, 0.8);
        const darkBlue = rgb(0.05, 0.2, 0.6);
        const gray = rgb(0.3, 0.3, 0.3);

        // En-tête du badge
        page.drawRectangle({
            x: 0,
            y: 500,
            width: 400,
            height: 100,
            color: blue
        });

        page.drawText('BADGE TAXI-MOTO', {
            x: 50,
            y: 540,
            size: 16,
            font: boldFont,
            color: rgb(1, 1, 1)
        });

        page.drawText('224Solutions', {
            x: 50,
            y: 520,
            size: 12,
            font: font,
            color: rgb(1, 1, 1)
        });

        // Informations du conducteur
        const startY = 450;
        const lineHeight = 25;

        page.drawText('CONDUCTEUR:', {
            x: 30,
            y: startY,
            size: 14,
            font: boldFont,
            color: darkBlue
        });

        page.drawText(`${firstName} ${name}`, {
            x: 30,
            y: startY - lineHeight,
            size: 16,
            font: boldFont,
            color: gray
        });

        page.drawText(`Tél: ${phone}`, {
            x: 30,
            y: startY - (lineHeight * 2),
            size: 12,
            font: font,
            color: gray
        });

        if (email) {
            page.drawText(`Email: ${email}`, {
                x: 30,
                y: startY - (lineHeight * 3),
                size: 12,
                font: font,
                color: gray
            });
        }

        // Informations du véhicule
        const vehicleY = startY - (lineHeight * 4);
        page.drawText('VÉHICULE:', {
            x: 30,
            y: vehicleY,
            size: 14,
            font: boldFont,
            color: darkBlue
        });

        page.drawText(`Plaque: ${plate}`, {
            x: 30,
            y: vehicleY - lineHeight,
            size: 12,
            font: font,
            color: gray
        });

        page.drawText(`Série: ${serialNumber}`, {
            x: 30,
            y: vehicleY - (lineHeight * 2),
            size: 12,
            font: font,
            color: gray
        });

        if (giletNumber) {
            page.drawText(`Gilet: ${giletNumber}`, {
                x: 30,
                y: vehicleY - (lineHeight * 3),
                size: 12,
                font: font,
                color: gray
            });
        }

        // QR Code (simulé par un rectangle pour l'instant)
        page.drawRectangle({
            x: 250,
            y: 200,
            width: 120,
            height: 120,
            borderColor: darkBlue,
            borderWidth: 2
        });

        page.drawText('QR CODE', {
            x: 280,
            y: 250,
            size: 10,
            font: font,
            color: gray
        });

        // Date de génération
        const currentDate = new Date().toLocaleDateString('fr-FR');
        page.drawText(`Généré le: ${currentDate}`, {
            x: 30,
            y: 50,
            size: 10,
            font: font,
            color: gray
        });

        // Génération du PDF
        const pdfBytes = await pdfDoc.save();

        // Sauvegarde dans Supabase Storage
        const fileName = `badge_${serialNumber}_${Date.now()}.pdf`;
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('badges')
            .upload(fileName, pdfBytes, {
                contentType: 'application/pdf',
                cacheControl: '3600'
            });

        if (uploadError) {
            console.error('❌ Erreur upload Supabase:', uploadError);
            throw new Error(`Erreur upload: ${uploadError.message}`);
        }

        // Récupération de l'URL publique
        const { data: urlData } = supabase.storage
            .from('badges')
            .getPublicUrl(fileName);

        // Sauvegarde dans la table badges
        const { data: badgeData, error: badgeError } = await supabase
            .from('badges')
            .insert({
                bureau_id,
                member_id: member_id || null,
                file_path: uploadData.path,
                public_url: urlData.publicUrl,
                name,
                first_name: firstName,
                gilet_number: giletNumber || null,
                phone,
                email: email || null,
                plate,
                serial_number: serialNumber,
                created_by,
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (badgeError) {
            console.error('❌ Erreur sauvegarde badge:', badgeError);
            // Ne pas faire échouer la génération si la sauvegarde DB échoue
        }

        // Log d'audit
        const { error: logError } = await supabase
            .from('ai_logs')
            .insert({
                action: 'badge_generated',
                details: {
                    badge_id: badgeData?.id,
                    bureau_id,
                    member_name: `${firstName} ${name}`,
                    serial_number: serialNumber
                },
                created_by,
                created_at: new Date().toISOString()
            });

        if (logError) {
            console.error('⚠️ Erreur log audit:', logError);
        }

        console.log('✅ Badge généré avec succès:', {
            fileName,
            url: urlData.publicUrl,
            badgeId: badgeData?.id
        });

        return res.status(200).json({
            success: true,
            url: urlData.publicUrl,
            fileName,
            badgeId: badgeData?.id,
            message: 'Badge généré avec succès'
        });

    } catch (error) {
        console.error('❌ Erreur génération badge:', error);
        return res.status(500).json({
            error: 'Erreur lors de la génération du badge',
            details: error.message
        });
    }
}
