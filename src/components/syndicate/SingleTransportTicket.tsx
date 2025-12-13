/**
 * Ticket de Transport Unique - Design Officiel Guinéen
 * Orientation PAYSAGE - Style Administratif/Syndical
 * Fidèle à la photo de référence fournie
 */

interface TicketConfig {
  syndicateName: string;
  commune: string;
  ticketType: string;
  amount: number;
  date: string;
  optionalMention: string;
}

interface Props {
  ticketNumber: number;
  config: TicketConfig;
  ticketTypeLabel: string;
}

export default function SingleTransportTicket({ ticketNumber, config, ticketTypeLabel }: Props) {
  const formattedNumber = String(ticketNumber).padStart(6, '0');
  
  // Formater le montant avec séparateur de milliers
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-GN', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount).replace(/\s/g, '\u202F');
  };

  return (
    <div 
      className="ticket-container relative overflow-hidden bg-white border border-gray-400"
      style={{
        width: '100%',
        height: '100%',
        padding: '1.5mm',
        fontSize: '5px',
        lineHeight: '1.1',
        fontFamily: 'Arial, Helvetica, sans-serif',
      }}
    >
      {/* Header: République de Guinée */}
      <div className="text-center" style={{ marginBottom: '0.5mm' }}>
        <div 
          className="font-black uppercase tracking-tight"
          style={{ 
            fontSize: '6px', 
            letterSpacing: '0.5px',
            color: '#000000',
          }}
        >
          RÉPUBLIQUE DE GUINÉE
        </div>
        
        {/* Devise tricolore */}
        <div 
          className="flex justify-center items-center gap-[1px] font-bold italic"
          style={{ fontSize: '4.5px' }}
        >
          <span style={{ color: '#CE1126' }}>Travail</span>
          <span style={{ color: '#000000' }}>–</span>
          <span style={{ color: '#FCD116' }}>Justice</span>
          <span style={{ color: '#000000' }}>–</span>
          <span style={{ color: '#009639' }}>Solidarité</span>
        </div>
      </div>

      {/* Commune */}
      <div 
        className="text-center font-bold"
        style={{ 
          fontSize: '5px', 
          color: '#CE1126',
          marginBottom: '0.5mm',
        }}
      >
        Commune urbaine de {config.commune}
      </div>

      {/* Type de ticket + Montant */}
      <div 
        className="text-center font-black"
        style={{ 
          fontSize: '5.5px',
          color: '#000000',
          marginBottom: '0.5mm',
        }}
      >
        {ticketTypeLabel}: <span style={{ fontWeight: '900' }}>{formatAmount(config.amount)}fg</span>
      </div>

      {/* Syndicat */}
      <div 
        className="text-center font-semibold"
        style={{ 
          fontSize: '4.5px',
          color: '#333333',
          marginBottom: '0.5mm',
        }}
      >
        {config.syndicateName}
      </div>

      {/* Illustration Moto (SVG simplifié) */}
      <div className="flex justify-center" style={{ marginBottom: '0.5mm' }}>
        <svg 
          viewBox="0 0 48 24" 
          style={{ width: '12mm', height: '6mm' }}
          className="text-gray-700"
        >
          {/* Roue arrière */}
          <circle cx="8" cy="18" r="5" fill="none" stroke="currentColor" strokeWidth="1.5"/>
          <circle cx="8" cy="18" r="2" fill="currentColor"/>
          
          {/* Roue avant */}
          <circle cx="38" cy="18" r="5" fill="none" stroke="currentColor" strokeWidth="1.5"/>
          <circle cx="38" cy="18" r="2" fill="currentColor"/>
          
          {/* Cadre moto */}
          <path 
            d="M8 18 L16 12 L28 10 L38 18" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="1.5"
          />
          
          {/* Selle */}
          <path 
            d="M16 12 L22 8 L26 8" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
          />
          
          {/* Guidon */}
          <path 
            d="M28 10 L32 6 L36 8" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="1.5"
          />
          
          {/* Phare */}
          <circle cx="36" cy="8" r="2" fill="#FCD116"/>
          
          {/* Conducteur stylisé */}
          <circle cx="20" cy="4" r="2.5" fill="currentColor"/>
          <path 
            d="M18 7 L22 7 L24 10 L20 12 L16 10 Z" 
            fill="currentColor"
          />
        </svg>
      </div>

      {/* Zone de validation (ligne pointillée + date) */}
      <div style={{ borderTop: '0.5px dashed #666', paddingTop: '0.5mm', marginTop: '0.5mm' }}>
        <div className="flex justify-between items-center" style={{ fontSize: '4px' }}>
          <span>Date: {config.date}</span>
          <span className="font-bold" style={{ fontSize: '5px' }}>
            N° {formattedNumber}
          </span>
        </div>
        
        {/* Mention optionnelle */}
        {config.optionalMention && (
          <div 
            className="text-center italic"
            style={{ fontSize: '3.5px', color: '#666', marginTop: '0.3mm' }}
          >
            {config.optionalMention}
          </div>
        )}
      </div>

      {/* Cachet officiel (coin supérieur droit) */}
      <div 
        className="absolute"
        style={{ 
          top: '1mm', 
          right: '1mm',
          width: '8mm',
          height: '8mm',
        }}
      >
        <svg viewBox="0 0 40 40" style={{ width: '100%', height: '100%' }}>
          {/* Cercle extérieur */}
          <circle 
            cx="20" cy="20" r="18" 
            fill="none" 
            stroke="#1E40AF" 
            strokeWidth="1.5"
          />
          {/* Cercle intérieur */}
          <circle 
            cx="20" cy="20" r="14" 
            fill="none" 
            stroke="#1E40AF" 
            strokeWidth="0.5"
          />
          {/* Texte circulaire haut */}
          <path id="topArc" d="M 5,20 A 15,15 0 0,1 35,20" fill="none"/>
          <text fontSize="3.5" fill="#1E40AF" fontWeight="bold">
            <textPath href="#topArc" startOffset="50%" textAnchor="middle">
              Commune de {config.commune.substring(0, 8)}
            </textPath>
          </text>
          {/* Centre: Le Président */}
          <text 
            x="20" y="20" 
            textAnchor="middle" 
            fontSize="3" 
            fill="#1E40AF"
            fontWeight="bold"
          >
            Le Président
          </text>
          {/* Texte circulaire bas */}
          <path id="bottomArc" d="M 5,20 A 15,15 0 0,0 35,20" fill="none"/>
          <text fontSize="3" fill="#1E40AF">
            <textPath href="#bottomArc" startOffset="50%" textAnchor="middle">
              Moto-Taxi ★ Guinée
            </textPath>
          </text>
        </svg>
      </div>
    </div>
  );
}
