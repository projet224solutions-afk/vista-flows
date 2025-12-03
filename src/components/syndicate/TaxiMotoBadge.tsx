/**
 * Badge professionnel pour taxi-motards
 * Style inspiré de badges d'entreprise professionnels
 */

import { forwardRef } from 'react';
import Barcode from 'react-barcode';
import { Card } from '@/components/ui/card';

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
  bureauLogo
}, ref) => {
  return (
    <Card 
      ref={ref}
      className="w-[850px] h-[540px] bg-white overflow-hidden shadow-2xl rounded-3xl"
    >
      {/* En-tête avec dégradé bleu */}
      <div className="relative h-[200px] bg-gradient-to-r from-[#1e3a8a] via-[#1e40af] to-[#2563eb]">
        {/* Logo du bureau */}
        <div className="absolute top-4 right-6">
          {bureauLogo ? (
            <img 
              src={bureauLogo} 
              alt="Bureau Logo" 
              className="h-16 w-auto"
            />
          ) : (
            <div className="text-white text-right">
              <div className="text-2xl font-bold tracking-widest">
                TAXI-MOTO DE {bureauName.toUpperCase()}
              </div>
              <div className="text-[10px] tracking-wide mt-1 opacity-80">224solutions</div>
            </div>
          )}
        </div>

        {/* Photo du conducteur */}
        <div className="absolute left-8 top-8 w-[240px] h-[240px] bg-white rounded-2xl p-3 shadow-xl">
          {driverPhoto ? (
            <img 
              src={driverPhoto} 
              alt={driverName}
              className="w-full h-full object-cover rounded-xl"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl font-bold text-blue-600">
                  {driverName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="text-xs text-blue-500 mt-2">PHOTO</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Corps du badge */}
      <div className="px-8 pt-16 pb-8 bg-gradient-to-b from-gray-50 to-white">
        <div className="grid grid-cols-2 gap-x-8">
          {/* Colonne gauche */}
          <div className="space-y-6">
            {/* Nom */}
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-1">
                {driverName}
              </h2>
              <p className="text-xl text-blue-600 font-medium">
                Conducteur {vehicleType === 'motorcycle' ? 'Moto' : vehicleType === 'tricycle' ? 'Tricycle' : 'Taxi'}
              </p>
            </div>

            {/* Informations */}
            <div className="space-y-4">
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="text-sm font-semibold text-blue-700">ID No</span>
                <span className="text-sm font-bold text-gray-900">{memberId}</span>
              </div>

              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="text-sm font-semibold text-blue-700">Matricule</span>
                <span className="text-sm font-bold text-gray-900">{vehiclePlate}</span>
              </div>

              {dateOfBirth && (
                <div className="flex justify-between border-b border-gray-200 pb-2">
                  <span className="text-sm font-semibold text-blue-700">D.O.B</span>
                  <span className="text-sm font-bold text-gray-900">{dateOfBirth}</span>
                </div>
              )}

              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="text-sm font-semibold text-blue-700">Date d'inscription</span>
                <span className="text-sm font-bold text-gray-900">{joinedDate}</span>
              </div>

              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="text-sm font-semibold text-blue-700">Date d'expiration</span>
                <span className="text-sm font-bold text-gray-900">{expireDate}</span>
              </div>
            </div>
          </div>

          {/* Colonne droite */}
          <div className="flex flex-col justify-between">
            {/* Signature */}
            <div className="text-center pt-4">
              <div className="text-xs text-gray-500 mb-2">Signature du titulaire</div>
              <div className="h-16 border-b-2 border-gray-300 flex items-center justify-center">
                <span className="text-2xl font-signature text-gray-600 italic">
                  {driverName.split(' ')[0]}
                </span>
              </div>
            </div>

            {/* Code-barres */}
            <div className="bg-white p-4 rounded-lg shadow-inner flex items-center justify-center">
              <Barcode 
                value={badgeId}
                width={2}
                height={60}
                fontSize={12}
                textMargin={4}
                margin={0}
              />
            </div>
          </div>
        </div>

        {/* Pied de page */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-xs text-center text-gray-500">
            Ce badge est la propriété de {bureauName} • En cas de perte, merci de le retourner
          </p>
        </div>
      </div>
    </Card>
  );
});

TaxiMotoBadge.displayName = 'TaxiMotoBadge';

export default TaxiMotoBadge;
