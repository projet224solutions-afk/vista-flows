export default function Overview() {
  return (
    <section className="bg-white rounded-lg shadow-lg p-8 mb-8">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">🎯 Vue d&apos;Ensemble du Système</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-blue-50 p-6 rounded-lg text-center">
          <div className="text-3xl mb-3">👑</div>
          <h3 className="font-bold text-blue-800">PDG</h3>
          <p className="text-blue-600 text-sm">Contrôle total, création d&apos;agents, paramètres commissions</p>
        </div>
        <div className="bg-green-50 p-6 rounded-lg text-center">
          <div className="text-3xl mb-3">🤝</div>
          <h3 className="font-bold text-green-800">Agents</h3>
          <p className="text-green-600 text-sm">Création d&apos;utilisateurs et sous-agents (si autorisé)</p>
        </div>
        <div className="bg-purple-50 p-6 rounded-lg text-center">
          <div className="text-3xl mb-3">👥</div>
          <h3 className="font-bold text-purple-800">Sous-Agents</h3>
          <p className="text-purple-600 text-sm">Création d&apos;utilisateurs uniquement</p>
        </div>
      </div>
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h4 className="font-bold text-yellow-800 mb-3">🚀 Automatisation Complète</h4>
        <ul className="text-yellow-700 space-y-2">
          <li>✅ Génération automatique d&apos;ID et liens d&apos;invitation</li>
          <li>✅ Envoi automatique par email/SMS</li>
          <li>✅ Détection device et proposition de téléchargement</li>
          <li>✅ Calcul automatique des commissions avec répartition</li>
          <li>✅ Audit complet de toutes les actions</li>
        </ul>
      </div>
    </section>
  );
}