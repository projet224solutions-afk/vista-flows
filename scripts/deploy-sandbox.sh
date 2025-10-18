#!/bin/bash
# scripts/deploy-sandbox.sh
# Script de déploiement automatique vers l'environnement sandbox

set -e

echo "🚀 Déploiement vers l'environnement sandbox-pdg..."

# Variables
NAMESPACE="sandbox-pdg"
IMAGE_TAG=${1:-"latest"}
KUBECONFIG_PATH=${KUBECONFIG:-"~/.kube/config"}

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction de logging
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Vérifier les prérequis
check_prerequisites() {
    log "Vérification des prérequis..."
    
    # Vérifier kubectl
    if ! command -v kubectl &> /dev/null; then
        error "kubectl n'est pas installé"
    fi
    
    # Vérifier la connexion au cluster
    if ! kubectl cluster-info &> /dev/null; then
        error "Impossible de se connecter au cluster Kubernetes"
    fi
    
    # Vérifier que le namespace existe
    if ! kubectl get namespace $NAMESPACE &> /dev/null; then
        log "Création du namespace $NAMESPACE..."
        kubectl apply -f k8s/sandbox/namespace.yaml
    fi
    
    success "Prérequis vérifiés"
}

# Construire l'image Docker
build_image() {
    log "Construction de l'image Docker..."
    
    # Construire l'image
    docker build -t 224solutions:$IMAGE_TAG .
    
    # Tagger pour le registry (si configuré)
    if [ ! -z "$DOCKER_REGISTRY" ]; then
        docker tag 224solutions:$IMAGE_TAG $DOCKER_REGISTRY/224solutions:$IMAGE_TAG
        docker push $DOCKER_REGISTRY/224solutions:$IMAGE_TAG
    fi
    
    success "Image Docker construite: 224solutions:$IMAGE_TAG"
}

# Déployer les ressources Kubernetes
deploy_k8s_resources() {
    log "Déploiement des ressources Kubernetes..."
    
    # Appliquer les configurations
    kubectl apply -f k8s/sandbox/configmap.yaml
    kubectl apply -f k8s/sandbox/secrets.yaml
    kubectl apply -f k8s/sandbox/postgres.yaml
    kubectl apply -f k8s/sandbox/backend.yaml
    kubectl apply -f k8s/sandbox/frontend.yaml
    kubectl apply -f k8s/sandbox/ingress.yaml
    kubectl apply -f k8s/sandbox/cron-jobs.yaml
    
    success "Ressources Kubernetes déployées"
}

# Mettre à jour les images
update_images() {
    log "Mise à jour des images..."
    
    # Mettre à jour l'image du backend
    kubectl set image deployment/224solutions-backend backend=224solutions:$IMAGE_TAG -n $NAMESPACE
    
    # Mettre à jour l'image du frontend
    kubectl set image deployment/224solutions-frontend frontend=224solutions:$IMAGE_TAG -n $NAMESPACE
    
    success "Images mises à jour"
}

# Attendre que les déploiements soient prêts
wait_for_deployments() {
    log "Attente des déploiements..."
    
    # Attendre le backend
    kubectl rollout status deployment/224solutions-backend -n $NAMESPACE --timeout=300s
    
    # Attendre le frontend
    kubectl rollout status deployment/224solutions-frontend -n $NAMESPACE --timeout=300s
    
    success "Déploiements terminés"
}

# Exécuter les tests de fumée
run_smoke_tests() {
    log "Exécution des tests de fumée..."
    
    # Obtenir l'URL du service
    FRONTEND_URL=$(kubectl get ingress 224solutions-ingress -n $NAMESPACE -o jsonpath='{.spec.rules[0].host}')
    
    if [ -z "$FRONTEND_URL" ]; then
        warning "Impossible de déterminer l'URL du frontend"
        return
    fi
    
    # Tests de base
    log "Test de connectivité frontend..."
    if curl -f "http://$FRONTEND_URL" &> /dev/null; then
        success "Frontend accessible"
    else
        warning "Frontend non accessible"
    fi
    
    log "Test de connectivité API..."
    if curl -f "http://$FRONTEND_URL/api/health" &> /dev/null; then
        success "API accessible"
    else
        warning "API non accessible"
    fi
    
    success "Tests de fumée terminés"
}

# Afficher les informations de déploiement
show_deployment_info() {
    log "Informations de déploiement:"
    
    echo ""
    echo "📊 État des déploiements:"
    kubectl get deployments -n $NAMESPACE
    
    echo ""
    echo "🌐 Services:"
    kubectl get services -n $NAMESPACE
    
    echo ""
    echo "🔗 Ingress:"
    kubectl get ingress -n $NAMESPACE
    
    echo ""
    echo "📋 Pods:"
    kubectl get pods -n $NAMESPACE
    
    echo ""
    echo "🚀 URLs d'accès:"
    echo "Frontend: http://sandbox.224solutions.com"
    echo "API: http://api-sandbox.224solutions.com"
    echo "Dashboard PDG: http://sandbox.224solutions.com/pdg"
}

# Nettoyer en cas d'erreur
cleanup_on_error() {
    error "Erreur détectée, nettoyage en cours..."
    
    # Optionnel: supprimer les ressources en cas d'échec critique
    # kubectl delete namespace $NAMESPACE --ignore-not-found=true
    
    exit 1
}

# Fonction principale
main() {
    log "Début du déploiement sandbox pour 224Solutions"
    
    # Configurer le trap pour le nettoyage
    trap cleanup_on_error ERR
    
    # Étapes de déploiement
    check_prerequisites
    build_image
    deploy_k8s_resources
    update_images
    wait_for_deployments
    run_smoke_tests
    show_deployment_info
    
    success "Déploiement sandbox terminé avec succès!"
    echo ""
    echo "🎉 L'environnement sandbox est maintenant disponible!"
    echo "📱 Frontend: http://sandbox.224solutions.com"
    echo "🔧 API: http://api-sandbox.224solutions.com"
    echo "👑 PDG Dashboard: http://sandbox.224solutions.com/pdg"
    echo ""
    echo "📊 Pour surveiller les déploiements:"
    echo "kubectl get pods -n $NAMESPACE -w"
    echo ""
    echo "📋 Pour voir les logs:"
    echo "kubectl logs -f deployment/224solutions-backend -n $NAMESPACE"
    echo "kubectl logs -f deployment/224solutions-frontend -n $NAMESPACE"
}

# Exécuter le script
main "$@"
