import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const INPUT = process.argv[2];

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant');
  process.exit(1);
}
if (!INPUT) {
  console.error('❌ Fichier JSON manquant. Usage: node scripts/import-bureau-syndical.mjs <path.json>');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function toNumber(v, def = 0) { const n = Number(v); return Number.isFinite(n) ? n : def; }
function toDateOrNull(v) { if (!v) return null; const d = new Date(v); return isNaN(d) ? null : d.toISOString().slice(0,10); }

async function run() {
  const raw = fs.readFileSync(path.resolve(INPUT), 'utf8');
  const json = JSON.parse(raw);

  // Upsert bureau
  const bureau = json.bureau_info || {};
  const bureauCode = bureau.bureau_code || `BS-${Date.now()}`;
  const { data: upBureau, error: upErr } = await supabase
    .from('bureaus')
    .upsert({
      bureau_code: bureauCode,
      prefecture: bureau.prefecture || '',
      commune: bureau.commune || '',
      full_location: bureau.full_location || null,
      president_name: bureau.president_name || null,
      president_email: bureau.president_email || null,
      president_phone: bureau.president_phone || null,
      status: bureau.status || 'active',
      total_members: toNumber(bureau.total_members, 0),
      total_vehicles: toNumber(bureau.total_vehicles, 0),
      total_cotisations: toNumber(bureau.total_cotisations, 0),
      validated_at: bureau.validated_at || null,
      last_activity: bureau.last_activity || null
    }, { onConflict: 'bureau_code' })
    .select('id')
    .single();
  if (upErr) throw upErr;

  const bureauId = upBureau.id;

  // Import members
  for (const m of (json.members || [])) {
    await supabase.from('members').upsert({
      bureau_id: bureauId,
      name: m.name || 'Inconnu',
      email: m.email || null,
      phone: m.phone || null,
      license_number: m.license_number || null,
      vehicle_type: m.vehicle_type || null,
      vehicle_serial: m.vehicle_serial || null,
      status: m.status || 'active',
      cotisation_status: m.cotisation_status || 'pending',
      join_date: toDateOrNull(m.join_date),
      last_cotisation_date: toDateOrNull(m.last_cotisation_date),
      total_cotisations: toNumber(m.total_cotisations, 0)
    });
  }

  // Import vehicles
  for (const v of (json.vehicles || [])) {
    await supabase.from('vehicles').upsert({
      bureau_id: bureauId,
      serial_number: v.serial_number,
      type: v.type || null,
      brand: v.brand || null,
      model: v.model || null,
      year: toNumber(v.year, null),
      status: v.status || 'active',
      insurance_expiry: toDateOrNull(v.insurance_expiry),
      last_inspection: toDateOrNull(v.last_inspection)
    }, { onConflict: 'serial_number' });
  }

  // Import transactions
  for (const t of (json.transactions || [])) {
    await supabase.from('bureau_transactions').insert({
      bureau_id: bureauId,
      member_id: null,
      type: t.type || 'cotisation',
      amount: toNumber(t.amount, 0),
      description: t.description || null,
      date: toDateOrNull(t.date) || toDateOrNull(t.last_cotisation_date) || toDateOrNull(new Date()),
      status: t.status || 'completed'
    });
  }

  // Import SOS
  for (const s of (json.sos_alerts || [])) {
    await supabase.from('sos_alerts').insert({
      bureau_id: bureauId,
      member_name: s.member_name || null,
      vehicle_serial: s.vehicle_serial || null,
      alert_type: s.alert_type || null,
      severity: s.severity || null,
      latitude: s.latitude || null,
      longitude: s.longitude || null,
      address: s.address || null,
      description: s.description || null,
      status: s.status || 'active',
      created_at: s.created_at || new Date().toISOString()
    });
  }

  console.log('✅ Import bureau syndical terminé');
}

run().catch((e) => { console.error('❌ Erreur import:', e.message); process.exit(1); });


