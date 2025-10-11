const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// Service role client (server-side privileged)
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

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


