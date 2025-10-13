#!/usr/bin/env node
/*
 * testFirestoreSetup.js - Prépare Firestore pour Taxi Moto (rides, drivers, users, locations)
 */

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const KEY_PATH = 'D:/Mon Projet 224Solutions/config/serviceAccount.json';

function log(step, info) { console.log(`[${step}]`, info); }

async function main() {
    try {
        log('START', 'Préparation Firestore (Taxi Moto)');

        if (!fs.existsSync(KEY_PATH)) throw new Error(`Clé introuvable: ${KEY_PATH}`);
        const raw = fs.readFileSync(KEY_PATH, 'utf8');
        const serviceAccount = JSON.parse(raw);

        const mod = await import('firebase-admin');
        const admin = mod.default ?? mod;

        if (admin.apps.length === 0) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

        const db = admin.firestore();
        const now = new Date().toISOString();

        const ops = [
            { col: 'rides', doc: 'ping', data: { message: 'Test course ✅', timestamp: now } },
            { col: 'drivers', doc: 'ping', data: { message: 'Test conducteur ✅', timestamp: now } },
            { col: 'users', doc: 'ping', data: { message: 'Test client ✅', timestamp: now } },
            { col: 'locations', doc: 'ping', data: { message: 'Test position ✅', timestamp: now } },
        ];

        for (const { col, doc, data } of ops) {
            try {
                await db.collection(col).doc(doc).set(data, { merge: true });
                log('WRITE_OK', `${col}/${doc}`);
                const snap = await db.collection(col).doc(doc).get();
                log('READ_OK', { col, doc, exists: snap.exists, data: snap.data() });
            } catch (e) {
                console.error('[ERROR_OP]', col, e.message);
            }
        }

        log('DONE', 'Firestore prêt (si toutes les écritures/lectures sont OK)');
        process.exit(0);
    } catch (e) {
        console.error('[ERROR]', e.message || e);
        process.exit(1);
    }
}

main();


