import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, User, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UserSearchResult {
  custom_id: string;
  user_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
}

interface UserSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onUserSelect?: (userId: string) => void;
  label?: string;
  placeholder?: string;
}

export const UserSearchInput = ({
  value,
  onChange,
  onUserSelect,
  label = "Code du destinataire",
  placeholder = "Ex: ABC1234"
}: UserSearchInputProps) => {
  const [searching, setSearching] = useState(false);
  const [userInfo, setUserInfo] = useState<UserSearchResult | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const searchUser = async (customId: string) => {
    if (!customId || customId.length < 3) {
      setUserInfo(null);
      setSearchError(null);
      return;
    }

    setSearching(true);
    setSearchError(null);

    try {
      const { data, error } = await supabase
        .from('user_search_view')
        .select('*')
        .ilike('custom_id', `%${customId.toUpperCase()}%`)
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          setSearchError('Aucun utilisateur trouvé avec ce code');
        } else {
          throw error;
        }
        setUserInfo(null);
      } else {
        setUserInfo(data);
        setSearchError(null);
        if (onUserSelect && data.user_id) {
          onUserSelect(data.user_id);
        }
      }
    } catch (error) {
      console.error('❌ Erreur recherche utilisateur:', error);
      setSearchError('Erreur lors de la recherche');
      setUserInfo(null);
    } finally {
      setSearching(false);
    }
  };

  const handleInputChange = (newValue: string) => {
    onChange(newValue);
    
    // Déclencher la recherche après un délai (debounce)
    if (newValue.length >= 3) {
      const timeoutId = setTimeout(() => {
        searchUser(newValue);
      }, 500);
      
      return () => clearTimeout(timeoutId);
    } else {
      setUserInfo(null);
      setSearchError(null);
    }
  };

  const getUserDisplayName = (user: UserSearchResult) => {
    if (user.first_name || user.last_name) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim();
    }
    return user.email || user.phone || 'Utilisateur';
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="user-search">{label}</Label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          id="user-search"
          placeholder={placeholder}
          value={value}
          onChange={(e) => handleInputChange(e.target.value.toUpperCase())}
          className="pl-10"
        />
        {searching && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
          </div>
        )}
      </div>

      {/* Résultat de la recherche */}
      {userInfo && (
        <div className="mt-2 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
            <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-green-900 dark:text-green-100">
              {getUserDisplayName(userInfo)}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs font-mono">
                {userInfo.custom_id}
              </Badge>
              {userInfo.phone && (
                <span className="text-xs text-muted-foreground">{userInfo.phone}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Erreur de recherche */}
      {searchError && (
        <div className="mt-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">
            {searchError}
          </p>
        </div>
      )}
    </div>
  );
};
