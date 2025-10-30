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
          variant="default" 
          className="w-fit cursor-pointer hover:opacity-80 transition-opacity"
          onClick={handleCopy}
        >
          <span className="font-mono font-bold">{agentCode}</span>
          {copied ? (
            <Check className="w-3 h-3 ml-2" />
          ) : (
            <Copy className="w-3 h-3 ml-2" />
          )}
        </Badge>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg ${className}`}>
      <span className="text-xs font-medium text-primary">ID Agent:</span>
      <span 
        className="text-xs font-mono font-bold text-primary cursor-pointer hover:underline" 
        onClick={handleCopy}
        title="Cliquer pour copier"
      >
        {agentCode}
      </span>
      {copied && <Check className="w-3 h-3 text-green-600" />}
    </div>
  );
}