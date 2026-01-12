/**
 * Modal for displaying available professional services
 * When user is logged in and clicks "Commencer maintenant"
 * Shows available services or prompts to be the first to create
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Store, 
  Sparkles, 
  ArrowRight, 
  Search, 
  MapPin, 
  Star, 
  Plus,
  Mail,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ProfessionalService {
  id: string;
  business_name: string;
  description: string | null;
  logo_url: string | null;
  address: string | null;
  rating: number;
  total_reviews: number;
  status: string;
  service_type?: {
    id: string;
    name: string;
    icon: string;
    category: string;
  };
}

interface AvailableServicesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AvailableServicesModal({ open, onOpenChange }: AvailableServicesModalProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  
  const [services, setServices] = useState<ProfessionalService[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      fetchAvailableServices();
    }
  }, [open]);

  const fetchAvailableServices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('professional_services')
        .select(`
          id,
          business_name,
          description,
          logo_url,
          address,
          rating,
          total_reviews,
          status,
          service_type:service_types(id, name, icon, category)
        `)
        .eq('status', 'active')
        .order('rating', { ascending: false })
        .limit(20);

      if (error) throw error;
      setServices((data || []) as ProfessionalService[]);
    } catch (error) {
      console.error('Error fetching services:', error);
      toast.error('Erreur lors du chargement des services');
    } finally {
      setLoading(false);
    }
  };

  const filteredServices = services.filter(service =>
    service.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    service.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    service.service_type?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleServiceClick = (serviceId: string) => {
    onOpenChange(false);
    navigate(`/service/${serviceId}`);
  };

  const handleCreateServiceClick = () => {
    setShowCreateForm(true);
    setNewEmail('');
    setEmailError('');
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      return 'L\'email est requis';
    }
    if (!emailRegex.test(email)) {
      return 'Email invalide';
    }
    if (user?.email && email.toLowerCase() === user.email.toLowerCase()) {
      return 'Vous devez utiliser un email différent de votre compte actuel';
    }
    return '';
  };

  const handleEmailSubmit = async () => {
    const error = validateEmail(newEmail);
    if (error) {
      setEmailError(error);
      return;
    }

    setIsSubmitting(true);
    try {
      // Store the new email in sessionStorage for the service creation flow
      sessionStorage.setItem('service_creation_email', newEmail);
      
      toast.success('Email enregistré ! Vous allez être redirigé vers la création de service.');
      onOpenChange(false);
      
      // Navigate to service selection with the new email context
      navigate('/service-selection', { 
        state: { 
          serviceEmail: newEmail,
          fromServicesModal: true 
        } 
      });
    } catch (error) {
      console.error('Error:', error);
      toast.error('Une erreur est survenue');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToList = () => {
    setShowCreateForm(false);
    setNewEmail('');
    setEmailError('');
  };

  const renderEmptyState = () => (
    <div className="text-center py-8">
      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
        <Store className="w-8 h-8 text-primary" />
      </div>
      <h3 className="font-semibold text-foreground mb-2">
        Aucun service disponible pour le moment
      </h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
        Soyez le premier à créer votre service professionnel et commencez à recevoir des clients !
      </p>
      <Button onClick={handleCreateServiceClick} className="gap-2">
        <Plus className="w-4 h-4" />
        Créer mon service
      </Button>
    </div>
  );

  const renderCreateForm = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Mail className="w-7 h-7 text-primary" />
        </div>
        <h3 className="font-semibold text-foreground mb-2">
          Créer votre service professionnel
        </h3>
        <p className="text-sm text-muted-foreground">
          Pour créer votre service, vous devez utiliser une adresse email différente de celle de votre compte actuel.
        </p>
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-amber-800 dark:text-amber-200 mb-1">
              Pourquoi un email différent ?
            </p>
            <p className="text-amber-700 dark:text-amber-300">
              Cette séparation permet de mieux gérer votre activité professionnelle et de protéger votre compte personnel.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="service-email">Email pour votre service professionnel</Label>
        <Input
          id="service-email"
          type="email"
          placeholder="votre-service@exemple.com"
          value={newEmail}
          onChange={(e) => {
            setNewEmail(e.target.value);
            if (emailError) setEmailError('');
          }}
          className={cn(emailError && 'border-destructive')}
        />
        {emailError && (
          <p className="text-sm text-destructive">{emailError}</p>
        )}
        {user?.email && (
          <p className="text-xs text-muted-foreground">
            Votre email actuel : {user.email}
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <Button 
          variant="outline" 
          onClick={handleBackToList}
          className="flex-1"
          disabled={isSubmitting}
        >
          Retour
        </Button>
        <Button 
          onClick={handleEmailSubmit}
          className="flex-1 gap-2"
          disabled={isSubmitting || !newEmail}
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ArrowRight className="w-4 h-4" />
          )}
          Continuer
        </Button>
      </div>
    </div>
  );

  const renderServicesList = () => (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un service..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Services list */}
      <div className="max-h-[350px] overflow-y-auto space-y-3 pr-1">
        {filteredServices.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            Aucun service trouvé pour "{searchQuery}"
          </div>
        ) : (
          filteredServices.map((service) => (
            <Card
              key={service.id}
              className={cn(
                'cursor-pointer transition-all duration-200',
                'hover:border-primary/50 hover:shadow-md'
              )}
              onClick={() => handleServiceClick(service.id)}
            >
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  {/* Logo/Icon */}
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shrink-0">
                    {service.logo_url ? (
                      <img 
                        src={service.logo_url} 
                        alt={service.business_name}
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                    ) : (
                      <Store className="w-6 h-6 text-primary" />
                    )}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-semibold text-foreground text-sm truncate">
                          {service.business_name}
                        </h4>
                        {service.service_type && (
                          <Badge variant="secondary" className="text-xs mt-1">
                            {service.service_type.name}
                          </Badge>
                        )}
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </div>
                    
                    {service.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                        {service.description}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      {service.rating > 0 && (
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                          {service.rating.toFixed(1)}
                          {service.total_reviews > 0 && (
                            <span>({service.total_reviews})</span>
                          )}
                        </span>
                      )}
                      {service.address && (
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">{service.address}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create service button */}
      <div className="pt-3 border-t">
        <Button 
          variant="outline" 
          onClick={handleCreateServiceClick}
          className="w-full gap-2"
        >
          <Plus className="w-4 h-4" />
          Créer mon propre service
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            {showCreateForm ? 'Créer un service' : 'Services disponibles'}
          </DialogTitle>
          <DialogDescription>
            {showCreateForm 
              ? 'Configurez votre nouveau service professionnel'
              : 'Explorez les services professionnels ou créez le vôtre'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : showCreateForm ? (
            renderCreateForm()
          ) : services.length === 0 ? (
            renderEmptyState()
          ) : (
            renderServicesList()
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
