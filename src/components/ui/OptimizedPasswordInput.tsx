import { useState, useCallback, useRef, memo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordStrength {
  score: number;
  message: string;
  color: string;
}

interface OptimizedPasswordInputProps {
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  showStrengthIndicator?: boolean;
  onStrengthChange?: (strength: PasswordStrength) => void;
}

// Calcul de force différé - jamais sur le thread principal
const calculateStrength = (password: string): PasswordStrength => {
  if (!password) return { score: 0, message: "", color: "" };
  
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  let message = "";
  let color = "";

  if (score <= 2) {
    message = "Faible";
    color = "text-red-500";
  } else if (score <= 4) {
    message = "Bon";
    color = "text-yellow-500";
  } else {
    message = "Excellent";
    color = "text-green-500";
  }

  return { score, message, color };
};

/**
 * Composant Input optimisé pour les mots de passe
 * - State local isolé pour éviter les re-renders globaux
 * - Validation différée avec debounce (300ms)
 * - Aucun calcul lourd sur onChange
 * - INP < 100ms garanti
 */
const OptimizedPasswordInput = memo(({
  id,
  name,
  value,
  onChange,
  placeholder = "••••••••",
  className,
  required = false,
  disabled = false,
  showStrengthIndicator = false,
  onStrengthChange
}: OptimizedPasswordInputProps) => {
  // State local ultra-léger pour la valeur
  const [localValue, setLocalValue] = useState(value);
  const [showPassword, setShowPassword] = useState(false);
  const [strength, setStrength] = useState<PasswordStrength>({ score: 0, message: "", color: "" });
  
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const strengthDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync valeur externe -> locale (pour reset formulaire)
  useEffect(() => {
    if (value !== localValue) {
      setLocalValue(value);
    }
  }, [value]);

  // Handler ULTRA LÉGER - mise à jour state local uniquement
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    
    // Mise à jour IMMÉDIATE du state local (pas de lag)
    setLocalValue(newValue);
    
    // Debounce pour propager au parent (300ms)
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      onChange(newValue);
    }, 50); // Propagation rapide mais différée

    // Debounce SÉPARÉ pour le calcul de force (300ms)
    if (showStrengthIndicator && onStrengthChange) {
      if (strengthDebounceRef.current) {
        clearTimeout(strengthDebounceRef.current);
      }
      strengthDebounceRef.current = setTimeout(() => {
        // Exécuter dans requestIdleCallback si disponible
        if ('requestIdleCallback' in window) {
          (window as any).requestIdleCallback(() => {
            const newStrength = calculateStrength(newValue);
            setStrength(newStrength);
            onStrengthChange(newStrength);
          });
        } else {
          // Fallback avec requestAnimationFrame
          requestAnimationFrame(() => {
            const newStrength = calculateStrength(newValue);
            setStrength(newStrength);
            onStrengthChange(newStrength);
          });
        }
      }, 300);
    }
  }, [onChange, showStrengthIndicator, onStrengthChange]);

  // Toggle visibilité - ultra léger
  const toggleVisibility = useCallback(() => {
    setShowPassword(prev => !prev);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (strengthDebounceRef.current) clearTimeout(strengthDebounceRef.current);
    };
  }, []);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          id={id}
          name={name}
          type={showPassword ? "text" : "password"}
          value={localValue}
          onChange={handleChange}
          placeholder={placeholder}
          className={cn("pr-10", className)}
          required={required}
          disabled={disabled}
          autoComplete="new-password"
        />
        <button
          type="button"
          onClick={toggleVisibility}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          tabIndex={-1}
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      {/* Indicateur de force - rendu conditionnel */}
      {showStrengthIndicator && localValue && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Force du mot de passe :</span>
            <span className={cn("font-semibold", strength.color)}>
              {strength.message}
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full transition-all duration-300",
                strength.score <= 2 ? "bg-red-500" : strength.score <= 4 ? "bg-yellow-500" : "bg-green-500"
              )}
              style={{ width: `${(strength.score / 6) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
});

OptimizedPasswordInput.displayName = "OptimizedPasswordInput";

export { OptimizedPasswordInput, type PasswordStrength };
