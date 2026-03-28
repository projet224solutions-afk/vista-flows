import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface VendorSubscriptionPlanSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function VendorSubscriptionPlanSelector({ 
  open, 
  onOpenChange,
  onSuccess 
}: VendorSubscriptionPlanSelectorProps) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) {
      return;
    }
    onOpenChange(false);
    onSuccess?.();
    navigate('/vendeur/subscription');
  }, [navigate, onOpenChange, onSuccess, open]);

  return null;
}
