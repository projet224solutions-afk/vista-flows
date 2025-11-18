/**
 * Script pour vérifier et créer les IDs/wallets manquants pour tous les utilisateurs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://uakkxaibujzxdiqzpnpr.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVha2t4YWlidWp6eGRpcXpwbnByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwMDA2NTcsImV4cCI6MjA3NDU3NjY1N30.kqYNdg-73BTP0Yht7kid-EZu2APg9qw-b_KW9z5hJbM";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Fonction pour générer un ID au format 3 lettres + 4 chiffres
function generateCustomId() {
  let letters = '';
  for (let i = 0; i < 3; i++) {
    letters += String.fromCharCode(65 + Math.floor(Math.random() * 26));
  }

  let numbers = '';
  for (let i = 0; i < 4; i++) {
    numbers += Math.floor(Math.random() * 10).toString();
  }

  return letters + numbers;
}

// Vérifier l'unicité de l'ID
async function ensureUniqueId(id) {
  const { data, error } = await supabase
    .from('user_ids')
    .select('custom_id')
    .eq('custom_id', id)
    .single();

  if (error && error.code === 'PGRST116') {
    // Aucun résultat trouvé, l'ID est unique
    return true;
  }
  return false;
}

// Générer un ID unique
async function generateUniqueId() {
  let attempts = 0;
  while (attempts < 10) {
    const id = generateCustomId();
    if (await ensureUniqueId(id)) {
      return id;
    }
    attempts++;
  }
  // Fallback avec timestamp
  return 'USR' + Date.now().toString().slice(-4);
}

// Vérifier tous les utilisateurs
async function checkAllUsers() {
  console.log('🔍 VÉRIFICATION DE TOUS LES UTILISATEURS');
  console.log('========================================');

  try {
    // Récupérer tous les profils utilisateurs
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, role');

    if (profilesError) {
      console.error('❌ Erreur récupération profils:', profilesError);
      return;
    }

    console.log(`📊 Nombre d'utilisateurs trouvés: ${profiles?.length || 0}`);

    if (!profiles || profiles.length === 0) {
      console.log('ℹ️ Aucun utilisateur trouvé dans la base de données');
      return;
    }

    const usersNeedingSetup = [];

    // Vérifier chaque utilisateur
    for (const profile of profiles) {
      console.log(`\n👤 Vérification: ${profile.email}`);
      
      // Vérifier l'ID utilisateur
      const { data: userIdData, error: userIdError } = await supabase
        .from('user_ids')
        .select('custom_id')
        .eq('user_id', profile.id)
        .single();

      const hasUserId = !userIdError && userIdData;
      
      // Vérifier le wallet
      const { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('id, balance, currency, status')
        .eq('user_id', profile.id)
        .single();

      const hasWallet = !walletError && walletData;

      // Vérifier la carte virtuelle
      const { data: cardData, error: cardError } = await supabase
        .from('virtual_cards')
        .select('id, card_number, card_status')
        .eq('user_id', profile.id)
        .single();

      const hasVirtualCard = !cardError && cardData;

      const status = {
        profile,
        hasUserId,
        hasWallet,
        hasVirtualCard,
        userIdData: hasUserId ? userIdData : null,
        walletData: hasWallet ? walletData : null,
        cardData: hasVirtualCard ? cardData : null
      };

      // Afficher le statut
      console.log(`   🆔 ID: ${hasUserId ? '✅ ' + userIdData.custom_id : '❌ Manquant'}`);
      console.log(`   💰 Wallet: ${hasWallet ? '✅ ' + walletData.balance + ' ' + walletData.currency : '❌ Manquant'}`);
      console.log(`   💳 Carte: ${hasVirtualCard ? '✅ ' + cardData.card_number.slice(-4) : '❌ Manquante'}`);

      if (!hasUserId || !hasWallet) {
        usersNeedingSetup.push(status);
      }
    }

    return usersNeedingSetup;

  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error);
  }
}

// Créer les éléments manquants
async function createMissingElements(usersNeedingSetup) {
  if (!usersNeedingSetup || usersNeedingSetup.length === 0) {
    console.log('\n✅ Tous les utilisateurs ont déjà leur setup complet !');
    return;
  }

  console.log(`\n🔧 CRÉATION DES ÉLÉMENTS MANQUANTS`);
  console.log(`==================================`);
  console.log(`Utilisateurs à traiter: ${usersNeedingSetup.length}`);

  for (const user of usersNeedingSetup) {
    console.log(`\n👤 Traitement: ${user.profile.email}`);

    try {
      // Créer l'ID utilisateur si manquant
      if (!user.hasUserId) {
        const customId = await generateUniqueId();
        const { error: idError } = await supabase
          .from('user_ids')
          .upsert({
            user_id: user.profile.id,
            custom_id: customId
          });

        if (idError) {
          console.error(`   ❌ Erreur création ID:`, idError);
        } else {
          console.log(`   ✅ ID créé: ${customId}`);
        }
      }

      // Créer le wallet si manquant
      if (!user.hasWallet) {
        const { error: walletError } = await supabase
          .from('wallets')
          .upsert({
            user_id: user.profile.id,
            balance: 0,
            currency: 'XAF',
            status: 'active'
          });

        if (walletError) {
          console.error(`   ❌ Erreur création wallet:`, walletError);
        } else {
          console.log(`   ✅ Wallet créé: 0 XAF`);
        }
      }

    } catch (error) {
      console.error(`   ❌ Erreur traitement ${user.profile.email}:`, error);
    }
  }
}

// Fonction principale
async function main() {
  console.log('🚀 SETUP COMPLET POUR TOUS LES UTILISATEURS');
  console.log('============================================');
  console.log('Vérification et création des IDs + Wallets manquants\n');

  const usersNeedingSetup = await checkAllUsers();
  await createMissingElements(usersNeedingSetup);

  console.log('\n✅ TRAITEMENT TERMINÉ !');
  console.log('Tous les utilisateurs devraient maintenant avoir:');
  console.log('• Un ID unique (3 lettres + 4 chiffres)');
  console.log('• Un wallet actif');
  console.log('• Possibilité de créer une carte virtuelle');
}

main().catch(console.error);
