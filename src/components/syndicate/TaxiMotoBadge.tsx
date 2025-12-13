/**
 * Badge professionnel ULTRA pour taxi-motards
 * Design inspiré de badges officiels gouvernementaux et entreprises internationales
 */

import { forwardRef } from 'react';
import Barcode from 'react-barcode';
import { QRCodeSVG } from 'qrcode.react';
import { Shield, MapPin, Calendar, CreditCard, User, Bike } from 'lucide-react';

interface TaxiMotoBadgeProps {
  driverName: string;
  driverPhoto?: string;
  badgeId: string;
  memberId: string;
  vehicleType: string;
  vehiclePlate: string;
  dateOfBirth?: string;
  joinedDate: string;
  expireDate: string;
  bureauName?: string;
  bureauLogo?: string;
  badgeTitle?: string;
}

const TaxiMotoBadge = forwardRef<HTMLDivElement, TaxiMotoBadgeProps>(({
  driverName,
  driverPhoto,
  badgeId,
  memberId,
  vehicleType,
  vehiclePlate,
  dateOfBirth,
  joinedDate,
  expireDate,
  bureauName = '224SOLUTIONS',
  bureauLogo,
  badgeTitle
}, ref) => {
  const displayTitle = badgeTitle || `TAXI-MOTO DE ${bureauName.toUpperCase()}`;
  
  const getVehicleLabel = () => {
    switch (vehicleType) {
      case 'motorcycle': return 'CONDUCTEUR MOTO';
      case 'tricycle': return 'CONDUCTEUR TRICYCLE';
      default: return 'CONDUCTEUR TAXI';
    }
  };

  return (
    <div 
      ref={ref}
      className="w-[900px] h-[560px] bg-gradient-to-br from-slate-50 to-white rounded-2xl overflow-hidden shadow-2xl border border-slate-200"
      style={{ 
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
        background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 50%, #f1f5f9 100%)'
      }}
    >
      {/* En-tête principal avec design moderne */}
      <div className="relative h-[140px] bg-gradient-to-r from-[#0f172a] via-[#1e3a8a] to-[#1d4ed8] overflow-hidden">
        {/* Motif géométrique subtil */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/20 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-white/10 rounded-full translate-y-1/2" />
        </div>

        {/* Contenu de l'en-tête */}
        <div className="relative h-full flex items-center justify-between px-8">
          {/* Logo et titre gauche */}
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
              {bureauLogo ? (
                <img src={bureauLogo} alt="Logo" className="w-14 h-14 object-contain" />
              ) : (
                <Shield className="w-10 h-10 text-white" />
              )}
            </div>
            <div>
              <div className="text-white/60 text-xs font-medium tracking-[0.3em] uppercase mb-1">
                République de Guinée
              </div>
              <h1 className="text-white text-2xl font-bold tracking-wide">
                {displayTitle}
              </h1>
              <div className="text-blue-200 text-sm font-medium mt-1">
                Carte Professionnelle de Transport
              </div>
            </div>
          </div>

          {/* Badge de sécurité droite */}
          <div className="text-right">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-white text-sm font-semibold">CARTE OFFICIELLE</span>
            </div>
            <div className="text-white/50 text-xs mt-2 tracking-wider">
              224SOLUTIONS • Système Certifié
            </div>
          </div>
        </div>

        {/* Bande de sécurité holographique */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400" />
      </div>

      {/* Corps principal */}
      <div className="flex h-[420px]">
        {/* Section photo et identité - Gauche */}
        <div className="w-[300px] p-6 bg-gradient-to-b from-slate-50 to-white border-r border-slate-200">
          {/* Photo du conducteur */}
          <div className="relative mb-6">
            <div className="w-full aspect-[3/4] bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl overflow-hidden border-4 border-white shadow-xl">
              {driverPhoto ? (
                <img 
                  src={driverPhoto} 
                  alt={driverName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
                  <div className="text-center">
                    <User className="w-16 h-16 text-blue-300 mx-auto mb-2" />
                    <div className="text-5xl font-bold text-blue-400">
                      {driverName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                  </div>
                </div>
              )}
            </div>
            {/* Badge véhicule */}
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
              <div className="flex items-center gap-1.5">
                <Bike className="w-3.5 h-3.5" />
                {getVehicleLabel()}
              </div>
            </div>
          </div>

          {/* Nom du conducteur - Style ultra professionnel */}
          <div className="text-center mt-8">
            <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 rounded-lg py-3 px-4 shadow-lg">
              <h2 className="text-xl font-bold text-white tracking-widest uppercase">
                {driverName}
              </h2>
            </div>
            <div className="flex items-center justify-center gap-2 mt-3 text-slate-600">
              <CreditCard className="w-4 h-4" />
              <span className="text-sm font-mono font-bold tracking-wider">{memberId}</span>
            </div>
          </div>

          {/* Signature */}
          <div className="mt-6 pt-4 border-t border-slate-200">
            <div className="text-xs text-slate-400 text-center mb-2 uppercase tracking-wider">
              Signature du Titulaire
            </div>
            <div className="h-12 border-b-2 border-slate-300 flex items-end justify-center pb-1">
              <span className="text-xl text-slate-600 italic font-serif">
                {driverName.split(' ')[0]}
              </span>
            </div>
          </div>
        </div>

        {/* Section informations - Droite */}
        <div className="flex-1 p-6 flex flex-col">
          {/* Grille d'informations */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Matricule véhicule */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
              <div className="flex items-center gap-2 text-blue-600 mb-2">
                <CreditCard className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Immatriculation</span>
              </div>
              <div className="text-xl font-bold text-slate-900 font-mono">
                {vehiclePlate}
              </div>
            </div>

            {/* Date de naissance */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100">
              <div className="flex items-center gap-2 text-amber-600 mb-2">
                <Calendar className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Date de Naissance</span>
              </div>
              <div className="text-xl font-bold text-slate-900">
                {dateOfBirth || 'Non renseigné'}
              </div>
            </div>

            {/* Date d'inscription */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
              <div className="flex items-center gap-2 text-green-600 mb-2">
                <Calendar className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Date d'Inscription</span>
              </div>
              <div className="text-lg font-bold text-slate-900">
                {joinedDate}
              </div>
            </div>

            {/* Date d'expiration */}
            <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl p-4 border border-red-100">
              <div className="flex items-center gap-2 text-red-600 mb-2">
                <Calendar className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Date d'Expiration</span>
              </div>
              <div className="text-lg font-bold text-slate-900">
                {expireDate}
              </div>
            </div>
          </div>

          {/* Bureau et localisation */}
          <div className="bg-gradient-to-r from-slate-100 to-slate-50 rounded-xl p-4 mb-6 border border-slate-200">
            <div className="flex items-center gap-2 text-slate-600 mb-2">
              <MapPin className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Bureau de Rattachement</span>
            </div>
            <div className="text-lg font-bold text-slate-900">
              {bureauName}
            </div>
          </div>

          {/* Section code-barres et QR */}
          <div className="mt-auto flex items-end justify-between gap-6">
            {/* Code-barres */}
            <div className="flex-1 bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-center">
                <Barcode 
                  value={badgeId}
                  width={2}
                  height={50}
                  fontSize={10}
                  textMargin={4}
                  margin={0}
                  background="transparent"
                />
              </div>
            </div>

            {/* QR Code - Entièrement visible */}
            <div className="bg-white rounded-xl p-4 border-2 border-slate-300 shadow-md">
              <QRCodeSVG 
                value={`224SOLUTIONS:${memberId}`}
                size={90}
                level="H"
                includeMargin={true}
              />
            </div>
          </div>

          {/* Pied de page avec informations de sécurité - Sans UUID */}
          <div className="mt-4 pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span className="font-semibold">Émis par 224Solutions</span>
                <span>•</span>
                <span>République de Guinée</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5" />
                <span className="font-medium">Document sécurisé - Vérifiable en ligne</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

TaxiMotoBadge.displayName = 'TaxiMotoBadge';

export default TaxiMotoBadge;
