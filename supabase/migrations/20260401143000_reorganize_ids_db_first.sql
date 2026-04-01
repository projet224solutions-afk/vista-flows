-- =====================================================
-- DB-FIRST ID REORGANIZATION + DUPLICATE REPAIR
-- - Reorganizes IDs from database state (not from frontend loops)
-- - Repairs duplicates and missing user_ids rows
-- - Keeps profiles.public_id / profiles.custom_id / user_ids.custom_id synced
-- =====================================================

CREATE OR REPLACE FUNCTION public.identity_role_to_prefix(p_role TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE LOWER(BTRIM(COALESCE(p_role, '')))
    WHEN 'vendeur' THEN 'VND'
    WHEN 'vendor' THEN 'VND'
    WHEN 'client' THEN 'CLI'
    WHEN 'agent' THEN 'AGT'
    WHEN 'pdg' THEN 'PDG'
    WHEN 'livreur' THEN 'LIV'
    WHEN 'taxi' THEN 'TAX'
    WHEN 'driver' THEN 'DRV'
    WHEN 'chauffeur' THEN 'DRV'
    WHEN 'transitaire' THEN 'TRS'
    WHEN 'bureau' THEN 'BST'
    WHEN 'syndicat' THEN 'BST'
    WHEN 'worker' THEN 'WRK'
    ELSE NULL
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.reorganize_user_ids_from_db(p_role_type TEXT DEFAULT NULL)
RETURNS TABLE (
  role_type TEXT,
  user_id UUID,
  old_id TEXT,
  new_id TEXT,
  action TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_prefix TEXT;
  v_has_id_sequences BOOLEAN;
BEGIN
  v_target_prefix := public.identity_role_to_prefix(p_role_type);

  IF p_role_type IS NOT NULL AND v_target_prefix IS NULL THEN
    RAISE EXCEPTION 'Rôle invalide pour réorganisation: %', p_role_type;
  END IF;

  -- Avoid concurrent reorganizations that could create conflicting remaps.
  PERFORM pg_advisory_xact_lock(hashtext('reorganize_user_ids_from_db_v1'));

  CREATE TEMP TABLE tmp_id_map (
    role_type TEXT NOT NULL,
    prefix TEXT NOT NULL,
    user_id UUID NOT NULL,
    old_id TEXT,
    new_id TEXT NOT NULL,
    PRIMARY KEY (user_id)
  ) ON COMMIT DROP;

  -- Normalize and trim before building the mapping table.
  UPDATE public.profiles
  SET public_id = UPPER(BTRIM(public_id))
  WHERE public_id IS NOT NULL
    AND public_id <> UPPER(BTRIM(public_id));

  UPDATE public.profiles
  SET custom_id = UPPER(BTRIM(custom_id))
  WHERE custom_id IS NOT NULL
    AND custom_id <> UPPER(BTRIM(custom_id));

  UPDATE public.user_ids
  SET custom_id = UPPER(BTRIM(custom_id))
  WHERE custom_id <> UPPER(BTRIM(custom_id));

  -- Build deterministic sequence per role prefix from database users.
  INSERT INTO tmp_id_map (role_type, prefix, user_id, old_id, new_id)
  SELECT
    LOWER(BTRIM(p.role::TEXT)) AS role_type,
    public.identity_role_to_prefix(p.role::TEXT) AS prefix,
    p.id AS user_id,
    p.public_id AS old_id,
    public.identity_role_to_prefix(p.role::TEXT)
      || LPAD(
        ROW_NUMBER() OVER (
          PARTITION BY public.identity_role_to_prefix(p.role::TEXT)
          ORDER BY p.created_at NULLS LAST, p.id
        )::TEXT,
        4,
        '0'
      ) AS new_id
  FROM public.profiles p
  WHERE public.identity_role_to_prefix(p.role::TEXT) IS NOT NULL
    AND (
      v_target_prefix IS NULL
      OR public.identity_role_to_prefix(p.role::TEXT) = v_target_prefix
    );

  -- Keep only one user_ids row per user_id before remapping.
  DELETE FROM public.user_ids u
  USING (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at NULLS LAST, id) AS rn
    FROM public.user_ids
  ) d
  WHERE u.id = d.id
    AND d.rn > 1;

  -- Ensure every target profile has one user_ids row.
  INSERT INTO public.user_ids (user_id, custom_id, created_at)
  SELECT m.user_id, COALESCE(NULLIF(m.old_id, ''), m.new_id), NOW()
  FROM tmp_id_map m
  LEFT JOIN public.user_ids ui ON ui.user_id = m.user_id
  WHERE ui.user_id IS NULL
  ON CONFLICT (user_id) DO NOTHING;

  -- Stage non-target rows that would collide with remapped values.
  UPDATE public.profiles p
  SET public_id = 'Q' || UPPER(SUBSTRING(MD5(p.id::TEXT) FROM 1 FOR 6)),
      custom_id = 'Q' || UPPER(SUBSTRING(MD5(p.id::TEXT) FROM 1 FOR 6))
  WHERE p.id NOT IN (SELECT user_id FROM tmp_id_map)
    AND p.public_id IN (SELECT new_id FROM tmp_id_map);

  UPDATE public.user_ids ui
  SET custom_id = 'W' || UPPER(SUBSTRING(MD5(ui.user_id::TEXT) FROM 1 FOR 6))
  WHERE ui.user_id NOT IN (SELECT user_id FROM tmp_id_map)
    AND ui.custom_id IN (SELECT new_id FROM tmp_id_map);

  UPDATE public.vendors v
  SET vendor_code = 'X' || UPPER(SUBSTRING(MD5(v.user_id::TEXT) FROM 1 FOR 6))
  WHERE v.user_id NOT IN (SELECT user_id FROM tmp_id_map)
    AND v.vendor_code IN (SELECT new_id FROM tmp_id_map WHERE prefix = 'VND');

  -- Stage current values to avoid unique conflicts during final remap.
  UPDATE public.profiles p
  SET public_id = 'P' || UPPER(SUBSTRING(MD5(p.id::TEXT) FROM 1 FOR 6)),
      custom_id = 'P' || UPPER(SUBSTRING(MD5(p.id::TEXT) FROM 1 FOR 6))
  FROM tmp_id_map m
  WHERE p.id = m.user_id
    AND (p.public_id IS DISTINCT FROM m.new_id OR p.custom_id IS DISTINCT FROM m.new_id);

  UPDATE public.user_ids ui
  SET custom_id = 'U' || UPPER(SUBSTRING(MD5(ui.user_id::TEXT) FROM 1 FOR 6))
  FROM tmp_id_map m
  WHERE ui.user_id = m.user_id
    AND ui.custom_id IS DISTINCT FROM m.new_id;

  UPDATE public.vendors v
  SET vendor_code = 'V' || UPPER(SUBSTRING(MD5(v.user_id::TEXT) FROM 1 FOR 6))
  FROM tmp_id_map m
  WHERE v.user_id = m.user_id
    AND m.prefix = 'VND'
    AND v.vendor_code IS DISTINCT FROM m.new_id;

  -- Apply final remapped IDs.
  UPDATE public.profiles p
  SET public_id = m.new_id,
      custom_id = m.new_id
  FROM tmp_id_map m
  WHERE p.id = m.user_id;

  UPDATE public.user_ids ui
  SET custom_id = m.new_id
  FROM tmp_id_map m
  WHERE ui.user_id = m.user_id;

  UPDATE public.vendors v
  SET vendor_code = m.new_id
  FROM tmp_id_map m
  WHERE v.user_id = m.user_id
    AND m.prefix = 'VND';

  -- Keep sequence counters aligned with the highest assigned number.
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'id_sequences'
  ) INTO v_has_id_sequences;

  IF v_has_id_sequences THEN
    INSERT INTO public.id_sequences (prefix, last_number)
    SELECT m.prefix, MAX(CAST(RIGHT(m.new_id, 4) AS INTEGER))
    FROM tmp_id_map m
    GROUP BY m.prefix
    ON CONFLICT (prefix)
    DO UPDATE SET
      last_number = GREATEST(public.id_sequences.last_number, EXCLUDED.last_number),
      updated_at = NOW();
  END IF;

  RETURN QUERY
  SELECT m.role_type,
         m.user_id,
         m.old_id,
         m.new_id,
         CASE WHEN COALESCE(m.old_id, '') = m.new_id THEN 'unchanged' ELSE 'reorganized' END AS action
  FROM tmp_id_map m
  ORDER BY m.prefix, m.new_id;
END;
$$;

COMMENT ON FUNCTION public.identity_role_to_prefix(TEXT) IS 'Mappe un rôle utilisateur vers le préfixe d''ID standard.';
COMMENT ON FUNCTION public.reorganize_user_ids_from_db(TEXT) IS 'Réorganise les IDs directement depuis la base, corrige les doublons user_ids et resynchronise profiles/user_ids/vendors.';