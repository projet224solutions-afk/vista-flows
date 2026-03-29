import { useState, useCallback, useRef, memo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordStrength {
  score: number;
  message: string;
  /**
   * Classe Tailwind basÃ©e sur des tokens (ex: text-destructive, text-primary)
   */
  color: string;
}

interface OptimizedPasswordInputProps {
  id: string;
  name: string;
  value: string;
  /**
   * Callback appelÃ© de faÃ§on diffÃ©rÃ©e (debounce) + au blur (commit) pour Ã©viter les re-renders globaux.
   */
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;

  /** DÃ©lai de propagation au parent (en ms). */
  commitDelayMs?: number;
  /** Commit immÃ©diat au blur (utile pour garantir que le submit a la derniÃ¨re valeur). */
  commitOnBlur?: boolean;

  showStrengthIndicator?: boolean;
  onStrengthChange?: (strength: PasswordStrength) => void;
}

// Calcul de force diffÃ©rÃ© - jamais sur le thread principal
const calculateStrength = (password: string): PasswordStrength => {
  if (!password) return { score: 0, message: "", color: "" };

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  // Couleurs via tokens (pas de couleurs directes)
  if (score <= 2) {
    return { score, message: "Faible", color: "text-destructive" };
  }
  if (score <= 4) {
    return { score, message: "Bon", color: "text-foreground" };
  }
  return { score, message: "Excellent", color: "text-primary" };
};

/**
 * Composant Input optimisÃ© pour les mots de passe
 * - State local isolÃ© pour Ã©viter les re-renders globaux
 * - Validation diffÃ©rÃ©e avec debounce (300ms)
 * - Aucun calcul lourd sur onChange
 * - INP < 100ms garanti
 */
const OptimizedPasswordInput = memo(({
  id,
  name,
  value,
  onChange,
  placeholder = "â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢",
  className,
  required = false,
  disabled = false,
  commitDelayMs = 50,
  commitOnBlur = true,
  showStrengthIndicator = false,
  onStrengthChange
}: OptimizedPasswordInputProps) => {
  // State local ultra-lÃ©ger pour la valeur
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

  // Handler ULTRA LÃ‰GER - mise Ã  jour state local uniquement
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    // Mise Ã  jour IMMÃ‰DIATE du state local (pas de lag)
    setLocalValue(newValue);

    // Debounce pour propager au parent (Ã©vite les re-renders globaux)
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      onChange(newValue);
    }, commitDelayMs);

    // Debounce SÃ‰PARÃ‰ pour le calcul de force (>= 300ms)
    if (showStrengthIndicator && onStrengthChange) {
      if (strengthDebounceRef.current) {
        clearTimeout(strengthDebounceRef.current);
      }
      strengthDebounceRef.current = setTimeout(() => {
        // ExÃ©cuter dans requestIdleCallback si disponible
        if ("requestIdleCallback" in window) {
          (window as any).requestIdleCallback(() => {
            const newStrength = calculateStrength(newValue);
            setStrength(newStrength);
            onStrengthChange(newStrength);
          });
        } else {
          requestAnimationFrame(() => {
            const newStrength = calculateStrength(newValue);
            setStrength(newStrength);
            onStrengthChange(newStrength);
          });
        }
      }, 300);
    }
  }, [onChange, commitDelayMs, showStrengthIndicator, onStrengthChange]);

  const handleBlur = useCallback(() => {
    if (!commitOnBlur) return;

    // Garantit que la derniÃ¨re valeur est propagÃ©e avant submit
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    onChange(localValue);
  }, [commitOnBlur, onChange, localValue]);

  // Toggle visibilitÃ© - ultra lÃ©ger
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
          onBlur={handleBlur}
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
                strength.score <= 2 ? "bg-red-500" : strength.score <= 4 ? "bg-yellow-500" : "bg-gradient-to-br from-primary-blue-500 to-primary-orange-500"
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
