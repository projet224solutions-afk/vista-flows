-- Supprimer et recréer la fonction avec les bonnes références
DROP FUNCTION IF EXISTS public.generate_role_based_custom_id(uuid);

CREATE OR REPLACE FUNCTION public.generate_role_based_custom_id(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_role text;
  v_prefix text;
  v_seq_num integer;
  v_custom_id text;
BEGIN
  -- Récupérer le rôle de l'utilisateur
  SELECT p.role INTO v_user_role FROM public.profiles p WHERE p.id = p_user_id;
  
  -- Définir le préfixe selon le rôle
  CASE v_user_role
    WHEN 'vendeur' THEN v_prefix := 'VND';
    WHEN 'livreur' THEN v_prefix := 'LVR';
    WHEN 'client' THEN v_prefix := 'CLT';
    WHEN 'admin' THEN v_prefix := 'ADM';
    ELSE v_prefix := 'USR';
  END CASE;
  
  -- Générer un numéro séquentiel basé sur le count existant
  SELECT COUNT(*) + 1 INTO v_seq_num 
  FROM public.profiles p 
  WHERE p.custom_id LIKE v_prefix || '%';
  
  -- Créer l'ID personnalisé
  v_custom_id := v_prefix || LPAD(v_seq_num::text, 4, '0');
  
  RETURN v_custom_id;
END;
$$;