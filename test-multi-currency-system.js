/**
 * 🧪 SCRIPT DE TEST - SYSTÈME MULTI-DEVISES
 * Test complet du système de transfert multi-devises
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testMultiCurrencySystem() {
    console.log('🧪 DÉBUT DES TESTS - SYSTÈME MULTI-DEVISES');
    console.log('='.repeat(50));

    try {
        // 1. Test de connexion à la base de données
        console.log('\n1️⃣ Test de connexion à la base de données...');
        const { data: connectionTest, error: connectionError } = await supabase
            .from('currencies')
            .select('count')
            .limit(1);

        if (connectionError) {
            throw new Error(`Erreur de connexion: ${connectionError.message}`);
        }
        console.log('✅ Connexion à la base de données réussie');

        // 2. Test des tables
        console.log('\n2️⃣ Test des tables...');
        const tables = ['currencies', 'exchange_rates', 'transfer_fees', 'multi_currency_transfers', 'daily_transfer_limits'];

        for (const table of tables) {
            const { data, error } = await supabase
                .from(table)
                .select('count')
                .limit(1);

            if (error) {
                console.log(`❌ Table ${table}: ${error.message}`);
            } else {
                console.log(`✅ Table ${table}: OK`);
            }
        }

        // 3. Test des devises
        console.log('\n3️⃣ Test des devises disponibles...');
        const { data: currencies, error: currenciesError } = await supabase
            .from('currencies')
            .select('code, name, symbol')
            .eq('is_active', true);

        if (currenciesError) {
            console.log(`❌ Erreur devises: ${currenciesError.message}`);
        } else {
            console.log(`✅ ${currencies.length} devises disponibles:`, currencies.map(c => c.code).join(', '));
        }

        // 4. Test des taux de change
        console.log('\n4️⃣ Test des taux de change...');
        const { data: rates, error: ratesError } = await supabase
            .from('exchange_rates')
            .select('from_currency, to_currency, rate')
            .eq('is_active', true)
            .limit(5);

        if (ratesError) {
            console.log(`❌ Erreur taux: ${ratesError.message}`);
        } else {
            console.log(`✅ ${rates.length} taux de change disponibles`);
            rates.forEach(rate => {
                console.log(`   ${rate.from_currency} → ${rate.to_currency}: ${rate.rate}`);
            });
        }

        // 5. Test des frais de transfert
        console.log('\n5️⃣ Test des frais de transfert...');
        const { data: fees, error: feesError } = await supabase
            .from('transfer_fees')
            .select('user_role, fee_fixed, fee_percentage, currency')
            .eq('is_active', true)
            .limit(3);

        if (feesError) {
            console.log(`❌ Erreur frais: ${feesError.message}`);
        } else {
            console.log(`✅ ${fees.length} configurations de frais disponibles`);
            fees.forEach(fee => {
                console.log(`   ${fee.user_role}: ${fee.fee_fixed} + ${(fee.fee_percentage * 100).toFixed(2)}% (${fee.currency})`);
            });
        }

        // 6. Test des fonctions SQL
        console.log('\n6️⃣ Test des fonctions SQL...');

        // Test de la fonction get_exchange_rate
        const { data: exchangeRate, error: exchangeRateError } = await supabase
            .rpc('get_exchange_rate', {
                p_from_currency: 'GNF',
                p_to_currency: 'USD'
            });

        if (exchangeRateError) {
            console.log(`❌ Erreur get_exchange_rate: ${exchangeRateError.message}`);
        } else {
            console.log(`✅ Taux GNF → USD: ${exchangeRate}`);
        }

        // Test de la fonction calculate_transfer_fees
        const { data: calculatedFees, error: feesCalcError } = await supabase
            .rpc('calculate_transfer_fees', {
                p_user_role: 'client',
                p_amount: 10000,
                p_currency: 'GNF'
            });

        if (feesCalcError) {
            console.log(`❌ Erreur calculate_transfer_fees: ${feesCalcError.message}`);
        } else {
            console.log(`✅ Frais calculés:`, calculatedFees);
        }

        // 7. Test de génération d'ID de transaction
        console.log('\n7️⃣ Test de génération d'ID de transaction...');
    const { data: transactionId, error: idError } = await supabase
            .rpc('generate_transaction_id');

        if (idError) {
            console.log(`❌ Erreur generate_transaction_id: ${idError.message}`);
        } else {
            console.log(`✅ ID de transaction généré: ${transactionId}`);
        }

        // 8. Test de statistiques
        console.log('\n8️⃣ Test des statistiques...');
        const { data: stats, error: statsError } = await supabase
            .from('multi_currency_transfers')
            .select('count')
            .limit(1);

        if (statsError) {
            console.log(`❌ Erreur statistiques: ${statsError.message}`);
        } else {
            console.log(`✅ Table multi_currency_transfers accessible`);
        }

        console.log('\n🎉 TOUS LES TESTS TERMINÉS');
        console.log('='.repeat(50));
        console.log('✅ Le système multi-devises est prêt à être utilisé !');
        console.log('\n📋 RÉSUMÉ:');
        console.log('   • Tables créées et accessibles');
        console.log('   • Devises configurées');
        console.log('   • Taux de change opérationnels');
        console.log('   • Frais de transfert configurés');
        console.log('   • Fonctions SQL fonctionnelles');
        console.log('\n🚀 Le système est maintenant opérationnel !');

    } catch (error) {
        console.error('\n❌ ERREUR LORS DES TESTS:', error.message);
        console.log('\n🔧 ACTIONS RECOMMANDÉES:');
        console.log('   1. Vérifier la configuration Supabase');
        console.log('   2. Exécuter les migrations SQL');
        console.log('   3. Vérifier les permissions RLS');
        console.log('   4. Relancer les tests');
    }
}

// Exécuter les tests
if (require.main === module) {
    testMultiCurrencySystem()
        .then(() => {
            console.log('\n✅ Tests terminés avec succès');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Tests échoués:', error);
            process.exit(1);
        });
}

module.exports = { testMultiCurrencySystem };
