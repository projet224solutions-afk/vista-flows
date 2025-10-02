/**
 * 🧪 TEST EMAIL BUREAU SYNDICAT - 224SOLUTIONS
 * Script pour tester l'envoi d'email au président
 */

// Simuler les données d'un bureau syndicat
const testBureauData = {
    president_name: "Jean Dupont",
    president_email: "test.president@gmail.com", // CHANGEZ CETTE ADRESSE PAR UNE VRAIE
    bureau_code: "SYN-2025-00001",
    prefecture: "Dakar",
    commune: "Plateau",
    permanent_link: "https://224solutions.com/syndicat/access/test123456789",
    access_token: "TEST_TOKEN_123456789"
};

console.log('🧪 TEST EMAIL BUREAU SYNDICAT');
console.log('================================');
console.log('📧 Données de test:', testBureauData);
console.log('');

// Test 1: Vérifier si le backend est accessible
async function testBackendHealth() {
    console.log('🔍 Test 1: Vérification du backend...');
    try {
        const response = await fetch('http://localhost:3001/api/health');
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Backend accessible:', data);
            return true;
        } else {
            console.log('❌ Backend non accessible - Status:', response.status);
            return false;
        }
    } catch (error) {
        console.log('❌ Backend non accessible - Erreur:', error.message);
        return false;
    }
}

// Test 2: Tester l'envoi d'email via le backend
async function testBackendEmail() {
    console.log('🔍 Test 2: Envoi email via backend...');
    try {
        const emailData = {
            to: testBureauData.president_email,
            subject: `🏛️ TEST - Création de votre Bureau Syndical - ${testBureauData.bureau_code}`,
            html: generateTestEmailHTML(),
            text: generateTestEmailText()
        };

        const response = await fetch('http://localhost:3001/api/email/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer demo-token'
            },
            body: JSON.stringify(emailData)
        });

        if (response.ok) {
            const result = await response.json();
            console.log('✅ Email envoyé via backend:', result);
            return true;
        } else {
            const error = await response.text();
            console.log('❌ Erreur backend email:', error);
            return false;
        }
    } catch (error) {
        console.log('❌ Erreur backend email:', error.message);
        return false;
    }
}

// Test 3: Tester l'ouverture du client email
async function testMailtoMethod() {
    console.log('🔍 Test 3: Ouverture client email...');
    try {
        const subject = `🏛️ TEST - Création de votre Bureau Syndical - ${testBureauData.bureau_code}`;
        const body = generateTestEmailText();
        
        const mailtoLink = `mailto:${testBureauData.president_email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        
        console.log('📧 Lien mailto généré:', mailtoLink);
        console.log('✅ Vous pouvez copier ce lien et le coller dans votre navigateur pour tester');
        
        return true;
    } catch (error) {
        console.log('❌ Erreur mailto:', error.message);
        return false;
    }
}

// Test 4: Afficher les informations à envoyer manuellement
function testManualMethod() {
    console.log('🔍 Test 4: Informations pour envoi manuel...');
    
    const emailContent = `
📧 EMAIL À ENVOYER MANUELLEMENT
================================

Destinataire: ${testBureauData.president_email}
Sujet: 🏛️ Création de votre Bureau Syndical - ${testBureauData.bureau_code}

Message:
${generateTestEmailText()}

🔗 LIEN IMPORTANT: ${testBureauData.permanent_link}
🔑 TOKEN: ${testBureauData.access_token}
    `;
    
    console.log(emailContent);
    console.log('✅ Copiez ce contenu et envoyez-le manuellement');
    
    return true;
}

// Génère le HTML de test
function generateTestEmailHTML() {
    return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>TEST - Bureau Syndical 224Solutions</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 8px; }
        .content { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .link-box { background: #10b981; color: white; padding: 15px; border-radius: 6px; text-align: center; }
        .link-button { background: white; color: #10b981; padding: 10px 20px; border-radius: 4px; text-decoration: none; font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🏛️ 224SOLUTIONS</h1>
        <h2>TEST - Bureau Syndical Créé</h2>
        <p>Bonjour ${testBureauData.president_name} !</p>
    </div>
    
    <div class="content">
        <p><strong>CECI EST UN EMAIL DE TEST</strong></p>
        
        <h3>📋 Informations du Bureau</h3>
        <ul>
            <li><strong>Code Bureau:</strong> ${testBureauData.bureau_code}</li>
            <li><strong>Préfecture:</strong> ${testBureauData.prefecture}</li>
            <li><strong>Commune:</strong> ${testBureauData.commune}</li>
            <li><strong>Président:</strong> ${testBureauData.president_name}</li>
        </ul>
        
        <div class="link-box">
            <h3>🔐 Accès à votre Interface</h3>
            <p>Lien de test :</p>
            <a href="${testBureauData.permanent_link}" class="link-button">
                🚀 Lien de Test
            </a>
        </div>
        
        <p><strong>🔑 Token de test :</strong> ${testBureauData.access_token}</p>
        
        <p><em>Si vous recevez cet email, le système fonctionne correctement !</em></p>
    </div>
</body>
</html>
    `;
}

// Génère le texte de test
function generateTestEmailText() {
    return `
🏛️ TEST - BUREAU SYNDICAL CRÉÉ - 224SOLUTIONS

Bonjour ${testBureauData.president_name},

CECI EST UN EMAIL DE TEST pour vérifier le système d'envoi.

📋 INFORMATIONS DU BUREAU:
• Code Bureau: ${testBureauData.bureau_code}
• Préfecture: ${testBureauData.prefecture}
• Commune: ${testBureauData.commune}
• Président: ${testBureauData.president_name}

🔐 ACCÈS À VOTRE INTERFACE:
Lien de test: ${testBureauData.permanent_link}

🔑 TOKEN DE TEST: ${testBureauData.access_token}

Si vous recevez cet email, le système fonctionne correctement !

224SOLUTIONS - Test du Système Email
    `;
}

// Exécuter tous les tests
async function runAllTests() {
    console.log('🚀 Démarrage des tests...\n');
    
    const backendHealth = await testBackendHealth();
    console.log('');
    
    if (backendHealth) {
        const backendEmail = await testBackendEmail();
        console.log('');
    }
    
    const mailtoTest = await testMailtoMethod();
    console.log('');
    
    const manualTest = testManualMethod();
    console.log('');
    
    console.log('🏁 Tests terminés !');
    console.log('');
    console.log('📝 INSTRUCTIONS:');
    console.log('1. Vérifiez votre boîte email:', testBureauData.president_email);
    console.log('2. Si pas d\'email reçu, utilisez le lien mailto ci-dessus');
    console.log('3. Ou copiez le contenu manuel et envoyez-le');
    console.log('');
    console.log('⚙️ CONFIGURATION BACKEND:');
    console.log('- Assurez-vous que le backend est démarré (npm run dev dans /backend)');
    console.log('- Configurez EMAIL_USER et EMAIL_PASSWORD dans backend/.env');
    console.log('- Utilisez un mot de passe d\'application Gmail si nécessaire');
}

// Lancer les tests
runAllTests().catch(console.error);
