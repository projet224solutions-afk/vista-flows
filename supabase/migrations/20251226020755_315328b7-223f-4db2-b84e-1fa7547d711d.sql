-- Créer la fonction generate_role_based_custom_id si elle n'existe pas
CREATE OR REPLACE FUNCTION public.generate_role_based_custom_id(user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
  prefix text;
  seq_num integer;
  custom_id text;
BEGIN
  -- Récupérer le rôle de l'utilisateur
  SELECT role INTO user_role FROM public.profiles WHERE id = user_id;
  
  -- Définir le préfixe selon le rôle
  CASE user_role
    WHEN 'vendeur' THEN prefix := 'VND';
    WHEN 'livreur' THEN prefix := 'LVR';
    WHEN 'client' THEN prefix := 'CLT';
    WHEN 'admin' THEN prefix := 'ADM';
    ELSE prefix := 'USR';
  END CASE;
  
  -- Générer un numéro séquentiel basé sur le count existant
  SELECT COUNT(*) + 1 INTO seq_num 
  FROM public.profiles 
  WHERE custom_id LIKE prefix || '%';
  
  -- Créer l'ID personnalisé
  custom_id := prefix || LPAD(seq_num::text, 4, '0');
  
  RETURN custom_id;
END;
$$;