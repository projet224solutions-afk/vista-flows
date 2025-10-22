const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// Service role client (server-side privileged)
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// === Nouveau : Création et recherche de courses ===
/**
 * @route POST /createRide
 * @desc Crée une nouvelle course Taxi Moto
 */
router.post('/createRide', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { pickup, dropoff, estimated_price } = req.body;

    if (!pickup || !dropoff) {
      return res.status(400).json({ success: false, message: 'pickup et dropoff requis' });
    }

    // Insère dans le schéma existant taxi_trips pour compatibilité avec les autres endpoints
    const { data, error } = await supabase
      .from('taxi_trips')
      .insert([
        {
          customer_id: userId,
          pickup_lat: pickup.lat ?? null,
          pickup_lng: pickup.lng ?? null,
          dropoff_lat: dropoff.lat ?? null,
          dropoff_lng: dropoff.lng ?? null,
          pickup_address: pickup.address ?? null,
          dropoff_address: dropoff.address ?? null,
          price_total: estimated_price ?? null,
          status: 'requested',
          requested_at: new Date().toISOString()
        }
      ])
      .select('*')
      .single();

    if (error) throw error;

    return res.status(201).json({
      success: true,
      ride: data
    });
  } catch (err) {
    console.error('❌ Error creating ride:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route GET /nearbyDrivers
 * @desc Retourne les chauffeurs disponibles dans un rayon donné
 */
router.get('/nearbyDrivers', async (req, res) => {
  try {
    const { lat, lng, radius = 5, vehicleType } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ success: false, message: 'lat et lng requis' });
    }

    const { data, error } = await supabase.rpc('find_nearby_drivers', {
      pickup_lat: parseFloat(lat),
      pickup_lon: parseFloat(lng),
      radius_km: parseFloat(radius),
      vehicle_type_filter: vehicleType ?? null
    });

    if (error) throw error;

    res.json({ success: true, drivers: data });
  } catch (err) {
    console.error('❌ Error fetching nearby drivers:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route POST /updateDriverStatus
 * @desc Met à jour le statut en ligne et la position du conducteur
 */
router.post('/updateDriverStatus', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { online, lat, lng } = req.body;
    const status = online ? 'available' : 'offline';

    const { data, error } = await supabase
      .from('taxi_drivers')
      .upsert({
        user_id: userId,
        is_online: !!online,
        status,
        last_lat: lat ?? null,
        last_lng: lng ?? null,
        last_seen: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })
      .select('id, is_online, status')
      .single();
    if (error) throw error;

    return res.json({ success: true, driver: data });
  } catch (err) {
    console.error('❌ Error updateDriverStatus:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route POST /track/update
 * @desc Ajoute un point de tracking pour une course
 */
router.post('/track/update', authMiddleware, async (req, res) => {
  try {
    const { rideId, latitude, longitude, eventType, notes } = req.body;
    if (!rideId || latitude == null || longitude == null) {
      return res.status(400).json({ success: false, message: 'rideId, latitude et longitude requis' });
    }

    const { error } = await supabase
      .from('ride_tracking')
      .insert({
        ride_id: rideId,
        latitude,
        longitude,
        event_type: eventType ?? null,
        notes: notes ?? null
      });
    if (error) throw error;

    return res.json({ success: true });
  } catch (err) {
    console.error('❌ Error track/update:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route GET /ride/:id/track
 * @desc Récupère l'historique de tracking d'une course
 */
router.get('/ride/:id/track', authMiddleware, async (req, res) => {
  try {
    const rideId = req.params.id;
    const { data, error } = await supabase
      .from('ride_tracking')
      .select('latitude, longitude, timestamp, event_type, notes')
      .eq('ride_id', rideId)
      .order('timestamp', { ascending: true });
    if (error) throw error;

    return res.json({ success: true, positions: data });
  } catch (err) {
    console.error('❌ Error get ride track:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /status - obtenir le statut driver + solde wallet
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: driver } = await supabase
      .from('taxi_drivers')
      .select('id, is_online, status, last_lat, last_lng, last_seen')
      .eq('user_id', userId)
      .maybeSingle();

    const { data: wallet } = await supabase
      .from('wallets')
      .select('id, balance, currency')
      .eq('user_id', userId)
      .maybeSingle();

    return res.json({ success: true, driver, wallet });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

// GET /stats - obtenir les statistiques détaillées du conducteur
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Statistiques du jour
    const today = new Date().toISOString().split('T')[0];
    const { data: todayTrips } = await supabase
      .from('taxi_trips')
      .select('price_total, driver_share')
      .eq('driver_id', userId)
      .gte('completed_at', today);

    const todayEarnings = todayTrips?.reduce((sum, trip) => sum + (trip.driver_share || 0), 0) || 0;
    const todayRides = todayTrips?.length || 0;

    // Statistiques globales
    const { data: allTrips } = await supabase
      .from('taxi_trips')
      .select('driver_share, rating')
      .eq('driver_id', userId)
      .eq('status', 'completed');

    const totalRides = allTrips?.length || 0;
    const totalEarnings = allTrips?.reduce((sum, trip) => sum + (trip.driver_share || 0), 0) || 0;
    const averageRating = allTrips?.length > 0
      ? allTrips.reduce((sum, trip) => sum + (trip.rating || 0), 0) / allTrips.length
      : 5.0;

    // Temps en ligne aujourd'hui
    const { data: driver } = await supabase
      .from('taxi_drivers')
      .select('last_seen, created_at')
      .eq('user_id', userId)
      .single();

    const onlineTime = driver?.last_seen
      ? Math.floor((new Date() - new Date(driver.last_seen)) / (1000 * 60)) // minutes
      : 0;

    const stats = {
      todayEarnings: Math.round(todayEarnings),
      todayRides,
      rating: Math.round(averageRating * 10) / 10,
      totalRides,
      totalEarnings: Math.round(totalEarnings),
      onlineTime: `${Math.floor(onlineTime / 60)}h ${onlineTime % 60}m`
    };

    return res.json({ success: true, stats });
  } catch (e) {
    console.error('Error getting driver stats:', e);
    return res.status(500).json({ success: false, message: e.message });
  }
});

// GET /nearbyRequests - obtenir les demandes de course à proximité
router.get('/nearbyRequests', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { lat, lng, radius = 5 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ success: false, message: 'lat et lng requis' });
    }

    // Obtenir le conducteur
    const { data: driver } = await supabase
      .from('taxi_drivers')
      .select('id, last_lat, last_lng')
      .eq('user_id', userId)
      .single();

    if (!driver) {
      return res.json({ success: true, requests: [] });
    }

    // Chercher les demandes à proximité
    const { data: requests } = await supabase
      .from('taxi_trips')
      .select(`
        id,
        customer_id,
        pickup_lat,
        pickup_lng,
        pickup_address,
        dropoff_address,
        price_total,
        requested_at,
        profiles:customer_id (
          full_name,
          phone
        )
      `)
      .eq('status', 'requested')
      .is('driver_id', null)
      .gte('requested_at', new Date(Date.now() - 30 * 60 * 1000).toISOString()); // 30 dernières minutes

    // Filtrer par distance
    const nearbyRequests = requests?.filter(request => {
      if (!request.pickup_lat || !request.pickup_lng) return false;

      const distance = calculateDistance(
        parseFloat(lat), parseFloat(lng),
        request.pickup_lat, request.pickup_lng
      );

      return distance <= parseFloat(radius);
    }).map(request => ({
      id: request.id,
      customerId: request.customer_id,
      customerName: request.profiles?.full_name || 'Client',
      customerRating: 4.5, // Par défaut
      pickupAddress: request.pickup_address,
      destinationAddress: request.dropoff_address,
      distance: calculateDistance(
        parseFloat(lat), parseFloat(lng),
        request.pickup_lat, request.pickup_lng
      ),
      estimatedEarnings: Math.round(request.price_total * 0.8), // 80% pour le conducteur
      estimatedDuration: Math.round(calculateDistance(
        parseFloat(lat), parseFloat(lng),
        request.pickup_lat, request.pickup_lng
      ) * 2), // Estimation basique
      pickupCoords: {
        latitude: request.pickup_lat,
        longitude: request.pickup_lng
      },
      destinationCoords: {
        latitude: request.dropoff_lat,
        longitude: request.dropoff_lng
      },
      requestTime: request.requested_at
    })) || [];

    return res.json({ success: true, requests: nearbyRequests });
  } catch (e) {
    console.error('Error getting nearby requests:', e);
    return res.status(500).json({ success: false, message: e.message });
  }
});

// Fonction utilitaire pour calculer la distance
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// POST /status - basculer en ligne/hors ligne et MAJ position
router.post('/status', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { isOnline, lat, lng } = req.body;
    const status = isOnline ? 'available' : 'offline';

    const { data: upserted, error } = await supabase
      .from('taxi_drivers')
      .upsert({
        user_id: userId,
        is_online: !!isOnline,
        status,
        last_lat: lat ?? null,
        last_lng: lng ?? null,
        last_seen: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })
      .select('id, is_online, status')
      .single();
    if (error) throw error;

    return res.json({ success: true, driver: upserted });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

// POST /acceptTrip - accepter une course et marquer le trip
router.post('/acceptTrip', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { tripId } = req.body;
    if (!tripId) return res.status(400).json({ success: false, message: 'tripId requis' });

    // trouver driver_id
    const { data: driver, error: dErr } = await supabase
      .from('taxi_drivers')
      .select('id')
      .eq('user_id', userId)
      .single();
    if (dErr) throw dErr;

    const { error: tErr } = await supabase
      .from('taxi_trips')
      .update({ driver_id: driver.id, status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', tripId);
    if (tErr) throw tErr;

    // mettre driver en on_trip
    await supabase
      .from('taxi_drivers')
      .update({ status: 'on_trip', is_online: true, updated_at: new Date().toISOString() })
      .eq('id', driver.id);

    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

// POST /completeTrip - terminer course, calcul tarif, paiement wallet 80/20
router.post('/completeTrip', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { tripId, distanceKm, durationMin } = req.body;
    if (!tripId) return res.status(400).json({ success: false, message: 'tripId requis' });

    // pricing simple: base 1000 + 200/km + 50/min
    const price = Math.round(1000 + (Number(distanceKm || 0) * 200) + (Number(durationMin || 0) * 50));
    const platformFee = Math.round(price * 0.20);
    const driverShare = price - platformFee;

    // driver id
    const { data: driver } = await supabase
      .from('taxi_drivers')
      .select('id')
      .eq('user_id', userId)
      .single();

    // update trip
    const { error: updErr } = await supabase
      .from('taxi_trips')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        distance_km: distanceKm ?? null,
        duration_min: durationMin ?? null,
        price_total: price,
        driver_share: driverShare,
        platform_fee: platformFee
      })
      .eq('id', tripId);
    if (updErr) throw updErr;

    // wallet payout: system -> driver user (80%), customer -> platform (implicit), or mark platform fee to platform user
    // Here we credit driver from system (service role), debit is managed externally if needed
    const SYSTEM_USER = process.env.SYSTEM_USER_ID || '00000000-0000-0000-0000-000000000000';

    const { data: txResult, error: txErr } = await supabase.rpc('process_transaction', {
      p_from_user_id: SYSTEM_USER,
      p_to_user_id: userId,
      p_amount: driverShare,
      p_transaction_type: 'ride_payout',
      p_description: `Taxi moto course ${tripId}`
    });
    if (txErr) throw txErr;

    // set driver available again
    await supabase
      .from('taxi_drivers')
      .update({ status: 'available', is_online: true, updated_at: new Date().toISOString() })
      .eq('id', driver.id);

    return res.json({ success: true, price, driverShare, platformFee, transaction: txResult });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

// GET /trips - dernières courses du conducteur
router.get('/trips', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { data: driver } = await supabase
      .from('taxi_drivers')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!driver) return res.json({ success: true, trips: [] });

    const { data: trips, error } = await supabase
      .from('taxi_trips')
      .select('*')
      .eq('driver_id', driver.id)
      .order('requested_at', { ascending: false })
      .limit(20);
    if (error) throw error;

    return res.json({ success: true, trips });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;


