/**
 * INTERFACE BUREAU SYNDICAT ULTRA-SIMPLE - 224SOLUTIONS
 * Version minimale pour Lovable - GARANTIE DE FONCTIONNER
 */

import React from 'react';

export default function SyndicatePresidentUltraSimple() {
    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Arial, sans-serif'
        }}>
            <div style={{
                background: 'white',
                padding: '2rem',
                borderRadius: '10px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                textAlign: 'center',
                maxWidth: '500px',
                width: '90%'
            }}>
                <h1 style={{
                    color: '#333',
                    marginBottom: '1rem',
                    fontSize: '2rem'
                }}>
                    🏛️ Syndicat de Taxi Moto de Conakry
                </h1>
                
                <p style={{
                    color: '#666',
                    marginBottom: '2rem',
                    fontSize: '1.1rem'
                }}>
                    Interface du Bureau Syndical
                </p>
                
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '1rem',
                    marginBottom: '2rem'
                }}>
                    <div style={{
                        background: '#f0f9ff',
                        padding: '1rem',
                        borderRadius: '8px',
                        border: '1px solid #e0f2fe'
                    }}>
                        <h3 style={{ color: '#0369a1', margin: '0 0 0.5rem 0' }}>👥 Membres</h3>
                        <p style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>0</p>
                    </div>
                    
                    <div style={{
                        background: '#f0fdf4',
                        padding: '1rem',
                        borderRadius: '8px',
                        border: '1px solid #dcfce7'
                    }}>
                        <h3 style={{ color: '#166534', margin: '0 0 0.5rem 0' }}>🚗 Véhicules</h3>
                        <p style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>0</p>
                    </div>
                    
                    <div style={{
                        background: '#fef3c7',
                        padding: '1rem',
                        borderRadius: '8px',
                        border: '1px solid #fde68a'
                    }}>
                        <h3 style={{ color: '#92400e', margin: '0 0 0.5rem 0' }}>💰 Trésorerie</h3>
                        <p style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>0 FCFA</p>
                    </div>
                    
                    <div style={{
                        background: '#fce7f3',
                        padding: '1rem',
                        borderRadius: '8px',
                        border: '1px solid #f9a8d4'
                    }}>
                        <h3 style={{ color: '#be185d', margin: '0 0 0.5rem 0' }}>🚨 Alertes</h3>
                        <p style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>0</p>
                    </div>
                </div>
                
                <div style={{
                    background: '#f8fafc',
                    padding: '1rem',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0'
                }}>
                    <h3 style={{ color: '#475569', margin: '0 0 1rem 0' }}>📊 Statut du Bureau</h3>
                    <p style={{ color: '#059669', fontWeight: 'bold', margin: 0 }}>
                        ✅ Bureau Syndical Actif
                    </p>
                </div>
            </div>
        </div>
    );
}