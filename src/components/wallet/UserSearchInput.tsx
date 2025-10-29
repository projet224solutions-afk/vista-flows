import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, User, Check, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface UserSearchResult {
  public_id: string;
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
  label = "ID du destinataire",
  placeholder = "Ex: USR0001"
}: UserSearchInputProps) => {
  const [searching, setSearching] = useState(false);
  const [userInfo, setUserInfo] = useState<UserSearchResult | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [availableUsers, setAvailableUsers] = useState<UserSearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Charger tous les utilisateurs disponibles au montage
  useEffect(() => {
    const loadAvailableUsers = async () => {
      try {
        const { data: currentUser } = await supabase.auth.getUser();
        if (!currentUser.user) return;

        const { data, error } = await supabase
          .from('profiles')
          .select('id, public_id, email, first_name, last_name, phone')
          .neq('id', currentUser.user.id) // Exclure l'utilisateur actuel
          .not('public_id', 'is', null); // Uniquement les utilisateurs avec public_id

        if (!error && data) {
          // Formater les données pour correspondre à UserSearchResult
          const formattedUsers = data.map(profile => ({
            public_id: profile.public_id || '',
            user_id: profile.id,
            email: profile.email,
            first_name: profile.first_name,
            last_name: profile.last_name,
            phone: profile.phone
          }));
          setAvailableUsers(formattedUsers);
        }
      } catch (error) {
        console.error('❌ Erreur chargement utilisateurs:', error);
      }
    };

    loadAvailableUsers();
  }, []);

  const searchUser = async (publicId: string) => {
    if (!publicId || publicId.length < 3) {
      setUserInfo(null);
      setSearchError(null);
      return;
    }

    setSearching(true);
    setSearchError(null);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, public_id, email, first_name, last_name, phone')
        .ilike('public_id', `%${publicId.toUpperCase()}%`)
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          setSearchError('Aucun utilisateur trouvé avec cet ID');
        } else {
          throw error;
        }
        setUserInfo(null);
      } else {
        // Formater les données pour correspondre à UserSearchResult
        const formattedUser = {
          public_id: data.public_id || '',
          user_id: data.id,
          email: data.email,
          first_name: data.first_name,
          last_name: data.last_name,
          phone: data.phone
        };
        setUserInfo(formattedUser);
        setSearchError(null);
        if (onUserSelect && data.id) {
          onUserSelect(data.id);
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

  const filteredUsers = availableUsers.filter(user =>
    user.public_id?.toLowerCase().includes(value.toLowerCase()) ||
    user.first_name?.toLowerCase().includes(value.toLowerCase()) ||
    user.last_name?.toLowerCase().includes(value.toLowerCase()) ||
    user.email?.toLowerCase().includes(value.toLowerCase())
  );

  const selectUser = (user: UserSearchResult) => {
    onChange(user.public_id);
    setUserInfo(user);
    setSearchError(null);
    setShowSuggestions(false);
    if (onUserSelect && user.user_id) {
      onUserSelect(user.user_id);
    }
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
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          className="pl-10"
        />
        {searching && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
          </div>
        )}
      </div>

      {/* Suggestions d'utilisateurs pendant la saisie */}
      {showSuggestions && value && filteredUsers.length > 0 && (
        <ScrollArea className="h-[200px] border rounded-lg bg-background">
          <div className="p-2 space-y-1">
            {filteredUsers.map((user) => (
              <button
                key={user.user_id}
                onClick={() => selectUser(user)}
                className="w-full p-2 hover:bg-muted rounded-lg text-left transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {getUserDisplayName(user)}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <Badge variant="outline" className="text-xs font-mono ml-2 flex-shrink-0">
                    {user.public_id}
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      )}

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
                {userInfo.public_id}
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

      {/* Liste des utilisateurs disponibles si aucune recherche */}
      {!value && availableUsers.length > 0 && (
        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium text-muted-foreground">
              Utilisateurs disponibles ({availableUsers.length})
            </p>
          </div>
          <ScrollArea className="h-[150px]">
            <div className="space-y-2">
              {availableUsers.map((user) => (
                <button
                  key={user.user_id}
                  onClick={() => selectUser(user)}
                  className="w-full p-2 hover:bg-background rounded text-left transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {getUserDisplayName(user)}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <Badge variant="outline" className="text-xs font-mono ml-2 flex-shrink-0">
                      {user.public_id}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
};
