import { Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onFilter?: () => void;
  showFilter?: boolean;
}

export default function SearchBar({ 
  value, 
  onChange, 
  placeholder = "Rechercher des produits, services...",
  onFilter,
  showFilter = false
}: SearchBarProps) {
  return (
    <div className="relative flex items-center gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pl-10 pr-4 h-11"
        />
      </div>
      
      {showFilter && (
        <Button 
          variant="outline" 
          size="icon"
          onClick={onFilter}
          className="h-11 w-11 shrink-0"
        >
          <Filter className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}