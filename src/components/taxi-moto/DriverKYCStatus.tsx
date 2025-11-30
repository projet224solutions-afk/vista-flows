import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface DriverKYCStatusProps {
  isKycValid: boolean;
  onOpenKyc?: () => void;
}

export function DriverKYCStatus({ isKycValid, onOpenKyc }: DriverKYCStatusProps) {
  if (isKycValid) {
    return <Badge variant="success">KYC vérifié</Badge>;
  }
  return (
    <div className="flex items-center gap-2">
      <Badge variant="destructive">KYC requis</Badge>
      {onOpenKyc && (
        <Button size="sm" variant="outline" onClick={onOpenKyc}>Compléter le KYC</Button>
      )}
    </div>
  );
}
