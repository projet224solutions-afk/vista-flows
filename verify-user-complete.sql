-- Vérification complète pour comptedevideoai224gn@gmail.com
-- Doit afficher 4 paiements, 4 commandes, 4 wallets

SELECT 
  p.email,
  COUNT(DISTINCT st.id) as total_paiements,
  COUNT(DISTINCT o.id) as total_commandes,
  COUNT(DISTINCT wt.id) as total_wallets,
  CASE 
    WHEN COUNT(DISTINCT st.id) = COUNT(DISTINCT o.id) 
     AND COUNT(DISTINCT st.id) = COUNT(DISTINCT wt.id)
    THEN '✅ 100% OK'
    ELSE '⚠️ INCOMPLET'
  END as statut
FROM profiles p
JOIN stripe_transactions st ON st.buyer_id = p.id
LEFT JOIN orders o ON o.metadata->>'stripe_payment_intent_id' = st.stripe_payment_intent_id
LEFT JOIN wallet_transactions wt ON wt.metadata->>'stripe_payment_intent_id' = st.stripe_payment_intent_id
WHERE p.email = 'comptedevideoai224gn@gmail.com'
GROUP BY p.email;

-- Détail de tous les paiements
SELECT 
  st.stripe_payment_intent_id,
  st.amount / 100.0 as montant_fcfa,
  st.status,
  CASE WHEN o.id IS NOT NULL THEN '✅' ELSE '❌' END as commande,
  CASE WHEN wt.id IS NOT NULL THEN '✅' ELSE '❌' END as wallet,
  o.order_number,
  st.created_at
FROM profiles p
JOIN stripe_transactions st ON st.buyer_id = p.id
LEFT JOIN orders o ON o.metadata->>'stripe_payment_intent_id' = st.stripe_payment_intent_id
LEFT JOIN wallet_transactions wt ON wt.metadata->>'stripe_payment_intent_id' = st.stripe_payment_intent_id
WHERE p.email = 'comptedevideoai224gn@gmail.com'
ORDER BY st.created_at DESC;
