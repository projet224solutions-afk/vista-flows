/**
 * 🎭 SERVICE DE DONNÉES SIMULÉES - GESTION DES DÉPENSES
 * Service temporaire pour permettre au système de fonctionner sans les vraies tables
 */

// Données simulées complètes pour la gestion des dépenses
export const mockExpenseData = {
    "expense_categories": [
        {
            "id": "1",
            "name": "Stock & Marchandises",
            "description": "Achat de produits pour la revente",
            "color": "#10B981",
            "icon": "Package"
        },
        {
            "id": "2",
            "name": "Logistique & Transport",
            "description": "Frais de transport et livraison",
            "color": "#3B82F6",
            "icon": "Truck"
        },
        {
            "id": "3",
            "name": "Marketing & Publicité",
            "description": "Promotion et communication",
            "color": "#8B5CF6",
            "icon": "Megaphone"
        },
        {
            "id": "4",
            "name": "Salaires & Personnel",
            "description": "Rémunération des employés",
            "color": "#F59E0B",
            "icon": "Users"
        },
        {
            "id": "5",
            "name": "Équipements & Outils",
            "description": "Matériel et équipements",
            "color": "#6B7280",
            "icon": "Settings"
        },
        {
            "id": "6",
            "name": "Services & Abonnements",
            "description": "Services externes et abonnements",
            "color": "#EC4899",
            "icon": "CreditCard"
        },
        {
            "id": "7",
            "name": "Frais Généraux",
            "description": "Autres dépenses diverses",
            "color": "#64748B",
            "icon": "MoreHorizontal"
        }
    ],
    "vendor_expenses": [
        {
            "id": "1",
            "title": "Achat stock téléphones",
            "description": "Commande de 50 smartphones pour la boutique",
            "amount": 2500000,
            "currency": "XAF",
            "expense_date": "2025-09-30",
            "category_id": "1",
            "supplier_name": "TechDistrib SARL",
            "payment_method": "bank_transfer",
            "status": "approved"
        },
        {
            "id": "2",
            "title": "Publicité Facebook",
            "description": "Campagne publicitaire pour promotion produits",
            "amount": 150000,
            "currency": "XAF",
            "expense_date": "2025-10-01",
            "category_id": "3",
            "supplier_name": "Meta Ads",
            "payment_method": "card",
            "status": "pending"
        },
        {
            "id": "3",
            "title": "Salaire vendeur",
            "description": "Salaire mensuel équipe de vente",
            "amount": 800000,
            "currency": "XAF",
            "expense_date": "2025-10-02",
            "category_id": "4",
            "payment_method": "wallet",
            "status": "paid"
        },
        {
            "id": "4",
            "title": "Carburant livraisons",
            "description": "Essence pour véhicules de livraison",
            "amount": 85000,
            "currency": "XAF",
            "expense_date": "2025-10-01",
            "category_id": "2",
            "supplier_name": "Station Total",
            "payment_method": "cash",
            "status": "approved"
        },
        {
            "id": "5",
            "title": "Ordinateur portable",
            "description": "Laptop pour gestion administrative",
            "amount": 450000,
            "currency": "XAF",
            "expense_date": "2025-09-28",
            "category_id": "5",
            "supplier_name": "TechWorld",
            "payment_method": "bank_transfer",
            "status": "approved"
        }
    ],
    "expense_stats": {
        "total_expenses": 3985000,
        "expense_count": 5,
        "average_expense": 797000,
        "categories": [
            {
                "name": "Stock & Marchandises",
                "total": 2500000,
                "count": 1,
                "color": "#10B981"
            },
            {
                "name": "Logistique & Transport",
                "total": 85000,
                "count": 1,
                "color": "#3B82F6"
            },
            {
                "name": "Marketing & Publicité",
                "total": 150000,
                "count": 1,
                "color": "#8B5CF6"
            },
            {
                "name": "Salaires & Personnel",
                "total": 800000,
                "count": 1,
                "color": "#F59E0B"
            },
            {
                "name": "Équipements & Outils",
                "total": 450000,
                "count": 1,
                "color": "#6B7280"
            },
            {
                "name": "Services & Abonnements",
                "total": 0,
                "count": 0,
                "color": "#EC4899"
            },
            {
                "name": "Frais Généraux",
                "total": 0,
                "count": 0,
                "color": "#64748B"
            }
        ],
        "payment_methods": {
            "bank_transfer": 2950000,
            "card": 150000,
            "wallet": 800000,
            "cash": 85000
        },
        "monthly_trend": [
            {
                "month": "2025-08",
                "total": 1200000
            },
            {
                "month": "2025-09",
                "total": 2800000
            },
            {
                "month": "2025-10",
                "total": 3985000
            }
        ]
    },
    "expense_budgets": [
        {
            "id": "budget-1",
            "category_id": "1",
            "year": 2025,
            "month": 10,
            "planned_amount": 3000000,
            "spent_amount": 2500000,
            "alert_threshold": 80
        },
        {
            "id": "budget-2",
            "category_id": "2",
            "year": 2025,
            "month": 10,
            "planned_amount": 200000,
            "spent_amount": 85000,
            "alert_threshold": 80
        },
        {
            "id": "budget-3",
            "category_id": "3",
            "year": 2025,
            "month": 10,
            "planned_amount": 300000,
            "spent_amount": 150000,
            "alert_threshold": 80
        },
        {
            "id": "budget-4",
            "category_id": "4",
            "year": 2025,
            "month": 10,
            "planned_amount": 1000000,
            "spent_amount": 800000,
            "alert_threshold": 80
        },
        {
            "id": "budget-5",
            "category_id": "5",
            "year": 2025,
            "month": 10,
            "planned_amount": 500000,
            "spent_amount": 450000,
            "alert_threshold": 80
        }
    ],
    "expense_alerts": [
        {
            "id": "1",
            "alert_type": "budget_exceeded",
            "title": "Budget Stock bientôt dépassé",
            "message": "Le budget Stock & Marchandises atteint 83% de la limite mensuelle",
            "severity": "high",
            "is_read": false,
            "created_at": "2025-10-02T10:30:00Z"
        },
        {
            "id": "2",
            "alert_type": "anomaly_detected",
            "title": "Dépense anormalement élevée",
            "message": "Une dépense de 2.5M XAF détectée - vérification recommandée",
            "severity": "medium",
            "is_read": false,
            "created_at": "2025-10-02T08:15:00Z"
        },
        {
            "id": "3",
            "alert_type": "budget_warning",
            "title": "Budget Équipements à surveiller",
            "message": "Budget Équipements & Outils à 90% - attention aux prochaines dépenses",
            "severity": "medium",
            "is_read": true,
            "created_at": "2025-10-01T14:20:00Z"
        }
    ],
    "expense_analytics": {
        "anomalies": [
            {
                "expense_id": "1",
                "title": "Achat stock téléphones",
                "amount": 2500000,
                "date": "2025-09-30",
                "anomaly_type": "high_amount",
                "severity": "medium",
                "description": "Dépense supérieure à la moyenne habituelle de 214%"
            }
        ],
        "recommendations": [
            "Considérez négocier des tarifs préférentiels avec TechDistrib SARL pour les gros volumes",
            "Optimisez vos campagnes publicitaires Facebook pour un meilleur ROI",
            "Planifiez vos achats de stock pour bénéficier de remises quantité",
            "Surveillez le budget Stock & Marchandises qui approche de la limite",
            "Évaluez la rentabilité de chaque catégorie de dépenses mensuellement"
        ],
        "efficiency_score": 78.5,
        "risk_score": 23.2,
        "profit_margin": 42.8,
        "cost_optimization": {
            "potential_savings": 285000,
            "optimization_areas": ["Transport", "Marketing", "Équipements"]
        }
    },
    "notifications": [
        {
            "id": "1",
            "title": "Nouvelle dépense approuvée",
            "message": "Votre dépense 'Achat stock téléphones' a été approuvée par le PDG",
            "type": "success",
            "is_read": false,
            "created_at": "2025-10-02T09:45:00Z"
        },
        {
            "id": "2",
            "title": "Budget en cours d'épuisement",
            "message": "Votre budget Marketing atteint 50% de la limite mensuelle",
            "type": "warning",
            "is_read": false,
            "created_at": "2025-10-02T07:30:00Z"
        },
        {
            "id": "3",
            "title": "Rapport mensuel disponible",
            "message": "Votre rapport de dépenses de septembre est prêt à télécharger",
            "type": "info",
            "is_read": true,
            "created_at": "2025-10-01T16:00:00Z"
        }
    ],
    "created_at": "2025-10-02T12:00:00Z",
    "version": "1.0.0"
};

/**
 * 🎭 SERVICE DE DONNÉES SIMULÉES
 * Fournit des données de test pour le système de gestion des dépenses
 */
export class MockExpenseService {

    /**
     * Récupérer toutes les catégories de dépenses
     */
    static getCategories() {
        return mockExpenseData.expense_categories;
    }

    /**
     * Récupérer toutes les dépenses
     */
    static getExpenses(filters = {}) {
        let expenses = [...mockExpenseData.vendor_expenses];

        // Appliquer les filtres si fournis
        if (filters.categoryId) {
            expenses = expenses.filter(exp => exp.category_id === filters.categoryId);
        }
        if (filters.status) {
            expenses = expenses.filter(exp => exp.status === filters.status);
        }
        if (filters.startDate) {
            expenses = expenses.filter(exp => exp.expense_date >= filters.startDate);
        }
        if (filters.endDate) {
            expenses = expenses.filter(exp => exp.expense_date <= filters.endDate);
        }

        return {
            expenses,
            total: expenses.length
        };
    }

    /**
     * Récupérer les statistiques des dépenses
     */
    static getStats() {
        return mockExpenseData.expense_stats;
    }

    /**
     * Récupérer les budgets
     */
    static getBudgets() {
        return mockExpenseData.expense_budgets;
    }

    /**
     * Récupérer les alertes
     */
    static getAlerts(unreadOnly = false) {
        let alerts = mockExpenseData.expense_alerts;

        if (unreadOnly) {
            alerts = alerts.filter(alert => !alert.is_read);
        }

        return alerts;
    }

    /**
     * Récupérer les analyses IA
     */
    static getAnalytics() {
        return mockExpenseData.expense_analytics;
    }

    /**
     * Récupérer les notifications
     */
    static getNotifications(unreadOnly = false) {
        let notifications = mockExpenseData.notifications;

        if (unreadOnly) {
            notifications = notifications.filter(notif => !notif.is_read);
        }

        return notifications;
    }

    /**
     * Créer une nouvelle dépense (simulation)
     */
    static createExpense(expenseData) {
        const newExpense = {
            id: String(mockExpenseData.vendor_expenses.length + 1),
            ...expenseData,
            created_at: new Date().toISOString(),
            status: 'pending'
        };

        mockExpenseData.vendor_expenses.push(newExpense);

        // Mettre à jour les statistiques
        this.updateStats();

        return newExpense;
    }

    /**
     * Créer une nouvelle catégorie (simulation)
     */
    static createCategory(categoryData) {
        const newCategory = {
            id: String(mockExpenseData.expense_categories.length + 1),
            ...categoryData,
            created_at: new Date().toISOString(),
            is_active: true
        };

        mockExpenseData.expense_categories.push(newCategory);

        return newCategory;
    }

    /**
     * Marquer une alerte comme lue
     */
    static markAlertAsRead(alertId) {
        const alert = mockExpenseData.expense_alerts.find(a => a.id === alertId);
        if (alert) {
            alert.is_read = true;
            alert.read_at = new Date().toISOString();
        }
        return alert;
    }

    /**
     * Marquer une notification comme lue
     */
    static markNotificationAsRead(notificationId) {
        const notification = mockExpenseData.notifications.find(n => n.id === notificationId);
        if (notification) {
            notification.is_read = true;
            notification.read_at = new Date().toISOString();
        }
        return notification;
    }

    /**
     * Mettre à jour les statistiques (interne)
     */
    static updateStats() {
        const expenses = mockExpenseData.vendor_expenses;

        mockExpenseData.expense_stats.total_expenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
        mockExpenseData.expense_stats.expense_count = expenses.length;
        mockExpenseData.expense_stats.average_expense = mockExpenseData.expense_stats.total_expenses / expenses.length;

        // Mettre à jour les catégories
        mockExpenseData.expense_stats.categories = mockExpenseData.expense_categories.map(cat => {
            const categoryExpenses = expenses.filter(exp => exp.category_id === cat.id);
            return {
                name: cat.name,
                total: categoryExpenses.reduce((sum, exp) => sum + exp.amount, 0),
                count: categoryExpenses.length,
                color: cat.color
            };
        });
    }

    /**
     * Obtenir des métriques rapides
     */
    static getQuickStats() {
        const alerts = this.getAlerts(true);
        const analytics = this.getAnalytics();

        return {
            totalExpenses: mockExpenseData.expense_stats.total_expenses,
            expenseCount: mockExpenseData.expense_stats.expense_count,
            averageExpense: mockExpenseData.expense_stats.average_expense,
            unreadAlerts: alerts.length,
            hasAnomalies: analytics.anomalies.length > 0
        };
    }
}

// Export par défaut
export default MockExpenseService;
