/**
 * Script pour générer les icônes PWA aux bonnes tailles
 * Utilise sharp pour redimensionner
 * 
 * Usage: node scripts/generate-pwa-icons.js
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE_ICON = path.join(__dirname, '../public/icon-512.png');
const PUBLIC_DIR = path.join(__dirname, '../public');

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

async function generateIcons() {
  console.log('🎨 Génération des icônes PWA...\n');

  // Vérifier si le fichier source existe
  if (!fs.existsSync(SOURCE_ICON)) {
    console.error('❌ Fichier source non trouvé:', SOURCE_ICON);
    console.log('💡 Veuillez placer une image source de 512x512 minimum dans public/icon-512.png');
    process.exit(1);
  }

  const sourceStats = fs.statSync(SOURCE_ICON);
  console.log(`📁 Source: ${SOURCE_ICON} (${(sourceStats.size / 1024).toFixed(1)} KB)\n`);

  for (const size of SIZES) {
    const outputPath = path.join(PUBLIC_DIR, `icon-${size}.png`);
    
    try {
      await sharp(SOURCE_ICON)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png({ 
          compressionLevel: 9,
          quality: 80
        })
        .toFile(outputPath);

      const stats = fs.statSync(outputPath);
      console.log(`✅ icon-${size}.png - ${(stats.size / 1024).toFixed(1)} KB`);
    } catch (error) {
      console.error(`❌ Erreur pour ${size}x${size}:`, error.message);
    }
  }

  // Générer aussi apple-touch-icon (180x180)
  try {
    const appleIconPath = path.join(PUBLIC_DIR, 'apple-touch-icon.png');
    await sharp(SOURCE_ICON)
      .resize(180, 180, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png({ compressionLevel: 9 })
      .toFile(appleIconPath);

    const stats = fs.statSync(appleIconPath);
    console.log(`✅ apple-touch-icon.png (180x180) - ${(stats.size / 1024).toFixed(1)} KB`);
  } catch (error) {
    console.error('❌ Erreur apple-touch-icon:', error.message);
  }

  // Générer favicon (32x32)
  try {
    const faviconPath = path.join(PUBLIC_DIR, 'favicon.png');
    await sharp(SOURCE_ICON)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png({ compressionLevel: 9 })
      .toFile(faviconPath);

    const stats = fs.statSync(faviconPath);
    console.log(`✅ favicon.png (32x32) - ${(stats.size / 1024).toFixed(1)} KB`);
  } catch (error) {
    console.error('❌ Erreur favicon:', error.message);
  }

  console.log('\n✨ Génération terminée!');
  console.log('💡 N\'oubliez pas de commit les nouveaux icônes.');
}

generateIcons().catch(console.error);
