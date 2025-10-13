import 'dotenv/config';
import { Client } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;
const PRIMARY_VENDOR_ID = process.env.PRIMARY_VENDOR_ID; // UUID of main vendor (auth.users.id)

if (!DATABASE_URL || !PRIMARY_VENDOR_ID) {
  console.error('❌ DATABASE_URL ou PRIMARY_VENDOR_ID manquant.');
  process.exit(1);
}

function buildSslConfig(urlString) {
  try {
    const { hostname } = new URL(urlString);
    const isLocal = /^(localhost|127\.0\.0\.1)$/i.test(hostname);
    return isLocal ? false : { require: true, rejectUnauthorized: false };
  } catch {
    return false;
  }
}

async function run() {
  const client = new Client({ connectionString: DATABASE_URL, ssl: buildSslConfig(DATABASE_URL) });
  await client.connect();
  try {
    await client.query('begin');

    // Protect primary vendor
    const protect = await client.query('select id from auth.users where id = $1', [PRIMARY_VENDOR_ID]);
    if (protect.rowCount === 0) throw new Error('PRIMARY_VENDOR_ID introuvable');

    // Delete related data for non-primary vendors
    await client.query(`
      -- Shops and related
      delete from shop_products where shop_id in (select id from shops where owner_id in (select id from auth.users where role = 'vendeur' and id <> $1));
      delete from shop_services where shop_id in (select id from shops where owner_id in (select id from auth.users where role = 'vendeur' and id <> $1));
      delete from shops where owner_id in (select id from auth.users where role = 'vendeur' and id <> $1);

      -- Orders linked to non-primary vendors
      delete from order_items where order_id in (select id from orders where vendor_id in (select id from auth.users where role = 'vendeur' and id <> $1));
      delete from orders where vendor_id in (select id from auth.users where role = 'vendeur' and id <> $1);

      -- Wallets and commissions
      delete from commissions where vendor_id in (select id from auth.users where role = 'vendeur' and id <> $1);
      delete from wallet_transactions where wallet_id in (select id from wallets where user_id in (select id from auth.users where role = 'vendeur' and id <> $1));
      delete from wallets where user_id in (select id from auth.users where role = 'vendeur' and id <> $1);

      -- Reviews, bookings, dropshipping
      delete from reviews where vendor_id in (select id from auth.users where role = 'vendeur' and id <> $1);
      delete from bookings where vendor_id in (select id from auth.users where role = 'vendeur' and id <> $1);
      delete from dropshipping_connections where vendor_id in (select id from auth.users where role = 'vendeur' and id <> $1);
    `, [PRIMARY_VENDOR_ID]);

    // Finally delete users (vendeur) except primary
    await client.query(`delete from auth.users where role = 'vendeur' and id <> $1`, [PRIMARY_VENDOR_ID]);

    await client.query('commit');
    console.log('✅ Nettoyage effectué. Seul le vendeur principal est conservé.');
  } catch (e) {
    await client.query('rollback');
    console.error('❌ Erreur de nettoyage:', e.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

run().catch((e) => { console.error('❌ Erreur:', e.message); process.exit(1); });


