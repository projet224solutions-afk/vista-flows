-- Recreate the trigger for automatic user setup
DROP TRIGGER IF EXISTS on_auth_user_created_complete ON auth.users;

CREATE TRIGGER on_auth_user_created_complete
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_complete();