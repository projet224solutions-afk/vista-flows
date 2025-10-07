/**
 * Version ultra-simple pour Lovable - Sans aucune dépendance
 * 224SOLUTIONS - Ultra Simple Communication for Lovable
 */

import React, { useState } from 'react';

export default function UltraSimpleCommunication() {
  const [activeTab, setActiveTab] = useState('chat');
  const [newMessage, setNewMessage] = useState('');

  // Données mockées ultra-simples
  const conversations = [
    { id: '1', name: 'Marie Diallo', lastMessage: 'Salut ! Comment ça va ?', timestamp: '14:30', status: 'online' },
    { id: '2', name: 'Amadou Ba', lastMessage: 'Merci pour l\'information', timestamp: '13:45', status: 'busy' },
    { id: '3', name: 'Fatou Sall', lastMessage: 'À bientôt !', timestamp: 'Hier 18:30', status: 'offline' }
  ];

  const messages = [
    { id: '1', sender: 'Marie Diallo', content: 'Salut ! Comment ça va ?', timestamp: '14:30', isOwn: false },
    { id: '2', sender: 'Vous', content: 'Ça va bien, merci ! Et toi ?', timestamp: '14:32', isOwn: true },
    { id: '3', sender: 'Marie Diallo', content: 'Très bien aussi ! J\'ai une question sur le projet...', timestamp: '14:35', isOwn: false }
  ];

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    console.log('Message envoyé:', newMessage);
    setNewMessage('');
  };

  return (
    <div className="h-full bg-white p-4">
      {/* En-tête simple */}
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-800">💬 Communication 224SOLUTIONS</h2>
        <p className="text-sm text-gray-600">Interface de communication ultra-simple</p>
      </div>

      {/* Onglets simples */}
      <div className="flex space-x-1 mb-4 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('chat')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'chat' 
              ? 'bg-blue-500 text-white' 
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          💬 Chat
        </button>
        <button
          onClick={() => setActiveTab('contacts')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'contacts' 
              ? 'bg-blue-500 text-white' 
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          👥 Contacts
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'settings' 
              ? 'bg-blue-500 text-white' 
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          ⚙️ Paramètres
        </button>
      </div>

      {/* Contenu des onglets */}
      {activeTab === 'chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-96">
          {/* Liste des conversations */}
          <div className="lg:col-span-1 border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Conversations</h3>
              <button className="text-blue-500 hover:text-blue-700 text-sm">+ Ajouter</button>
            </div>
            <div className="space-y-2">
              {conversations.map((conversation) => (
                <div key={conversation.id} className="p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold">
                        {conversation.name.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">{conversation.name}</p>
                        <span className="text-xs text-gray-500">{conversation.timestamp}</span>
                      </div>
                      <p className="text-sm text-gray-600 truncate">{conversation.lastMessage}</p>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${
                      conversation.status === 'online' ? 'bg-green-500' :
                      conversation.status === 'busy' ? 'bg-red-500' : 'bg-gray-400'
                    }`} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Zone de chat */}
          <div className="lg:col-span-2 border rounded-lg flex flex-col">
            {/* En-tête du chat */}
            <div className="p-4 border-b bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold">M</span>
                </div>
                <div>
                  <h3 className="font-semibold">Marie Diallo</h3>
                  <p className="text-sm text-green-600">En ligne</p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs px-4 py-2 rounded-lg ${
                      message.isOwn
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      <p className="text-sm">{message.content}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs opacity-70">{message.timestamp}</span>
                        {message.isOwn && <span className="text-xs opacity-70">✓</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Zone de saisie */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Tapez votre message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSendMessage();
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Envoyer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'contacts' && (
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Contacts</h3>
            <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
              + Ajouter un contact
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {conversations.map((contact) => (
              <div key={contact.id} className="p-4 border rounded-lg hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold text-lg">
                      {contact.name.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{contact.name}</h3>
                    <p className={`text-xs ${
                      contact.status === 'online' ? 'text-green-600' :
                      contact.status === 'busy' ? 'text-red-600' : 'text-gray-500'
                    }`}>
                      {contact.status === 'online' ? 'En ligne' :
                       contact.status === 'busy' ? 'Occupé' : 'Hors ligne'}
                    </p>
                  </div>
                  <button className="p-2 text-blue-500 hover:text-blue-700">
                    💬
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-4">Paramètres de communication</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-semibold">Notifications</h4>
                <p className="text-sm text-gray-600">Recevoir des notifications pour les nouveaux messages</p>
              </div>
              <button className="px-3 py-1 bg-green-500 text-white rounded text-sm">
                Activées
              </button>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-semibold">Statut en ligne</h4>
                <p className="text-sm text-gray-600">Afficher votre statut en ligne aux autres utilisateurs</p>
              </div>
              <button className="px-3 py-1 bg-green-500 text-white rounded text-sm">
                Visible
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
