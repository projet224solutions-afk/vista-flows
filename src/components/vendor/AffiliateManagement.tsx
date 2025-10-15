import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AffiliateManagement({ shopId }: { shopId?: string }) {
  const [percentage, setPercentage] = useState<number>(5);
  const [link, setLink] = useState<string>("");

  const generateLink = () => {
    if (!shopId) return;
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    const newLink = `${base}/ref/${shopId}?aff=${percentage}`;
    setLink(newLink);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Programme d'affiliation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={percentage}
            onChange={(e) => setPercentage(Number(e.target.value))}
            placeholder="Pourcentage à donner"
          />
          <Button onClick={generateLink} disabled={!shopId}>Générer le lien</Button>
        </div>
        {link && (
          <div className="text-sm text-green-700">
            Lien d'affiliation généré : <a href={link} target="_blank" rel="noreferrer">{link}</a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


