-- Supprimer toutes les versions de generate_sequential_id
DROP FUNCTION IF EXISTS public.generate_sequential_id(VARCHAR);
DROP FUNCTION IF EXISTS public.generate_sequential_id(VARCHAR(3));
DROP FUNCTION IF EXISTS public.generate_sequential_id(TEXT);

-- Recréer la fonction avec un seul type TEXT
CREATE OR REPLACE FUNCTION public.generate_sequential_id(p_prefix TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next_number INTEGER;
  v_formatted_id TEXT;
BEGIN
  -- Incrémenter le compteur et récupérer la nouvelle valeur
  INSERT INTO public.id_counters (prefix, current_value)
  VALUES (p_prefix, 1)
  ON CONFLICT (prefix) 
  DO UPDATE SET 
    current_value = id_counters.current_value + 1,
    updated_at = NOW()
  RETURNING current_value INTO v_next_number;

  -- Formater l'ID : Préfixe + nombre sur 4 chiffres
  v_formatted_id := p_prefix || LPAD(v_next_number::TEXT, 4, '0');

  RETURN v_formatted_id;
END;
$$;