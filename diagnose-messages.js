// Script de diagnostic pour le système de messagerie
// Exécuter dans la console du navigateur après connexion

async function diagnoseMessaging() {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  
  const supabaseUrl = 'https://dbegaowkofwdjqjmxvvi.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRiZWdhb3drb2Z3ZGpxam14dnZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI1NjIxMjQsImV4cCI6MjA0ODEzODEyNH0.DgbPOI3e-uA3mWDcpAVS-w7rqNZLyKYJrz69-RYqQ10';
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('=== DIAGNOSTIC SYSTÈME MESSAGERIE ===\n');
  
  // 1. Vérifier l'utilisateur connecté
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) {
    console.error('❌ Erreur auth:', userError);
    return;
  }
  if (!user) {
    console.error('❌ Aucun utilisateur connecté');
    return;
  }
  console.log('✅ Utilisateur connecté:', user.id);
  
  // 2. Vérifier si la table messages existe
  console.log('\n--- Test table messages ---');
  const { data: msgTest, error: msgError } = await supabase
    .from('messages')
    .select('count')
    .limit(1);
  
  if (msgError) {
    console.error('❌ Erreur table messages:', msgError.message);
    console.log('Code erreur:', msgError.code);
    console.log('Détails:', msgError.details);
    console.log('Hint:', msgError.hint);
  } else {
    console.log('✅ Table messages accessible');
  }
  
  // 3. Vérifier les colonnes disponibles
  console.log('\n--- Test colonnes ---');
  const { data: cols, error: colError } = await supabase
    .from('messages')
    .select('*')
    .limit(1);
  
  if (colError) {
    console.error('❌ Erreur lecture colonnes:', colError.message);
  } else if (cols && cols.length > 0) {
    console.log('✅ Colonnes disponibles:', Object.keys(cols[0]));
  } else {
    console.log('ℹ️ Table vide, test insertion...');
    
    // Tenter une insertion de test
    const { data: insertData, error: insertError } = await supabase
      .from('messages')
      .insert({
        sender_id: user.id,
        recipient_id: user.id, // auto-message pour test
        content: 'Test diagnostic',
        type: 'text'
      })
      .select();
    
    if (insertError) {
      console.error('❌ Erreur insertion:', insertError.message);
      console.log('Code:', insertError.code);
      
      if (insertError.message.includes('recipient_id')) {
        console.log('⚠️ La colonne recipient_id n\'existe pas!');
      }
      if (insertError.message.includes('conversation_id')) {
        console.log('⚠️ conversation_id est requis!');
      }
    } else {
      console.log('✅ Insertion réussie:', insertData);
      // Supprimer le message de test
      await supabase.from('messages').delete().eq('id', insertData[0].id);
    }
  }
  
  // 4. Vérifier la table conversations
  console.log('\n--- Test table conversations ---');
  const { data: convTest, error: convError } = await supabase
    .from('conversations')
    .select('*')
    .limit(1);
  
  if (convError) {
    console.error('❌ Erreur table conversations:', convError.message);
  } else {
    console.log('✅ Table conversations accessible');
    if (convTest && convTest.length > 0) {
      console.log('Exemple conversation:', convTest[0]);
    }
  }
  
  // 5. Vérifier la table profiles
  console.log('\n--- Test table profiles ---');
  const { data: profTest, error: profError } = await supabase
    .from('profiles')
    .select('id, first_name, last_name')
    .eq('id', user.id)
    .single();
  
  if (profError) {
    console.error('❌ Erreur profil:', profError.message);
  } else {
    console.log('✅ Profil trouvé:', profTest);
  }
  
  console.log('\n=== FIN DIAGNOSTIC ===');
}

// Exécuter
diagnoseMessaging();
