/**
 * Firestore Service - Stub temporaire
 */

export interface Driver {
  id: string;
  name: string;
  rating: number;
}

export interface Ride {
  id: string;
  status: string;
  distance: number;
}

export const firestoreService = {
  subscribeToTaxiRequests: () => ({ unsubscribe: () => {} }),
  updateTaxiRequestStatus: async () => {},
  createTaxiRequest: async () => {}
};

export const subscribeToTaxiRequests = () => ({ unsubscribe: () => {} });
export const updateTaxiRequestStatus = async () => {};
export const createTaxiRequest = async () => {};
