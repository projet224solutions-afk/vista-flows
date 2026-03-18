/**
 * 🧠 WIDGET COMPLET DE RECOMMANDATIONS - 224SOLUTIONS
 * Combine toutes les sections de recommandation
 */

import { ProductRecommendationSection } from './ProductRecommendationSection';
import {
  usePersonalizedRecommendations,
  useSimilarProducts,
  useAlsoBoughtProducts,
  useTrackProductView,
} from '@/hooks/useProductRecommendations';

interface RecommendationsWidgetProps {
  /** ID du produit en cours de consultation (pour similaires + aussi achetés) */
  currentProductId?: string | null;
  /** Afficher les recommandations personnalisées */
  showPersonalized?: boolean;
  /** Afficher les produits similaires */
  showSimilar?: boolean;
  /** Afficher les co-achats */
  showAlsoBought?: boolean;
  /** Callback quand un produit est cliqué */
  onProductClick?: (productId: string) => void;
  /** Callback ajout au panier */
  onAddToCart?: (productId: string) => void;
  className?: string;
}

export function RecommendationsWidget({
  currentProductId,
  showPersonalized = true,
  showSimilar = true,
  showAlsoBought = true,
  onProductClick,
  onAddToCart,
  className
}: RecommendationsWidgetProps) {
  // Track la vue du produit courant
  useTrackProductView(currentProductId);

  const { data: personalized, isLoading: loadingPersonalized } = usePersonalizedRecommendations(12);
  const { data: similar, isLoading: loadingSimilar } = useSimilarProducts(currentProductId, 10);
  const { data: alsoBought, isLoading: loadingAlsoBought } = useAlsoBoughtProducts(currentProductId, 8);

  return (
    <div className={className}>
      {/* Recommandations personnalisées */}
      {showPersonalized && (
        <ProductRecommendationSection
          title="Recommandé pour vous"
          icon="sparkles"
          products={(personalized || []).map(p => ({ ...p, reason: p.reason }))}
          loading={loadingPersonalized}
          onProductClick={onProductClick}
          onAddToCart={onAddToCart}
        />
      )}

      {/* Produits similaires */}
      {showSimilar && currentProductId && (
        <ProductRecommendationSection
          title="Produits similaires"
          subtitle="Vous pourriez aussi aimer"
          icon="star"
          products={similar || []}
          loading={loadingSimilar}
          onProductClick={onProductClick}
          onAddToCart={onAddToCart}
        />
      )}

      {/* Achetés ensemble */}
      {showAlsoBought && currentProductId && (
        <ProductRecommendationSection
          title="Les clients ont aussi acheté"
          subtitle="Souvent achetés ensemble"
          icon="shopping"
          products={alsoBought || []}
          loading={loadingAlsoBought}
          onProductClick={onProductClick}
          onAddToCart={onAddToCart}
        />
      )}
    </div>
  );
}

export default RecommendationsWidget;
