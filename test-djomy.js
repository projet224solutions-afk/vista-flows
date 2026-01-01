/**
 * Script de test pour le paiement Djomy
 */

const testDjomyPayment = async () => {
  console.log('🧪 TEST PAIEMENT DJOMY');
  console.log('='.repeat(50));

  const SUPABASE_URL = 'https://uakkxaibujzxdiqzpnpr.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVha2t4YWlidWp6eGRpcXpwbnByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwMDA2NTcsImV4cCI6MjA3NDU3NjY1N30.kqYNdg-73BTP0Yht7kid-EZu2APg9qw-b_KW9z5hJbM';

  const payload = {
    amount: 1000, // 1000 GNF (test)
    payerPhone: '224620123456',
    paymentMethod: 'OM', // Orange Money
    description: 'Test paiement POS',
    orderId: `TEST-${Date.now()}`,
    useGateway: false,
    useSandbox: true, // ⚠️ SANDBOX ACTIVÉ
    countryCode: 'GN'
  };

  try {
    console.log('\n📤 Envoi de la requête...');
    console.log('Payload:', JSON.stringify(payload, null, 2));

    const response = await fetch(`${SUPABASE_URL}/functions/v1/djomy-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify(payload)
    });

    console.log('\n📥 Réponse reçue:');
    console.log('Status:', response.status, response.statusText);
    
    const contentType = response.headers.get('content-type');
    console.log('Content-Type:', contentType);

    const responseText = await response.text();
    console.log('\n📄 Corps de la réponse:');
    
    try {
      const data = JSON.parse(responseText);
      console.log(JSON.stringify(data, null, 2));

      if (response.ok) {
        console.log('\n✅ TEST RÉUSSI !');
        if (data.success) {
          console.log('✅ Paiement initialisé avec succès');
          console.log('Transaction ID:', data.transactionId);
        } else {
          console.log('⚠️ Réponse OK mais success=false');
        }
      } else {
        console.log('\n❌ TEST ÉCHOUÉ !');
        console.log('Erreur:', data.message || data.error || 'Erreur inconnue');
      }

    } catch (e) {
      console.log(responseText);
      console.log('\n⚠️ Réponse non-JSON');
    }

  } catch (error) {
    console.log('\n❌ ERREUR LORS DU TEST:');
    console.error(error.message);
  }

  console.log('\n' + '='.repeat(50));
};

// Exécuter le test
testDjomyPayment();
