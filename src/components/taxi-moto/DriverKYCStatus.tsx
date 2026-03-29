import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface DriverKYCStatusProps {
  isKycValid: boolean;
  onOpenKyc?: () => void;
}

export function DriverKYCStatus({ isKycValid, onOpenKyc }: DriverKYCStatusProps) {
  if (isKycValid) {
    return <Badge variant="default" className="bg-gradient-to-br from-primary-blue-500 to-primary-orange-500 text-white">KYC vÃ©rifiÃ©</Badge>;
  }
  return (
    <div className="flex items-center gap-2">
      <Badge variant="destructive">KYC requis</Badge>
      {onOpenKyc && (
        <Button size="sm" variant="outline" onClick={onOpenKyc}>ComplÃ©ter le KYC</Button>
      )}
    </div>
  );
}
