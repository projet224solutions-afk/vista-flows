/**
 * 📱 APPLICATION MOBILE 224SOLUTIONS
 * Application React Native complète avec Firebase et Supabase
 */

import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import {
  StatusBar,
  StyleSheet,
  Alert,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { QueryClient, QueryClientProvider } from 'react-query';
import Toast from 'react-native-toast-message';
import messaging from '@react-native-firebase/messaging';
import auth from '@react-native-firebase/auth';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Services
import { FirebaseService } from './src/services/FirebaseService';
import { SupabaseService } from './src/services/SupabaseService';
import { WalletService } from './src/services/WalletService';
import { NotificationService } from './src/services/NotificationService';

// Contexts
import { AuthProvider } from './src/contexts/AuthContext';
import { WalletProvider } from './src/contexts/WalletContext';
import { NotificationProvider } from './src/contexts/NotificationContext';

// Screens
import SplashScreen from './src/screens/SplashScreen';
import AuthScreen from './src/screens/auth/AuthScreen';
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import BiometricSetupScreen from './src/screens/auth/BiometricSetupScreen';

// Main App Screens
import HomeScreen from './src/screens/main/HomeScreen';
import WalletScreen from './src/screens/wallet/WalletScreen';
import TransferScreen from './src/screens/wallet/TransferScreen';
import WithdrawScreen from './src/screens/wallet/WithdrawScreen';
import TransactionHistoryScreen from './src/screens/wallet/TransactionHistoryScreen';

import MarketplaceScreen from './src/screens/marketplace/MarketplaceScreen';
import ProductDetailsScreen from './src/screens/marketplace/ProductDetailsScreen';
import CartScreen from './src/screens/marketplace/CartScreen';
import OrdersScreen from './src/screens/marketplace/OrdersScreen';

import MessagesScreen from './src/screens/messages/MessagesScreen';
import ChatScreen from './src/screens/messages/ChatScreen';

import TrackingScreen from './src/screens/tracking/TrackingScreen';
import DeliveryMapScreen from './src/screens/tracking/DeliveryMapScreen';

import ProfileScreen from './src/screens/profile/ProfileScreen';
import SettingsScreen from './src/screens/profile/SettingsScreen';
import NotificationsScreen from './src/screens/profile/NotificationsScreen';

import SyndicateScreen from './src/screens/syndicate/SyndicateScreen';
import SyndicateDashboardScreen from './src/screens/syndicate/SyndicateDashboardScreen';

// Navigation Types
import { RootStackParamList, MainTabParamList } from './src/types/navigation';

// Icons
import Icon from 'react-native-vector-icons/MaterialIcons';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const Drawer = createDrawerNavigator();

// Query Client pour React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

/**
 * Navigation par onglets principale
 */
function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Home':
              iconName = 'home';
              break;
            case 'Wallet':
              iconName = 'account-balance-wallet';
              break;
            case 'Marketplace':
              iconName = 'shopping-cart';
              break;
            case 'Messages':
              iconName = 'message';
              break;
            case 'Profile':
              iconName = 'person';
              break;
            default:
              iconName = 'help';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ title: 'Accueil' }}
      />
      <Tab.Screen 
        name="Wallet" 
        component={WalletScreen}
        options={{ title: 'Wallet' }}
      />
      <Tab.Screen 
        name="Marketplace" 
        component={MarketplaceScreen}
        options={{ title: 'Marketplace' }}
      />
      <Tab.Screen 
        name="Messages" 
        component={MessagesScreen}
        options={{ title: 'Messages' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ title: 'Profil' }}
      />
    </Tab.Navigator>
  );
}

/**
 * Navigation principale de l'application
 */
function AppNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerStyle: {
          backgroundColor: '#3B82F6',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      {/* Écrans d'initialisation */}
      <Stack.Screen 
        name="Splash" 
        component={SplashScreen}
        options={{ headerShown: false }}
      />
      
      {/* Écrans d'authentification */}
      <Stack.Screen 
        name="Auth" 
        component={AuthScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Login" 
        component={LoginScreen}
        options={{ title: 'Connexion' }}
      />
      <Stack.Screen 
        name="Register" 
        component={RegisterScreen}
        options={{ title: 'Inscription' }}
      />
      <Stack.Screen 
        name="BiometricSetup" 
        component={BiometricSetupScreen}
        options={{ title: 'Configuration biométrique' }}
      />
      
      {/* Navigation principale */}
      <Stack.Screen 
        name="MainTabs" 
        component={MainTabNavigator}
        options={{ headerShown: false }}
      />
      
      {/* Écrans de wallet */}
      <Stack.Screen 
        name="Transfer" 
        component={TransferScreen}
        options={{ title: 'Transfert d\'argent' }}
      />
      <Stack.Screen 
        name="Withdraw" 
        component={WithdrawScreen}
        options={{ title: 'Retrait' }}
      />
      <Stack.Screen 
        name="TransactionHistory" 
        component={TransactionHistoryScreen}
        options={{ title: 'Historique des transactions' }}
      />
      
      {/* Écrans marketplace */}
      <Stack.Screen 
        name="ProductDetails" 
        component={ProductDetailsScreen}
        options={{ title: 'Détails du produit' }}
      />
      <Stack.Screen 
        name="Cart" 
        component={CartScreen}
        options={{ title: 'Panier' }}
      />
      <Stack.Screen 
        name="Orders" 
        component={OrdersScreen}
        options={{ title: 'Mes commandes' }}
      />
      
      {/* Écrans de messagerie */}
      <Stack.Screen 
        name="Chat" 
        component={ChatScreen}
        options={({ route }) => ({ 
          title: route.params?.contactName || 'Chat' 
        })}
      />
      
      {/* Écrans de suivi */}
      <Stack.Screen 
        name="Tracking" 
        component={TrackingScreen}
        options={{ title: 'Suivi de livraison' }}
      />
      <Stack.Screen 
        name="DeliveryMap" 
        component={DeliveryMapScreen}
        options={{ title: 'Carte de livraison' }}
      />
      
      {/* Écrans de profil */}
      <Stack.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{ title: 'Paramètres' }}
      />
      <Stack.Screen 
        name="Notifications" 
        component={NotificationsScreen}
        options={{ title: 'Notifications' }}
      />
      
      {/* Écrans syndicat */}
      <Stack.Screen 
        name="Syndicate" 
        component={SyndicateScreen}
        options={{ title: 'Bureau Syndical' }}
      />
      <Stack.Screen 
        name="SyndicateDashboard" 
        component={SyndicateDashboardScreen}
        options={{ title: 'Tableau de bord syndical' }}
      />
    </Stack.Navigator>
  );
}

/**
 * Composant principal de l'application
 */
export default function App(): JSX.Element {
  const [isLoading, setIsLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    initializeApp();
  }, []);

  /**
   * Initialise l'application
   */
  const initializeApp = async () => {
    try {
      console.log('🚀 Initialisation de l\'application 224Solutions...');

      // Demander les permissions
      await requestPermissions();

      // Initialiser Firebase
      await FirebaseService.initialize();

      // Initialiser Supabase
      await SupabaseService.initialize();

      // Initialiser les notifications
      await NotificationService.initialize();

      // Configurer les notifications Firebase
      await setupFirebaseMessaging();

      console.log('✅ Application initialisée avec succès');
    } catch (error) {
      console.error('❌ Erreur initialisation app:', error);
      Alert.alert(
        'Erreur d\'initialisation',
        'Une erreur est survenue lors du démarrage de l\'application.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
      setInitializing(false);
    }
  };

  /**
   * Demande les permissions nécessaires
   */
  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const permissions = [
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
          PermissionsAndroid.PERMISSIONS.CAMERA,
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
        ];

        const granted = await PermissionsAndroid.requestMultiple(permissions);
        
        console.log('📱 Permissions accordées:', granted);
      } catch (error) {
        console.error('❌ Erreur permissions:', error);
      }
    }
  };

  /**
   * Configure Firebase Cloud Messaging
   */
  const setupFirebaseMessaging = async () => {
    try {
      // Demander permission pour les notifications
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('✅ Permission notifications accordée');

        // Obtenir le token FCM
        const fcmToken = await messaging().getToken();
        console.log('📱 Token FCM:', fcmToken);

        // Enregistrer le token sur le serveur
        await NotificationService.registerFCMToken(fcmToken);

        // Écouter les messages en premier plan
        messaging().onMessage(async remoteMessage => {
          console.log('📨 Message reçu en premier plan:', remoteMessage);
          NotificationService.handleForegroundMessage(remoteMessage);
        });

        // Écouter les messages en arrière-plan
        messaging().setBackgroundMessageHandler(async remoteMessage => {
          console.log('📨 Message reçu en arrière-plan:', remoteMessage);
        });

        // Écouter les notifications cliquées
        messaging().onNotificationOpenedApp(remoteMessage => {
          console.log('📱 Notification cliquée:', remoteMessage);
          NotificationService.handleNotificationClick(remoteMessage);
        });

        // Vérifier si l'app a été ouverte depuis une notification
        messaging()
          .getInitialNotification()
          .then(remoteMessage => {
            if (remoteMessage) {
              console.log('📱 App ouverte depuis notification:', remoteMessage);
              NotificationService.handleNotificationClick(remoteMessage);
            }
          });
      } else {
        console.log('❌ Permission notifications refusée');
      }
    } catch (error) {
      console.error('❌ Erreur configuration FCM:', error);
    }
  };

  if (initializing || isLoading) {
    return <SplashScreen />;
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <WalletProvider>
            <NotificationProvider>
              <StatusBar
                barStyle="light-content"
                backgroundColor="#3B82F6"
                translucent={false}
              />
              <NavigationContainer>
                <AppNavigator />
              </NavigationContainer>
              <Toast />
            </NotificationProvider>
          </WalletProvider>
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
