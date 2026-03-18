import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
...
  const clearAgentSessions = () => {
    ['agent_session', 'agent_user', 'agent_token'].forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });

    localStorage.removeItem('supabase.auth.token');

    Object.keys(localStorage)
      .filter((key) => key.startsWith('sb-') && key.endsWith('-auth-token'))
      .forEach((key) => localStorage.removeItem(key));
  };

  const handleSignOut = async () => {
    clearAgentSessions();

    try {
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error && error.message !== 'Session not found') {
        console.error('Erreur déconnexion Supabase:', error);
      }
    } catch (error) {
      console.error('Erreur déconnexion:', error);
    } finally {
      clearAgentSessions();
      toast.success('Déconnexion réussie');
      window.location.replace('/auth');
    }
  };

  const hasPermission = (permission: string) => {
    return agent?.permissions?.[permission as keyof VendorAgentPermissions] || false;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-vendeur-primary/10 to-vendeur-secondary/10">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-vendeur-primary mx-auto"></div>
          <p className="text-muted-foreground">Chargement de votre espace agent...</p>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-vendeur-primary/10 to-vendeur-secondary/10 p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Accès Agent Vendeur</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center space-y-2">
              <p className="text-muted-foreground">
                Aucun profil agent trouvé avec ce lien d'accès.
              </p>
              <div className="p-4 bg-muted/50 rounded-lg space-y-2 text-sm">
                <p className="font-medium">Vérifiez que :</p>
                <ul className="list-disc list-inside text-left space-y-1 text-muted-foreground">
                  <li>Le lien d'accès est complet et correct</li>
                  <li>Votre compte agent est actif</li>
                  <li>Le lien n'a pas expiré</li>
                </ul>
              </div>
              {token && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs text-left">
                  <p className="font-mono break-all">
                    <span className="font-semibold">Token détecté:</span> {token}
                  </p>
                </div>
              )}
            </div>
            <Button onClick={handleSignOut} className="w-full" variant="outline">
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <AgentProvider agent={agent}>
      <div className="min-h-screen bg-gradient-to-br from-vendeur-primary/10 to-vendeur-secondary/10">
        {/* Header */}
        <div className="bg-white shadow-lg border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-vendeur-gradient">
                    <Shield className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold">Espace Agent</h1>
                    <p className="text-sm text-muted-foreground">
                      {agent.name} • {agent.agent_code} • Accès aux données du vendeur
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="bg-vendeur-secondary/10 text-vendeur-secondary border-vendeur-secondary/20">
                  Agent Actif
                </Badge>
              </div>
              <Button onClick={handleSignOut} variant="outline" size="sm">
                <LogOut className="w-4 h-4 mr-2" />
                Déconnexion
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white shadow flex-wrap gap-1">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            {hasPermission('view_dashboard') && (
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            )}
            {hasPermission('view_analytics') && (
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            )}
            {hasPermission('access_pos') && (
              <TabsTrigger
                value="pos"
                disabled={!canAccessPOS}
                onClick={() => {
                  if (!canAccessPOS) {
                    toast.error("POS verrouillé : disponible uniquement pour boutiques physiques / hybrides");
                    setActiveTab('overview');
                  }
                }}
              >
                POS{!canAccessPOS ? ' 🔒' : ''}
              </TabsTrigger>
            )}
            <TabsTrigger value="products">Produits</TabsTrigger>
            {hasPermission('manage_orders') && (
              <TabsTrigger value="orders">Commandes</TabsTrigger>
            )}
            {hasPermission('manage_inventory') && (
              <TabsTrigger value="inventory">Inventaire</TabsTrigger>
            )}
            {hasPermission('manage_warehouse') && (
              <TabsTrigger value="warehouse">Entrepôt</TabsTrigger>
            )}
            {hasPermission('manage_suppliers') && (
              <TabsTrigger value="suppliers">Fournisseurs</TabsTrigger>
            )}
            {hasPermission('manage_clients') && (
              <TabsTrigger value="clients">Clients</TabsTrigger>
            )}
            {hasPermission('manage_prospects') && (
              <TabsTrigger value="prospects">Prospects</TabsTrigger>
            )}
            {hasPermission('manage_marketing') && (
              <TabsTrigger value="marketing">Marketing</TabsTrigger>
            )}
            {hasPermission('manage_delivery') && (
              <TabsTrigger value="delivery">Livraisons</TabsTrigger>
            )}
            {hasPermission('access_wallet') && (
              <TabsTrigger value="wallet">Wallet</TabsTrigger>
            )}
            {hasPermission('manage_payments') && (
              <TabsTrigger value="payments">Paiements</TabsTrigger>
            )}
            {hasPermission('manage_payment_links') && (
              <TabsTrigger value="payment_links">Liens Paiement</TabsTrigger>
            )}
            {hasPermission('manage_expenses') && (
              <TabsTrigger value="expenses">Dépenses</TabsTrigger>
            )}
            {hasPermission('manage_debts') && (
              <TabsTrigger value="debts">Dettes</TabsTrigger>
            )}
            {hasPermission('access_affiliate') && (
              <TabsTrigger value="affiliate">Affiliation</TabsTrigger>
            )}
            {hasPermission('access_support') && (
              <TabsTrigger value="support">Support</TabsTrigger>
            )}
            {hasPermission('access_communication') && (
              <TabsTrigger value="communication">Messages</TabsTrigger>
            )}
            {hasPermission('view_reports') && (
              <TabsTrigger value="reports">Rapports</TabsTrigger>
            )}
            <TabsTrigger value="commissions">Commissions</TabsTrigger>
            {hasPermission('manage_agents') && (
              <TabsTrigger value="sub_agents">Agents Secondaires</TabsTrigger>
            )}
            {hasPermission('access_settings') && (
              <TabsTrigger value="settings">Paramètres</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="border-0 shadow-elegant">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    Mes Permissions
                  </CardTitle>
                  <Shield className="w-4 h-4 text-vendeur-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{Object.values(agent.permissions).filter(Boolean).length}</div>
                  <p className="text-xs text-muted-foreground">
                    accès actifs
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-elegant">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    Sous-Agents
                  </CardTitle>
                  <UserPlus className="w-4 h-4 text-vendeur-secondary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">0</div>
                  <p className="text-xs text-muted-foreground">
                    {agent.can_create_sub_agent ? 'Création autorisée' : 'Non autorisé'}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-elegant">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    Statut
                  </CardTitle>
                  <TrendingUp className="w-4 h-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Actif</div>
                  <p className="text-xs text-muted-foreground">
                    Compte vérifié
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-elegant">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    Contact
                  </CardTitle>
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-sm font-medium">{agent.email}</div>
                  <p className="text-xs text-muted-foreground">
                    {agent.phone}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Informations Agent */}
            <Card className="border-0 shadow-elegant">
              <CardHeader className="bg-vendeur-accent/30 border-b">
                <CardTitle>Informations du Compte</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Nom</p>
                    <p className="text-base font-semibold">{agent.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Code Agent</p>
                    <p className="text-base font-mono font-semibold text-vendeur-primary">{agent.agent_code}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Email</p>
                    <p className="text-base">{agent.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Téléphone</p>
                    <p className="text-base">{agent.phone}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm font-medium text-muted-foreground mb-2">Permissions Actives</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(agent.permissions)
                        .filter(([_, value]) => value)
                        .map(([perm]) => (
                        <Badge 
                          key={perm}
                          variant="secondary"
                          className="bg-vendeur-primary/10 text-vendeur-primary border-vendeur-primary/20"
                        >
                          {perm.replace(/_/g, ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Modules Disponibles */}
            <Card className="border-0 shadow-elegant">
              <CardHeader className="bg-vendeur-accent/30 border-b">
                <CardTitle>Modules Disponibles</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {hasPermission('view_dashboard') && (
                    <Button
                      variant="outline"
                      className="h-24 flex flex-col gap-2"
                      onClick={() => setActiveTab('dashboard')}
                    >
                      <BarChart3 className="h-6 w-6" />
                      <span className="text-sm">Dashboard</span>
                    </Button>
                  )}
                  {hasPermission('access_pos') && (
                    <Button
                      variant="outline"
                      className={`h-24 flex flex-col gap-2 ${!canAccessPOS ? 'opacity-60 cursor-not-allowed' : ''}`}
                      onClick={() => {
                        if (!canAccessPOS) {
                          toast.error("POS verrouillé : vendeur en ligne uniquement");
                          return;
                        }
                        setActiveTab('pos');
                      }}
                    >
                      <CreditCard className="h-6 w-6" />
                      <span className="text-sm">POS{!canAccessPOS ? ' (verrouillé)' : ''}</span>
                    </Button>
                  )}
                  {hasPermission('manage_products') && (
                    <Button
                      variant="outline"
                      className="h-24 flex flex-col gap-2"
                      onClick={() => setActiveTab('products')}
                    >
                      <Package className="h-6 w-6" />
                      <span className="text-sm">Produits</span>
                    </Button>
                  )}
                  {hasPermission('manage_orders') && (
                    <Button
                      variant="outline"
                      className="h-24 flex flex-col gap-2"
                      onClick={() => setActiveTab('orders')}
                    >
                      <ShoppingCart className="h-6 w-6" />
                      <span className="text-sm">Commandes</span>
                    </Button>
                  )}
                  {hasPermission('manage_inventory') && (
                    <Button
                      variant="outline"
                      className="h-24 flex flex-col gap-2"
                      onClick={() => setActiveTab('inventory')}
                    >
                      <Package className="h-6 w-6" />
                      <span className="text-sm">Inventaire</span>
                    </Button>
                  )}
                  {hasPermission('manage_warehouse') && (
                    <Button
                      variant="outline"
                      className="h-24 flex flex-col gap-2"
                      onClick={() => setActiveTab('warehouse')}
                    >
                      <Warehouse className="h-6 w-6" />
                      <span className="text-sm">Entrepôt</span>
                    </Button>
                  )}
                  {hasPermission('manage_clients') && (
                    <Button
                      variant="outline"
                      className="h-24 flex flex-col gap-2"
                      onClick={() => setActiveTab('clients')}
                    >
                      <Users className="h-6 w-6" />
                      <span className="text-sm">Clients</span>
                    </Button>
                  )}
                  {hasPermission('manage_delivery') && (
                    <Button
                      variant="outline"
                      className="h-24 flex flex-col gap-2"
                      onClick={() => setActiveTab('delivery')}
                    >
                      <Truck className="h-6 w-6" />
                      <span className="text-sm">Livraisons</span>
                    </Button>
                  )}
                  {hasPermission('access_wallet') && (
                    <Button
                      variant="outline"
                      className="h-24 flex flex-col gap-2"
                      onClick={() => setActiveTab('wallet')}
                    >
                      <Wallet className="h-6 w-6" />
                      <span className="text-sm">Wallet</span>
                    </Button>
                  )}
                  {hasPermission('view_reports') && (
                    <Button
                      variant="outline"
                      className="h-24 flex flex-col gap-2"
                      onClick={() => setActiveTab('analytics')}
                    >
                      <FileText className="h-6 w-6" />
                      <span className="text-sm">Rapports</span>
                    </Button>
                  )}
                  {hasPermission('access_communication') && (
                    <Button
                      variant="outline"
                      className="h-24 flex flex-col gap-2"
                      onClick={() => setActiveTab('communication')}
                    >
                      <MessageSquare className="h-6 w-6" />
                      <span className="text-sm">Communication</span>
                    </Button>
                  )}
                  {hasPermission('manage_agents') && (
                    <Button
                      variant="outline"
                      className="h-24 flex flex-col gap-2"
                      onClick={() => setActiveTab('sub_agents')}
                    >
                      <UserPlus className="h-6 w-6" />
                      <span className="text-sm">Agents Secondaires</span>
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="h-24 flex flex-col gap-2"
                    onClick={() => setActiveTab('commissions')}
                  >
                    <DollarSign className="h-6 w-6" />
                    <span className="text-sm">Commissions</span>
                  </Button>
                  {hasPermission('access_settings') && (
                    <Button
                      variant="outline"
                      className="h-24 flex flex-col gap-2"
                    >
                      <Settings className="h-6 w-6" />
                      <span className="text-sm">Paramètres</span>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dashboard">
            <AgentModuleWrapper permission="view_dashboard">
              <VendorAnalyticsDashboard />
            </AgentModuleWrapper>
          </TabsContent>

          <TabsContent value="products">
            <AgentModuleWrapper permission="manage_products">
              <ProductManagement />
            </AgentModuleWrapper>
          </TabsContent>

          <TabsContent value="orders">
            <AgentModuleWrapper permission="manage_orders">
              <OrderManagement />
            </AgentModuleWrapper>
          </TabsContent>

          <TabsContent value="wallet">
            <AgentModuleWrapper permission="access_wallet">
              <VendorAgentWalletView 
                vendorId={agent.vendor_id}
                agentName={agent.name}
              />
            </AgentModuleWrapper>
          </TabsContent>

          {/* Modules additionnels */}
          {hasPermission('access_pos') && (
            <TabsContent value="pos">
              <AgentModuleWrapper>
                {canAccessPOS ? (
                  <POSSystemWrapper />
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle>POS verrouillé</CardTitle>
                      <CardDescription>
                        Le vendeur est configuré en "En ligne uniquement". Le POS est désactivé.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button variant="outline" onClick={() => setActiveTab('overview')}>Retour</Button>
                    </CardContent>
                  </Card>
                )}
              </AgentModuleWrapper>
            </TabsContent>
          )}

          {hasPermission('manage_inventory') && (
            <TabsContent value="inventory">
              <AgentModuleWrapper>
                <InventoryManagement />
              </AgentModuleWrapper>
            </TabsContent>
          )}

          {hasPermission('manage_warehouse') && (
            <TabsContent value="warehouse">
              <AgentModuleWrapper>
                <MultiWarehouseManagement />
              </AgentModuleWrapper>
            </TabsContent>
          )}

          {hasPermission('manage_clients') && (
            <TabsContent value="clients">
              <AgentModuleWrapper>
                <ClientManagement />
              </AgentModuleWrapper>
            </TabsContent>
          )}

          {hasPermission('manage_delivery') && (
            <TabsContent value="delivery">
              <AgentModuleWrapper>
                <VendorDeliveriesPanel />
              </AgentModuleWrapper>
            </TabsContent>
          )}

          {hasPermission('manage_payments') && (
            <TabsContent value="payments">
              <AgentModuleWrapper>
                <PaymentManagement />
              </AgentModuleWrapper>
            </TabsContent>
          )}

          {hasPermission('manage_payment_links') && (
            <TabsContent value="payment_links">
              <AgentModuleWrapper>
                <PaymentLinksManager />
              </AgentModuleWrapper>
            </TabsContent>
          )}

          {hasPermission('access_support') && (
            <TabsContent value="support">
              <AgentModuleWrapper>
                <SupportTickets />
              </AgentModuleWrapper>
            </TabsContent>
          )}

          {hasPermission('access_communication') && (
            <TabsContent value="communication">
              <AgentModuleWrapper>
                <UniversalCommunicationHub />
              </AgentModuleWrapper>
            </TabsContent>
          )}

          {hasPermission('manage_suppliers') && (
            <TabsContent value="suppliers">
              <AgentModuleWrapper>
                <SupplierManagement />
              </AgentModuleWrapper>
            </TabsContent>
          )}

          {hasPermission('manage_prospects') && (
            <TabsContent value="prospects">
              <AgentModuleWrapper>
                <ProspectManagement />
              </AgentModuleWrapper>
            </TabsContent>
          )}

          {hasPermission('manage_marketing') && (
            <TabsContent value="marketing">
              <AgentModuleWrapper>
                <MarketingManagement />
              </AgentModuleWrapper>
            </TabsContent>
          )}

          {hasPermission('manage_expenses') && (
            <TabsContent value="expenses">
              <AgentModuleWrapper>
                <ExpenseManagementDashboard />
              </AgentModuleWrapper>
            </TabsContent>
          )}

          {hasPermission('manage_debts') && (
            <TabsContent value="debts">
              <AgentModuleWrapper>
                <VendorDebtManagement vendorId={agent.vendor_id} />
              </AgentModuleWrapper>
            </TabsContent>
          )}

          {/* Analytics Tab */}
          {hasPermission('view_analytics') && (
            <TabsContent value="analytics">
              <AgentModuleWrapper>
                <VendorAnalyticsDashboard />
              </AgentModuleWrapper>
            </TabsContent>
          )}

          {/* Affiliate Tab */}
          {hasPermission('access_affiliate') && (
            <TabsContent value="affiliate">
              <AgentModuleWrapper>
                <AffiliateManagement />
              </AgentModuleWrapper>
            </TabsContent>
          )}

          {/* Reports Tab */}
          {hasPermission('view_reports') && (
            <TabsContent value="reports">
              <AgentModuleWrapper>
                <Card>
                  <CardHeader>
                    <CardTitle>Rapports & Analyses</CardTitle>
                    <CardDescription>Consultez les rapports détaillés de l'activité</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <VendorAnalyticsDashboard />
                  </CardContent>
                </Card>
              </AgentModuleWrapper>
            </TabsContent>
          )}

          {/* Commissions Tab */}
          <TabsContent value="commissions">
            <AgentModuleWrapper>
              <CommissionsManagement />
            </AgentModuleWrapper>
          </TabsContent>

          {/* Sub Agents Tab */}
          {hasPermission('manage_agents') && (
            <TabsContent value="sub_agents">
              <AgentModuleWrapper>
                <AgentManagement />
              </AgentModuleWrapper>
            </TabsContent>
          )}

          {/* Settings Tab */}
          {hasPermission('access_settings') && (
            <TabsContent value="settings">
              <AgentModuleWrapper>
                <Card>
                  <CardHeader>
                    <CardTitle>Paramètres Agent</CardTitle>
                    <CardDescription>Configurez vos préférences et paramètres</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">Paramètres limités disponibles pour les agents</p>
                  </CardContent>
                </Card>
              </AgentModuleWrapper>
            </TabsContent>
          )}
          </Tabs>
          </div>
        </ScrollArea>
      </div>
    </AgentProvider>
  );
}
