-- Découvrir les valeurs valides pour les enums de la table orders
SELECT 
  t.typname AS enum_name,
  e.enumlabel AS enum_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
WHERE t.typname IN ('order_status', 'payment_status', 'payment_method', 'order_source')
ORDER BY t.typname, e.enumsortorder;
