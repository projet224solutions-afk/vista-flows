import { Badge } from '@/components/ui/badge';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface AgentIdDisplayProps {
  agentCode: string;
  agentName?: string;
  className?: string;
  layout?: 'horizontal' | 'vertical';
}

export function AgentIdDisplay({ 
  agentCode, 
  agentName,
  className = '', 
  layout = 'horizontal'
}: AgentIdDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(agentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (layout === 'vertical') {
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        {agentName && <span className="font-semibold text-foreground">{agentName}</span>}
        <Badge 
          variant="secondary" 
          className="w-fit cursor-pointer hover:bg-secondary/80 transition-colors"
          onClick={handleCopy}
        >
          <span className="font-mono">{agentCode}</span>
          {copied ? (
            <Check className="w-3 h-3 ml-2 text-green-600" />
          ) : (
            <Copy className="w-3 h-3 ml-2" />
          )}
        </Badge>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge 
        variant="secondary" 
        className="cursor-pointer hover:bg-secondary/80 transition-colors"
        onClick={handleCopy}
      >
        <span className="font-mono text-xs">{agentCode}</span>
        {copied ? (
          <Check className="w-3 h-3 ml-1 text-green-600" />
        ) : (
          <Copy className="w-3 h-3 ml-1" />
        )}
      </Badge>
      {agentName && <span className="text-foreground font-medium text-sm">{agentName}</span>}
    </div>
  );
}