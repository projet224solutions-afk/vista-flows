import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Shield, AlertTriangle, CheckCircle, Clock, XCircle, Trophy } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const severityColors = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-blue-500",
  info: "bg-gray-500",
};

const statusColors = {
  pending: "bg-yellow-500",
  reviewing: "bg-blue-500",
  accepted: "bg-green-500",
  rejected: "bg-red-500",
  duplicate: "bg-gray-500",
  resolved: "bg-purple-500",
  rewarded: "bg-emerald-500",
};

const BugBountyDashboard = () => {
  const queryClient = useQueryClient();
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [rewardAmount, setRewardAmount] = useState<string>("");
  const [newStatus, setNewStatus] = useState<string>("");

  const { data: reports, isLoading } = useQuery({
    queryKey: ["bug-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bug_reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["bug-bounty-stats"],
    queryFn: async () => {
      const { data: allReports } = await supabase.from("bug_reports").select("status, severity, reward_amount");
      
      return {
        total: allReports?.length || 0,
        pending: allReports?.filter(r => r.status === "pending").length || 0,
        resolved: allReports?.filter(r => r.status === "resolved").length || 0,
        rewarded: allReports?.filter(r => r.status === "rewarded").length || 0,
        totalPaid: allReports?.reduce((sum, r) => {
          const amount = parseFloat(String(r.reward_amount || "0"));
          return sum + (isNaN(amount) ? 0 : amount);
        }, 0) || 0,
      };
    },
  });

  const updateReportMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { error } = await supabase
        .from("bug_reports")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bug-reports"] });
      queryClient.invalidateQueries({ queryKey: ["bug-bounty-stats"] });
      toast.success("Rapport mis à jour");
      setSelectedReport(null);
    },
    onError: (error: any) => {
      toast.error("Erreur", { description: error.message });
    },
  });

  const handleUpdateReport = () => {
    if (!selectedReport) return;

    const updates: any = {};
    if (adminNotes) updates.admin_notes = adminNotes;
    if (newStatus) {
      updates.status = newStatus;
      if (newStatus === "resolved" || newStatus === "rewarded") {
        updates.resolved_at = new Date().toISOString();
      }
    }
    if (rewardAmount) updates.reward_amount = parseFloat(rewardAmount);

    updateReportMutation.mutate({ id: selectedReport.id, updates });
  };

  if (isLoading) {
    return <div className="p-8">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Rapports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4" />
              En attente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats?.pending || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Résolus
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.resolved || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Récompensés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{stats?.rewarded || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Payé</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalPaid.toFixed(2)}€</div>
          </CardContent>
        </Card>
      </div>

      {/* Reports List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Rapports de vulnérabilité
          </CardTitle>
          <CardDescription>
            Gérez les rapports soumis par la communauté
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reports?.map((report) => (
              <Dialog key={report.id}>
                <DialogTrigger asChild>
                  <Card 
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => {
                      setSelectedReport(report);
                      setAdminNotes(report.admin_notes || "");
                      setRewardAmount(report.reward_amount?.toString() || "");
                      setNewStatus(report.status);
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge className={severityColors[report.severity as keyof typeof severityColors]}>
                              {report.severity}
                            </Badge>
                            <Badge variant="outline" className={statusColors[report.status as keyof typeof statusColors]}>
                              {report.status}
                            </Badge>
                            <Badge variant="outline">{report.category}</Badge>
                          </div>
                          <h3 className="font-semibold">{report.title}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {report.description}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Par: {report.reporter_name}</span>
                            <span>•</span>
                            <span>{format(new Date(report.created_at), "PPP", { locale: fr })}</span>
                            {report.reward_amount && (
                              <>
                                <span>•</span>
                                <span className="text-green-600 font-semibold">
                                  {report.reward_amount}€
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        {report.severity === "critical" && (
                          <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </DialogTrigger>

                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{report.title}</DialogTitle>
                    <DialogDescription>
                      Rapport #{report.id.slice(0, 8)}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-6">
                    {/* Reporter Info */}
                    <div>
                      <h3 className="font-semibold mb-2">Informations du reporter</h3>
                      <div className="space-y-1 text-sm">
                        <p><strong>Nom:</strong> {report.reporter_name}</p>
                        <p><strong>Email:</strong> {report.reporter_email}</p>
                        {report.reporter_github && (
                          <p><strong>GitHub:</strong> {report.reporter_github}</p>
                        )}
                      </div>
                    </div>

                    {/* Report Details */}
                    <div>
                      <h3 className="font-semibold mb-2">Description</h3>
                      <p className="text-sm whitespace-pre-wrap">{report.description}</p>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">Étapes de reproduction</h3>
                      <p className="text-sm whitespace-pre-wrap">{report.steps_to_reproduce}</p>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">Impact</h3>
                      <p className="text-sm whitespace-pre-wrap">{report.impact}</p>
                    </div>

                    {report.proof_of_concept && (
                      <div>
                        <h3 className="font-semibold mb-2">Preuve de concept</h3>
                        <p className="text-sm whitespace-pre-wrap">{report.proof_of_concept}</p>
                      </div>
                    )}

                    {report.suggested_fix && (
                      <div>
                        <h3 className="font-semibold mb-2">Correction suggérée</h3>
                        <p className="text-sm whitespace-pre-wrap">{report.suggested_fix}</p>
                      </div>
                    )}

                    {/* Admin Actions */}
                    <div className="border-t pt-6 space-y-4">
                      <h3 className="font-semibold">Actions administrateur</h3>

                      <div className="space-y-2">
                        <Label htmlFor="status">Statut</Label>
                        <Select value={newStatus} onValueChange={setNewStatus}>
                          <SelectTrigger id="status">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">En attente</SelectItem>
                            <SelectItem value="reviewing">En revue</SelectItem>
                            <SelectItem value="accepted">Accepté</SelectItem>
                            <SelectItem value="rejected">Rejeté</SelectItem>
                            <SelectItem value="duplicate">Duplicata</SelectItem>
                            <SelectItem value="resolved">Résolu</SelectItem>
                            <SelectItem value="rewarded">Récompensé</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="reward">Montant de la récompense (€)</Label>
                        <Input
                          id="reward"
                          type="number"
                          value={rewardAmount}
                          onChange={(e) => setRewardAmount(e.target.value)}
                          placeholder="Ex: 500"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="notes">Notes administrateur</Label>
                        <Textarea
                          id="notes"
                          value={adminNotes}
                          onChange={(e) => setAdminNotes(e.target.value)}
                          placeholder="Notes internes..."
                          className="min-h-[100px]"
                        />
                      </div>

                      <Button onClick={handleUpdateReport} className="w-full">
                        Mettre à jour le rapport
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            ))}

            {reports?.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                Aucun rapport de vulnérabilité pour le moment
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BugBountyDashboard;