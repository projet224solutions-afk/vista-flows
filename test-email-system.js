/**
 * 🧪 TEST SYSTÈME D'EMAIL - 224SOLUTIONS
 * Script pour tester l'envoi d'emails via le backend
 */

const fetch = require('node-fetch');

// Configuration
const BACKEND_URL = 'http://localhost:3001';
const TEST_EMAIL = 'test@example.com'; // Remplacez par votre email de test

// Couleurs pour la console
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testEmailSystem() {
    log('\n🧪 DÉBUT DES TESTS SYSTÈME D\'EMAIL', 'bold');
    log('=====================================', 'blue');

    try {
        // Test 1: Vérifier que le serveur est en ligne
        log('\n📡 Test 1: Vérification du serveur...', 'yellow');
        
        const healthResponse = await fetch(`${BACKEND_URL}/api/health`);
        if (!healthResponse.ok) {
            throw new Error('Serveur backend non accessible');
        }
        
        const healthData = await healthResponse.json();
        log(`✅ Serveur en ligne: ${healthData.message}`, 'green');

        // Test 2: Vérifier la configuration email
        log('\n🔧 Test 2: Vérification configuration email...', 'yellow');
        
        const verifyResponse = await fetch(`${BACKEND_URL}/api/email/verify`, {
            headers: {
                'Authorization': 'Bearer fake-token-for-test' // Token de test
            }
        });
        
        if (verifyResponse.status === 401) {
            log('⚠️  Authentification requise (normal)', 'yellow');
        } else {
            const verifyData = await verifyResponse.json();
            log(`📧 Configuration email: ${verifyData.success ? 'OK' : 'ERREUR'}`, 
                verifyData.success ? 'green' : 'red');
        }

        // Test 3: Test d'envoi d'email (nécessite authentification)
        log('\n📧 Test 3: Test d\'envoi d\'email...', 'yellow');
        
        const emailTestData = {
            to: TEST_EMAIL,
            subject: '🧪 Test Email 224Solutions',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #3b82f6;">Test Email - 224Solutions</h2>
                    <p>Ceci est un email de test automatique.</p>
                    <p><strong>Date:</strong> ${new Date().toLocaleString('fr-FR')}</p>
                    <p>Si vous recevez cet email, le système fonctionne ! ✅</p>
                </div>
            `,
            text: `Test Email - 224Solutions\n\nDate: ${new Date().toLocaleString('fr-FR')}\n\nSi vous recevez cet email, le système fonctionne !`
        };

        const emailResponse = await fetch(`${BACKEND_URL}/api/email/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer fake-token-for-test' // Token de test
            },
            body: JSON.stringify(emailTestData)
        });

        if (emailResponse.status === 401) {
            log('⚠️  Authentification requise pour l\'envoi d\'email', 'yellow');
            log('💡 Pour tester complètement, vous devez:', 'blue');
            log('   1. Démarrer le backend: npm run dev', 'blue');
            log('   2. Configurer les variables d\'email dans .env', 'blue');
            log('   3. Obtenir un token JWT valide', 'blue');
        } else {
            const emailData = await emailResponse.json();
            log(`📧 Envoi email: ${emailData.success ? 'SUCCÈS' : 'ÉCHEC'}`, 
                emailData.success ? 'green' : 'red');
            
            if (emailData.success) {
                log(`📬 Message ID: ${emailData.messageId}`, 'green');
            } else {
                log(`❌ Erreur: ${emailData.error}`, 'red');
            }
        }

        // Test 4: Simulation création bureau syndical
        log('\n🏛️  Test 4: Simulation création bureau syndical...', 'yellow');
        
        const bureauData = {
            president_name: 'Jean Dupont',
            president_email: TEST_EMAIL,
            bureau_code: 'SYN-2025-00001',
            prefecture: 'Dakar',
            commune: 'Plateau',
            permanent_link: 'https://224solutions.com/syndicat/access/abc123def456',
            access_token: 'abc123def456ghi789jkl012'
        };

        log('📋 Données du bureau:', 'blue');
        log(`   • Président: ${bureauData.president_name}`, 'blue');
        log(`   • Email: ${bureauData.president_email}`, 'blue');
        log(`   • Code: ${bureauData.bureau_code}`, 'blue');
        log(`   • Localisation: ${bureauData.prefecture} - ${bureauData.commune}`, 'blue');
        log(`   • Lien: ${bureauData.permanent_link}`, 'blue');

        log('\n✅ TESTS TERMINÉS', 'bold');
        log('================', 'green');
        log('\n💡 PROCHAINES ÉTAPES:', 'yellow');
        log('1. Configurez vos variables d\'email dans backend/.env', 'blue');
        log('2. Démarrez le backend: cd backend && npm run dev', 'blue');
        log('3. Testez depuis l\'interface PDG', 'blue');
        log('4. Vérifiez la réception des emails', 'blue');

    } catch (error) {
        log(`\n❌ ERREUR LORS DES TESTS: ${error.message}`, 'red');
        log('\n🔧 VÉRIFICATIONS:', 'yellow');
        log('• Le backend est-il démarré ? (npm run dev)', 'blue');
        log('• Les variables d\'environnement sont-elles configurées ?', 'blue');
        log('• Le port 3001 est-il accessible ?', 'blue');
    }
}

// Exécution des tests
if (require.main === module) {
    testEmailSystem();
}

module.exports = { testEmailSystem };
