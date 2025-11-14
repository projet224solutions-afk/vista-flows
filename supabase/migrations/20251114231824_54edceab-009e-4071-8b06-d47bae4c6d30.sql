-- Fix the handle_new_user_complete function to use correct column name
CREATE OR REPLACE FUNCTION public.handle_new_user_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  custom_id TEXT;
  card_number TEXT;
BEGIN
  -- Generate custom user ID
  custom_id := 'USR' || LPAD(NEXTVAL('user_id_seq')::TEXT, 6, '0');

  -- Insert into profiles
  INSERT INTO public.profiles (
    id,
    email,
    first_name,
    last_name,
    phone,
    role,
    custom_id,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'phone', NEW.phone, ''),
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'user'),
    custom_id,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  -- Insert into wallets
  INSERT INTO public.wallets (
    user_id,
    balance,
    currency,
    wallet_status,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    0,
    'XOF',
    'active',
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Generate card number
  card_number := '5224' || LPAD((RANDOM() * 999999999999)::BIGINT::TEXT, 12, '0');

  -- Insert into virtual_cards with correct column name
  INSERT INTO public.virtual_cards (
    user_id,
    card_number,
    holder_name,
    expiry_date,
    cvv,
    status,
    daily_limit,
    monthly_limit
  )
  VALUES (
    NEW.id,
    card_number,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', 'Client') || ' ' || COALESCE(NEW.raw_user_meta_data ->> 'last_name', custom_id),
    TO_CHAR((NOW() + INTERVAL '3 years'), 'MM/YY'),
    LPAD((RANDOM() * 900 + 100)::INTEGER::TEXT, 3, '0'),
    'active',
    500000,
    2000000
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Error in handle_new_user_complete: %', SQLERRM;
  RETURN NEW;
END;
$$;