#!/usr/bin/env node
/*
 * testAuth.js - Test Firebase Admin connection and Firestore write (ESM)
 */

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TARGET_KEY_PATH = 'D:/Mon Projet 224Solutions/config/serviceAccount.json';
const LOCAL_KEY_SRC = path.join(__dirname, '.gcp', 'service-account-key.json');
const ALT_DIR = 'D:/Mon Projet 224Solutions/bahthiernosouleymane00';

function log(step, info) {
    console.log(`[${step}]`, info);
}

function looksLikeServiceAccount(obj) {
    return obj && obj.type === 'service_account' && obj.client_email && obj.private_key;
}

async function ensureKeyFile() {
    // If target path doesn't exist, try copying from local .gcp
    try {
        if (!fs.existsSync(TARGET_KEY_PATH)) {
            const destDir = path.dirname(TARGET_KEY_PATH);
            if (!fs.existsSync(destDir)) {
                fs.mkdirSync(destDir, { recursive: true });
            }
            if (fs.existsSync(LOCAL_KEY_SRC)) {
                fs.copyFileSync(LOCAL_KEY_SRC, TARGET_KEY_PATH);
                log('KEY_COPIED', `${LOCAL_KEY_SRC} -> ${TARGET_KEY_PATH}`);
            } else if (fs.existsSync(ALT_DIR)) {
                // Try to find a JSON key in ALT_DIR
                const files = fs.readdirSync(ALT_DIR).filter(f => f.toLowerCase().endsWith('.json'));
                for (const f of files) {
                    const full = path.join(ALT_DIR, f);
                    try {
                        const raw = fs.readFileSync(full, 'utf8');
                        const parsed = JSON.parse(raw);
                        if (looksLikeServiceAccount(parsed)) {
                            fs.copyFileSync(full, TARGET_KEY_PATH);
                            log('KEY_COPIED', `${full} -> ${TARGET_KEY_PATH}`);
                            break;
                        }
                    } catch { }
                }
            }
        }
    } catch (e) {
        console.warn('[WARN] ensureKeyFile', e.message);
    }
}

async function main() {
    try {
        log('START', 'Test de connexion Firebase Admin');

        await ensureKeyFile();

        // 1) Vérifier la présence de la clé de service
        const absPath = TARGET_KEY_PATH;
        if (!fs.existsSync(absPath)) {
            throw new Error(`Clé de service introuvable à l'emplacement: ${absPath}`);
        }
        log('KEY_FOUND', absPath);

        // 2) Charger la clé
        let serviceAccount;
        try {
            const raw = fs.readFileSync(absPath, 'utf8');
            serviceAccount = JSON.parse(raw);
        } catch (e) {
            throw new Error(`Impossible de lire/parse la clé JSON: ${e.message}`);
        }

        // 3) Initialiser Firebase Admin
        let admin;
        try {
            const mod = await import('firebase-admin');
            admin = mod.default ?? mod;
        } catch (e) {
            throw new Error(`Module firebase-admin manquant. Installez-le: npm i firebase-admin\nDétail: ${e.message}`);
        }

        try {
            if (admin.apps.length === 0) {
                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount)
                });
            }
            log('INIT_OK', 'Firebase Admin initialisé');
        } catch (e) {
            throw new Error(`Erreur d'initialisation Firebase Admin: ${e.message}`);
        }

        // 4) Test écriture Firestore
        const db = admin.firestore();
        const now = new Date().toISOString();
        const docRef = db.collection('testConnection').doc('ping');
        await docRef.set({
            ok: true,
            timestamp: now,
            note: 'Test écriture Firestore depuis testAuth.js (ESM)'
        }, { merge: true });
        log('WRITE_OK', `Document écrit: testConnection/ping @ ${now}`);

        // 5) Lecture pour vérification
        const snap = await docRef.get();
        log('READ_OK', snap.exists ? snap.data() : 'Document non trouvé');

        log('DONE', 'Test Firebase réussi');
        process.exit(0);
    } catch (err) {
        console.error('[ERROR]', err.message || err);
        process.exit(1);
    }
}

main();
