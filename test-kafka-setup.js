#!/usr/bin/env node

/**
 * 🔄 Script de Test Kafka pour 224Solutions
 * 
 * Ce script vérifie si Kafka peut être configuré et opérationnel
 * pour votre application 224Solutions.
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

console.log('🔄 Test de configuration Kafka pour 224Solutions\n');

// Configuration Kafka pour 224Solutions
const KAFKA_CONFIG = {
    topics: [
        'orders.created',
        'orders.updated',
        'delivery.tracking',
        'payments.completed',
        'notifications.push',
        'analytics.events'
    ],
    brokers: ['localhost:9092'],
    clientId: '224solutions-test'
};

// Vérifier si Docker est disponible
async function checkDocker() {
    console.log('🐳 Vérification de Docker...');

    return new Promise((resolve) => {
        const docker = spawn('docker', ['--version'], { stdio: 'pipe' });

        docker.on('close', (code) => {
            if (code === 0) {
                console.log('   ✅ Docker disponible');
                resolve(true);
            } else {
                console.log('   ❌ Docker non disponible');
                console.log('   💡 Installez Docker: https://docker.com/get-started');
                resolve(false);
            }
        });

        docker.on('error', () => {
            console.log('   ❌ Docker non trouvé');
            resolve(false);
        });
    });
}

// Vérifier si Node.js supporte les modules ES
async function checkNodeVersion() {
    console.log('🟢 Vérification de Node.js...');

    const version = process.version;
    const majorVersion = parseInt(version.slice(1).split('.')[0]);

    if (majorVersion >= 14) {
        console.log(`   ✅ Node.js ${version} compatible`);
        return true;
    } else {
        console.log(`   ❌ Node.js ${version} trop ancien (minimum: 14.x)`);
        return false;
    }
}

// Créer le docker-compose.yml pour Kafka
async function createKafkaCompose() {
    console.log('📄 Création du docker-compose.yml pour Kafka...');

    const composeContent = `version: '3.8'

services:
  zookeeper:
    image: confluentinc/cp-zookeeper:latest
    container_name: 224solutions-zookeeper
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
    ports:
      - "2181:2181"
    networks:
      - 224solutions-network

  kafka:
    image: confluentinc/cp-kafka:latest
    container_name: 224solutions-kafka
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
      - "29092:29092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092,PLAINTEXT_HOST://localhost:29092
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT
      KAFKA_INTER_BROKER_LISTENER_NAME: PLAINTEXT
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: true
    networks:
      - 224solutions-network

  kafka-ui:
    image: provectuslabs/kafka-ui:latest
    container_name: 224solutions-kafka-ui
    depends_on:
      - kafka
    ports:
      - "8080:8080"
    environment:
      KAFKA_CLUSTERS_0_NAME: 224solutions-local
      KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS: kafka:9092
    networks:
      - 224solutions-network

networks:
  224solutions-network:
    driver: bridge

# 📊 Volumes pour persistance des données
volumes:
  kafka-data:
  zookeeper-data:
`;

    try {
        await fs.writeFile('docker-compose.kafka.yml', composeContent);
        console.log('   ✅ docker-compose.kafka.yml créé');
        return true;
    } catch (error) {
        console.log('   ❌ Erreur création docker-compose:', error.message);
        return false;
    }
}

// Créer un exemple de service Kafka
async function createKafkaService() {
    console.log('⚙️ Création du service Kafka exemple...');

    const serviceContent = `/**
 * 🔄 Service Kafka pour 224Solutions
 * 
 * Ce service gère tous les événements de messaging
 * pour la plateforme 224Solutions.
 */

import { Kafka, Producer, Consumer, logLevel } from 'kafkajs';

export class Kafka224Service {
  private kafka: Kafka;
  private producer: Producer;
  private consumers: Map<string, Consumer> = new Map();

  constructor() {
    this.kafka = new Kafka({
      clientId: '224solutions-app',
      brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
      logLevel: logLevel.ERROR, // Réduire les logs en prod
    });

    this.producer = this.kafka.producer({
      maxInFlightRequests: 1,
      idempotent: true,
      transactionTimeout: 30000,
    });
  }

  // Initialiser le service
  async connect() {
    console.log('🔄 Connexion à Kafka...');
    await this.producer.connect();
    console.log('✅ Kafka connecté');
  }

  // 🛒 ÉVÉNEMENTS COMMANDES
  async publishOrderCreated(order) {
    await this.producer.send({
      topic: 'orders.created',
      messages: [{
        key: order.id,
        value: JSON.stringify({
          orderId: order.id,
          customerId: order.customerId,
          vendorId: order.vendorId,
          amount: order.total,
          items: order.items,
          timestamp: new Date().toISOString(),
          source: '224solutions-webapp'
        }),
        headers: {
          'content-type': 'application/json',
          'source': '224solutions',
          'version': '1.0'
        }
      }]
    });
    
    console.log(\`📦 Commande créée: \${order.id}\`);
  }

  async publishOrderUpdated(orderId, status, metadata = {}) {
    await this.producer.send({
      topic: 'orders.updated',
      messages: [{
        key: orderId,
        value: JSON.stringify({
          orderId,
          status,
          updatedAt: new Date().toISOString(),
          metadata
        })
      }]
    });
    
    console.log(\`📝 Commande mise à jour: \${orderId} → \${status}\`);
  }

  // 🚚 ÉVÉNEMENTS LIVRAISON
  async publishDeliveryTracking(deliveryId, location, status) {
    await this.producer.send({
      topic: 'delivery.tracking',
      messages: [{
        key: deliveryId,
        value: JSON.stringify({
          deliveryId,
          latitude: location.lat,
          longitude: location.lng,
          status,
          timestamp: new Date().toISOString(),
          accuracy: location.accuracy || 10
        })
      }]
    });
  }

  // 💰 ÉVÉNEMENTS PAIEMENT
  async publishPaymentCompleted(payment) {
    await this.producer.send({
      topic: 'payments.completed',
      messages: [{
        key: payment.orderId,
        value: JSON.stringify({
          paymentId: payment.id,
          orderId: payment.orderId,
          amount: payment.amount,
          currency: payment.currency || 'XOF',
          method: payment.method,
          timestamp: new Date().toISOString()
        })
      }]
    });
  }

  // 🔔 ÉVÉNEMENTS NOTIFICATIONS
  async publishNotification(userId, notification) {
    await this.producer.send({
      topic: 'notifications.push',
      messages: [{
        key: userId,
        value: JSON.stringify({
          userId,
          title: notification.title,
          body: notification.body,
          type: notification.type || 'info',
          data: notification.data || {},
          timestamp: new Date().toISOString()
        })
      }]
    });
  }

  // 📊 CONSUMER POUR ANALYTICS
  async subscribeToAnalytics() {
    const consumer = this.kafka.consumer({ 
      groupId: '224solutions-analytics'
    });
    
    await consumer.connect();
    await consumer.subscribe({ 
      topics: ['orders.created', 'delivery.tracking', 'payments.completed']
    });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const data = JSON.parse(message.value.toString());
        
        // Traitement analytics
        switch (topic) {
          case 'orders.created':
            await this.updateOrderAnalytics(data);
            break;
          case 'delivery.tracking':
            await this.updateDeliveryAnalytics(data);
            break;
          case 'payments.completed':
            await this.updatePaymentAnalytics(data);
            break;
        }
      },
    });

    this.consumers.set('analytics', consumer);
  }

  // 📈 Méthodes analytics (à implémenter)
  async updateOrderAnalytics(orderData) {
    // Mettre à jour les métriques de commandes
    console.log('📊 Analytics commande:', orderData.orderId);
  }

  async updateDeliveryAnalytics(deliveryData) {
    // Mettre à jour les métriques de livraison
    console.log('📊 Analytics livraison:', deliveryData.deliveryId);
  }

  async updatePaymentAnalytics(paymentData) {
    // Mettre à jour les métriques de paiement
    console.log('📊 Analytics paiement:', paymentData.paymentId);
  }

  // Fermer toutes les connexions
  async disconnect() {
    console.log('🔄 Fermeture des connexions Kafka...');
    
    for (const [name, consumer] of this.consumers) {
      await consumer.disconnect();
      console.log(\`✅ Consumer \${name} fermé\`);
    }
    
    await this.producer.disconnect();
    console.log('✅ Producer fermé');
  }
}

// Instance singleton
export const kafka224 = new Kafka224Service();

// Exemple d'utilisation
/*
import { kafka224 } from './kafkaService.js';

// Initialiser
await kafka224.connect();

// Publier une commande
await kafka224.publishOrderCreated({
  id: 'ORD-2024-001',
  customerId: 'CUST-123',
  vendorId: 'VEND-456', 
  total: 15000,
  items: [{ name: 'Smartphone', quantity: 1, price: 15000 }]
});

// Démarrer l'analytics
await kafka224.subscribeToAnalytics();
*/`;

    try {
        await fs.mkdir('src/services', { recursive: true });
        await fs.writeFile('src/services/kafka224Service.js', serviceContent);
        console.log('   ✅ Service Kafka exemple créé');
        return true;
    } catch (error) {
        console.log('   ❌ Erreur création service:', error.message);
        return false;
    }
}

// Script de test Kafka
async function createTestScript() {
    console.log('🧪 Création du script de test...');

    const testContent = `#!/usr/bin/env node

/**
 * 🧪 Test de fonctionnement Kafka pour 224Solutions
 */

import { kafka224 } from './src/services/kafka224Service.js';

async function testKafka() {
  console.log('🧪 Démarrage des tests Kafka...');
  
  try {
    // Connexion
    await kafka224.connect();
    console.log('✅ Connexion réussie');
    
    // Test publication commande
    await kafka224.publishOrderCreated({
      id: 'TEST-ORD-001',
      customerId: 'TEST-CUST-001',
      vendorId: 'TEST-VEND-001',
      total: 25000,
      items: [
        { name: 'Test Product', quantity: 1, price: 25000 }
      ]
    });
    console.log('✅ Publication commande réussie');
    
    // Test mise à jour commande
    await kafka224.publishOrderUpdated('TEST-ORD-001', 'confirmed', {
      confirmedBy: 'TEST-ADMIN',
      reason: 'Test automatique'
    });
    console.log('✅ Mise à jour commande réussie');
    
    // Test tracking livraison
    await kafka224.publishDeliveryTracking('TEST-DEL-001', {
      lat: 14.6928,
      lng: -17.4467, // Dakar
      accuracy: 5
    }, 'in-transit');
    console.log('✅ Tracking livraison réussi');
    
    // Test paiement
    await kafka224.publishPaymentCompleted({
      id: 'TEST-PAY-001',
      orderId: 'TEST-ORD-001',
      amount: 25000,
      currency: 'XOF',
      method: 'mobile-money'
    });
    console.log('✅ Paiement publié avec succès');
    
    // Test notification
    await kafka224.publishNotification('TEST-USER-001', {
      title: 'Commande confirmée',
      body: 'Votre commande TEST-ORD-001 a été confirmée',
      type: 'order-update'
    });
    console.log('✅ Notification publiée');
    
    console.log('\\n🎉 Tous les tests Kafka réussis !');
    
  } catch (error) {
    console.error('❌ Erreur test Kafka:', error.message);
  } finally {
    // Fermeture connexions
    setTimeout(async () => {
      await kafka224.disconnect();
      process.exit(0);
    }, 2000);
  }
}

testKafka();`;

    try {
        await fs.writeFile('test-kafka.js', testContent);
        console.log('   ✅ Script de test créé');
        return true;
    } catch (error) {
        console.log('   ❌ Erreur création test:', error.message);
        return false;
    }
}

// Instructions d'installation
function showInstructions() {
    console.log('\n🚀 INSTRUCTIONS POUR KAFKA 224SOLUTIONS:');
    console.log('=====================================');
    console.log('');
    console.log('1️⃣ Installer les dépendances Kafka:');
    console.log('   npm install kafkajs');
    console.log('');
    console.log('2️⃣ Démarrer Kafka avec Docker:');
    console.log('   docker-compose -f docker-compose.kafka.yml up -d');
    console.log('');
    console.log('3️⃣ Vérifier que Kafka fonctionne:');
    console.log('   docker-compose -f docker-compose.kafka.yml ps');
    console.log('');
    console.log('4️⃣ Interface Web Kafka (optionnel):');
    console.log('   http://localhost:8080');
    console.log('');
    console.log('5️⃣ Tester le service Kafka:');
    console.log('   node test-kafka.js');
    console.log('');
    console.log('6️⃣ Arrêter Kafka:');
    console.log('   docker-compose -f docker-compose.kafka.yml down');
    console.log('');
    console.log('📚 Fichiers créés:');
    console.log('   ├── docker-compose.kafka.yml   (Configuration Docker)');
    console.log('   ├── src/services/kafka224Service.js  (Service principal)');
    console.log('   ├── test-kafka.js              (Tests)');
    console.log('   └── kafka-integration-plan.md  (Documentation)');
    console.log('');
    console.log('✨ Prochaines étapes:');
    console.log('   - Intégrer avec Supabase pour persistence');
    console.log('   - Ajouter monitoring et alertes');
    console.log('   - Créer dashboard analytics temps réel');
    console.log('   - Implémenter consumers pour business logic');
}

// Exécution principale
async function main() {
    const dockerOk = await checkDocker();
    const nodeOk = await checkNodeVersion();

    console.log('');

    if (!dockerOk || !nodeOk) {
        console.log('❌ Prérequis manquants. Veuillez installer:');
        if (!dockerOk) console.log('   - Docker: https://docker.com/get-started');
        if (!nodeOk) console.log('   - Node.js 14+: https://nodejs.org');
        process.exit(1);
    }

    // Créer les fichiers de configuration
    const composeOk = await createKafkaCompose();
    const serviceOk = await createKafkaService();
    const testOk = await createTestScript();

    console.log('');

    if (composeOk && serviceOk && testOk) {
        console.log('✅ Configuration Kafka créée avec succès !');
        showInstructions();
    } else {
        console.log('❌ Erreurs lors de la création des fichiers');
    }
}

main().catch(console.error);
