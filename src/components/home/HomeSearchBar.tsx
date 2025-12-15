/**
 * HOME SEARCH BAR - Ultra Professional Design
 * 224Solutions - Premium Search Experience
 * Floating design with subtle animations
 */

import { useState, useRef } from 'react';
import { Search, Filter, X, Mic } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface HomeSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onFilter?: () => void;
  showFilter?: boolean;
  className?: string;
}

export function HomeSearchBar({
  value,
  onChange,
  placeholder = 'Rechercher des produits, services...',
  onFilter,
  showFilter = true,
  className,
}: HomeSearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={cn('px-4 pb-4 md:px-6', className)}>
      <div
        className={cn(
          'relative flex items-center gap-2 transition-all duration-300',
          isFocused && 'scale-[1.01]'
        )}
      >
        {/* Search Input Container */}
        <div
          className={cn(
            'relative flex-1 rounded-2xl transition-all duration-300',
            'bg-muted/50 border border-border/50',
            'hover:bg-muted/70 hover:border-border',
            isFocused && 'bg-card border-primary/30 shadow-lg ring-2 ring-primary/10'
          )}
        >
          <Search
            className={cn(
              'absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 transition-colors duration-200',
              isFocused ? 'text-primary' : 'text-muted-foreground'
            )}
          />
          <Input
            ref={inputRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={cn(
              'pl-12 pr-12 h-12 md:h-14 rounded-2xl border-0 bg-transparent',
              'text-base placeholder:text-muted-foreground/70',
              'focus-visible:ring-0 focus-visible:ring-offset-0'
            )}
          />
          
          {/* Clear button */}
          {value && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onChange('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 h-7 w-7 rounded-full hover:bg-muted"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </Button>
          )}
        </div>

        {/* Filter Button */}
        {showFilter && (
          <Button
            variant="outline"
            size="icon"
            onClick={onFilter}
            className={cn(
              'h-12 w-12 md:h-14 md:w-14 rounded-2xl shrink-0',
              'border-border/50 bg-card hover:bg-primary hover:text-primary-foreground',
              'transition-all duration-300 hover:scale-105 hover:shadow-lg'
            )}
          >
            <Filter className="w-5 h-5" />
          </Button>
        )}
      </div>
    </div>
  );
}

export default HomeSearchBar;
