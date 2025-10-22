/**
 * SERVICE FIRESTORE POUR TAXI MOTO
 * Gestion des données en temps réel avec Firestore
 * 224Solutions - Taxi-Moto System
 */

import {
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    getDoc,
    getDocs,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    serverTimestamp,
    Timestamp,
    GeoPoint,
    writeBatch
} from 'firebase/firestore';
import { db } from './firebaseConfig';

export interface Driver {
    id: string;
    userId: string;
    name: string;
    phone: string;
    email: string;
    status: 'online' | 'offline' | 'busy' | 'on_trip';
    location: {
        latitude: number;
        longitude: number;
        accuracy?: number;
        heading?: number;
        speed?: number;
    };
    vehicle: {
        type: 'moto_economique' | 'moto_rapide' | 'moto_premium';
        brand: string;
        model: string;
        year: number;
        color: string;
        licensePlate: string;
    };
    rating: number;
    totalRides: number;
    totalEarnings: number;
    isActive: boolean;
    lastSeen: Timestamp;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface Ride {
    id: string;
    customerId: string;
    driverId?: string;
    status: 'requested' | 'accepted' | 'driver_arriving' | 'picked_up' | 'in_progress' | 'completed' | 'cancelled';
    pickup: {
        address: string;
        location: {
            latitude: number;
            longitude: number;
        };
    };
    dropoff: {
        address: string;
        location: {
            latitude: number;
            longitude: number;
        };
    };
    pricing: {
        basePrice: number;
        distancePrice: number;
        timePrice: number;
        totalPrice: number;
        driverShare: number;
        platformFee: number;
        surgeMultiplier: number;
    };
    distance: number;
    estimatedDuration: number;
    actualDuration?: number;
    paymentMethod: 'wallet_224' | 'mobile_money' | 'card' | 'cash';
    paymentStatus: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
    transactionId?: string;
    requestedAt: Timestamp;
    acceptedAt?: Timestamp;
    driverArrivingAt?: Timestamp;
    pickedUpAt?: Timestamp;
    startedAt?: Timestamp;
    completedAt?: Timestamp;
    cancelledAt?: Timestamp;
    customerRating?: number;
    driverRating?: number;
    customerFeedback?: string;
    driverFeedback?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface LocationUpdate {
    id: string;
    rideId: string;
    driverId: string;
    location: {
        latitude: number;
        longitude: number;
        accuracy?: number;
        heading?: number;
        speed?: number;
    };
    timestamp: Timestamp;
}

class FirestoreService {
    private listeners: Map<string, () => void> = new Map();

    /**
     * Écoute les conducteurs en ligne dans une zone
     */
    listenToNearbyDrivers(
        latitude: number,
        longitude: number,
        radius: number,
        onUpdate: (drivers: Driver[]) => void
    ): () => void {
        const driversRef = collection(db, 'drivers');
        const q = query(
            driversRef,
            where('status', '==', 'online'),
            where('isActive', '==', true)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const drivers: Driver[] = [];

            snapshot.forEach((doc) => {
                const data = doc.data() as Driver;
                const distance = this.calculateDistance(
                    latitude, longitude,
                    data.location.latitude, data.location.longitude
                );

                if (distance <= radius) {
                    drivers.push({
                        ...data,
                        id: doc.id
                    });
                }
            });

            // Trier par distance
            drivers.sort((a, b) => {
                const distanceA = this.calculateDistance(
                    latitude, longitude,
                    a.location.latitude, a.location.longitude
                );
                const distanceB = this.calculateDistance(
                    latitude, longitude,
                    b.location.latitude, b.location.longitude
                );
                return distanceA - distanceB;
            });

            onUpdate(drivers);
        });

        this.listeners.set('nearbyDrivers', unsubscribe);
        return unsubscribe;
    }

    /**
     * Écoute les demandes de course pour un conducteur
     */
    listenToRideRequests(
        driverId: string,
        onUpdate: (rides: Ride[]) => void
    ): () => void {
        const ridesRef = collection(db, 'rides');
        const q = query(
            ridesRef,
            where('status', '==', 'requested'),
            orderBy('requestedAt', 'desc'),
            limit(10)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const rides: Ride[] = [];

            snapshot.forEach((doc) => {
                rides.push({
                    ...doc.data() as Ride,
                    id: doc.id
                });
            });

            onUpdate(rides);
        });

        this.listeners.set('rideRequests', unsubscribe);
        return unsubscribe;
    }

    /**
     * Écoute une course spécifique
     */
    listenToRide(
        rideId: string,
        onUpdate: (ride: Ride | null) => void
    ): () => void {
        const rideRef = doc(db, 'rides', rideId);

        const unsubscribe = onSnapshot(rideRef, (snapshot) => {
            if (snapshot.exists()) {
                onUpdate({
                    ...snapshot.data() as Ride,
                    id: snapshot.id
                });
            } else {
                onUpdate(null);
            }
        });

        this.listeners.set(`ride_${rideId}`, unsubscribe);
        return unsubscribe;
    }

    /**
     * Écoute les mises à jour de position d'un conducteur
     */
    listenToDriverLocation(
        driverId: string,
        rideId: string,
        onUpdate: (location: LocationUpdate) => void
    ): () => void {
        const locationsRef = collection(db, 'locationUpdates');
        const q = query(
            locationsRef,
            where('driverId', '==', driverId),
            where('rideId', '==', rideId),
            orderBy('timestamp', 'desc'),
            limit(1)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const doc = snapshot.docs[0];
                onUpdate({
                    ...doc.data() as LocationUpdate,
                    id: doc.id
                });
            }
        });

        this.listeners.set(`driverLocation_${driverId}_${rideId}`, unsubscribe);
        return unsubscribe;
    }

    /**
     * Crée une nouvelle course
     */
    async createRide(rideData: Omit<Ride, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
        try {
            const ridesRef = collection(db, 'rides');
            const docRef = await addDoc(ridesRef, {
                ...rideData,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            console.log('Course créée:', docRef.id);
            return docRef.id;
        } catch (error) {
            console.error('Erreur création course:', error);
            throw error;
        }
    }

    /**
     * Met à jour une course
     */
    async updateRide(rideId: string, updates: Partial<Ride>): Promise<void> {
        try {
            const rideRef = doc(db, 'rides', rideId);
            await updateDoc(rideRef, {
                ...updates,
                updatedAt: serverTimestamp()
            });

            console.log('Course mise à jour:', rideId);
        } catch (error) {
            console.error('Erreur mise à jour course:', error);
            throw error;
        }
    }

    /**
     * Met à jour le statut d'un conducteur
     */
    async updateDriverStatus(
        driverId: string,
        status: Driver['status'],
        location?: Driver['location']
    ): Promise<void> {
        try {
            const driverRef = doc(db, 'drivers', driverId);
            const updates: any = {
                status,
                lastSeen: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            if (location) {
                updates.location = location;
            }

            await updateDoc(driverRef, updates);
            console.log('Statut conducteur mis à jour:', driverId, status);
        } catch (error) {
            console.error('Erreur mise à jour statut conducteur:', error);
            throw error;
        }
    }

    /**
     * Ajoute une mise à jour de position
     */
    async addLocationUpdate(
        rideId: string,
        driverId: string,
        location: LocationUpdate['location']
    ): Promise<void> {
        try {
            const locationsRef = collection(db, 'locationUpdates');
            await addDoc(locationsRef, {
                rideId,
                driverId,
                location,
                timestamp: serverTimestamp()
            });
        } catch (error) {
            console.error('Erreur ajout position:', error);
            throw error;
        }
    }

    /**
     * Accepte une course
     */
    async acceptRide(rideId: string, driverId: string): Promise<void> {
        try {
            const batch = writeBatch(db);

            // Mettre à jour la course
            const rideRef = doc(db, 'rides', rideId);
            batch.update(rideRef, {
                driverId,
                status: 'accepted',
                acceptedAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            // Mettre à jour le statut du conducteur
            const driverRef = doc(db, 'drivers', driverId);
            batch.update(driverRef, {
                status: 'busy',
                updatedAt: serverTimestamp()
            });

            await batch.commit();
            console.log('Course acceptée:', rideId, 'par conducteur:', driverId);
        } catch (error) {
            console.error('Erreur acceptation course:', error);
            throw error;
        }
    }

    /**
     * Termine une course
     */
    async completeRide(rideId: string, driverId: string): Promise<void> {
        try {
            const batch = writeBatch(db);

            // Mettre à jour la course
            const rideRef = doc(db, 'rides', rideId);
            batch.update(rideRef, {
                status: 'completed',
                completedAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            // Mettre à jour le statut du conducteur
            const driverRef = doc(db, 'drivers', driverId);
            batch.update(driverRef, {
                status: 'online',
                updatedAt: serverTimestamp()
            });

            await batch.commit();
            console.log('Course terminée:', rideId);
        } catch (error) {
            console.error('Erreur finalisation course:', error);
            throw error;
        }
    }

    /**
     * Annule une course
     */
    async cancelRide(rideId: string, reason?: string): Promise<void> {
        try {
            const rideRef = doc(db, 'rides', rideId);
            await updateDoc(rideRef, {
                status: 'cancelled',
                cancelledAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                cancellationReason: reason
            });

            console.log('Course annulée:', rideId);
        } catch (error) {
            console.error('Erreur annulation course:', error);
            throw error;
        }
    }

    /**
     * Obtient l'historique des courses d'un utilisateur
     */
    async getUserRideHistory(
        userId: string,
        limitCount: number = 50
    ): Promise<Ride[]> {
        try {
            const ridesRef = collection(db, 'rides');
            const q = query(
                ridesRef,
                where('customerId', '==', userId),
                orderBy('requestedAt', 'desc'),
                limit(limitCount)
            );

            const snapshot = await getDocs(q);
            const rides: Ride[] = [];

            snapshot.forEach((doc) => {
                rides.push({
                    ...doc.data() as Ride,
                    id: doc.id
                });
            });

            return rides;
        } catch (error) {
            console.error('Erreur récupération historique:', error);
            return [];
        }
    }

    /**
     * Obtient l'historique des courses d'un conducteur
     */
    async getDriverRideHistory(
        driverId: string,
        limitCount: number = 50
    ): Promise<Ride[]> {
        try {
            const ridesRef = collection(db, 'rides');
            const q = query(
                ridesRef,
                where('driverId', '==', driverId),
                orderBy('requestedAt', 'desc'),
                limit(limitCount)
            );

            const snapshot = await getDocs(q);
            const rides: Ride[] = [];

            snapshot.forEach((doc) => {
                rides.push({
                    ...doc.data() as Ride,
                    id: doc.id
                });
            });

            return rides;
        } catch (error) {
            console.error('Erreur récupération historique conducteur:', error);
            return [];
        }
    }

    /**
     * Calcule la distance entre deux points
     */
    private calculateDistance(
        lat1: number, lng1: number,
        lat2: number, lng2: number
    ): number {
        const R = 6371; // Rayon de la Terre en km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    /**
     * Nettoie tous les listeners
     */
    cleanup(): void {
        this.listeners.forEach((unsubscribe) => {
            unsubscribe();
        });
        this.listeners.clear();
    }
}

// Instance singleton
export const firestoreService = new FirestoreService();
