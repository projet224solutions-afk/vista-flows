import React, { useState } from 'react';

export default function TestUltraBasic() {
    const [compteur, setCompteur] = useState(0);
    const [message, setMessage] = useState('Page chargée à ' + new Date().toLocaleTimeString());

    const handleClick = () => {
        setCompteur(compteur + 1);
        setMessage(`Bouton cliqué ${compteur + 1} fois à ${new Date().toLocaleTimeString()}`);
        alert(`TEST RÉUSSI ! Clic numéro ${compteur + 1}`);
    };

    const testConsole = () => {
        console.log('🔍 TEST CONSOLE:', { compteur, message, timestamp: new Date() });
        alert('Vérifiez la console (F12)');
    };

    return (
        <div style={{
            padding: '20px',
            fontFamily: 'Arial',
            backgroundColor: '#f0f0f0',
            minHeight: '100vh'
        }}>
            <h1 style={{ color: 'red', fontSize: '2em' }}>
                🚨 TEST ULTRA-BASIQUE - AUCUNE DÉPENDANCE
            </h1>

            <div style={{
                backgroundColor: 'white',
                padding: '20px',
                border: '2px solid red',
                margin: '20px 0'
            }}>
                <h2>État actuel :</h2>
                <p><strong>Compteur :</strong> {compteur}</p>
                <p><strong>Message :</strong> {message}</p>
                <p><strong>Heure :</strong> {new Date().toLocaleTimeString()}</p>
            </div>

            <div style={{ margin: '20px 0' }}>
                <button
                    onClick={handleClick}
                    style={{
                        backgroundColor: 'green',
                        color: 'white',
                        padding: '15px 30px',
                        fontSize: '18px',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        margin: '10px'
                    }}
                >
                    🧪 TEST CLIC (Compteur: {compteur})
                </button>

                <button
                    onClick={testConsole}
                    style={{
                        backgroundColor: 'blue',
                        color: 'white',
                        padding: '15px 30px',
                        fontSize: '18px',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        margin: '10px'
                    }}
                >
                    📱 TEST CONSOLE
                </button>

                <button
                    onClick={() => window.location.href = '/'}
                    style={{
                        backgroundColor: 'orange',
                        color: 'white',
                        padding: '15px 30px',
                        fontSize: '18px',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        margin: '10px'
                    }}
                >
                    🏠 RETOUR ACCUEIL
                </button>
            </div>

            <div style={{
                backgroundColor: 'yellow',
                padding: '15px',
                border: '2px solid orange',
                margin: '20px 0'
            }}>
                <h3>🔍 DIAGNOSTIC :</h3>
                <ul>
                    <li>✅ Cette page s'affiche = React fonctionne</li>
                    <li>✅ Vous voyez le compteur = useState fonctionne</li>
                    <li>❓ Boutons cliquables = À tester maintenant</li>
                    <li>❓ Alert apparaît = JavaScript fonctionne</li>
                </ul>
            </div>

            <div style={{
                backgroundColor: '#ffeeee',
                padding: '15px',
                border: '2px solid red',
                margin: '20px 0'
            }}>
                <h3>⚠️ INSTRUCTIONS :</h3>
                <ol>
                    <li><strong>Cliquez sur le bouton vert</strong> - Une alerte doit apparaître</li>
                    <li><strong>Vérifiez que le compteur augmente</strong></li>
                    <li><strong>Cliquez sur le bouton bleu</strong> - Ouvrez F12 → Console</li>
                    <li><strong>Dites-moi exactement ce qui se passe !</strong></li>
                </ol>
            </div>

            <div style={{
                backgroundColor: '#eeeeff',
                padding: '15px',
                border: '2px solid blue',
                margin: '20px 0'
            }}>
                <h3>🔧 Si rien ne marche :</h3>
                <p>Problème avec :</p>
                <ul>
                    <li>• JavaScript désactivé dans le navigateur</li>
                    <li>• Extensions qui bloquent</li>
                    <li>• Cache/cookies corrompus</li>
                    <li>• Erreur de build Vite</li>
                </ul>
            </div>

            <hr style={{ margin: '30px 0' }} />

            <div style={{ fontSize: '12px', color: 'gray' }}>
                <p>Page créée à : {new Date().toString()}</p>
                <p>URL actuelle : {window.location.href}</p>
                <p>User Agent : {navigator.userAgent}</p>
            </div>
        </div>
    );
}
