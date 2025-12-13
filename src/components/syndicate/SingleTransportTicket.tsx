/**
 * Ticket de Transport Professionnel - Design Officiel Guinéen
 * Orientation PAYSAGE - Style Gouvernemental/Syndical Premium
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
  
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-GN').format(amount);
  };

  return (
    <div 
      className="ticket-container relative overflow-hidden"
      style={{
        width: '100%',
        height: '100%',
        fontFamily: "'Times New Roman', Georgia, serif",
        background: 'linear-gradient(135deg, #fefefe 0%, #f8f9fa 50%, #f0f1f2 100%)',
        border: '2px solid #1a365d',
        borderRadius: '4px',
        padding: '3mm',
        boxSizing: 'border-box',
      }}
    >
      {/* Fond décoratif avec motif guilloche */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `
            repeating-linear-gradient(45deg, #1a365d 0px, transparent 1px, transparent 8px),
            repeating-linear-gradient(-45deg, #1a365d 0px, transparent 1px, transparent 8px)
          `,
        }}
      />

      {/* Bandeau supérieur coloré */}
      <div 
        className="absolute top-0 left-0 right-0"
        style={{
          height: '6mm',
          background: 'linear-gradient(90deg, #CE1126 0%, #CE1126 33%, #FCD116 33%, #FCD116 66%, #009639 66%, #009639 100%)',
        }}
      />

      {/* Contenu principal */}
      <div className="relative" style={{ marginTop: '4mm' }}>
        
        {/* En-tête République */}
        <div className="text-center" style={{ marginBottom: '1.5mm' }}>
          <div 
            style={{ 
              fontSize: '7px', 
              fontWeight: 'bold',
              letterSpacing: '1px',
              color: '#1a365d',
              textTransform: 'uppercase',
            }}
          >
            République de Guinée
          </div>
          <div 
            style={{ 
              fontSize: '5px', 
              fontStyle: 'italic',
              color: '#4a5568',
              marginTop: '0.5mm',
            }}
          >
            Travail – Justice – Solidarité
          </div>
        </div>

        {/* Commune */}
        <div 
          className="text-center"
          style={{ 
            fontSize: '6px', 
            fontWeight: 'bold',
            color: '#CE1126',
            marginBottom: '1mm',
            textTransform: 'uppercase',
          }}
        >
          Commune de {config.commune}
        </div>

        {/* Bloc central - Type et Montant */}
        <div 
          style={{
            background: 'linear-gradient(180deg, #1a365d 0%, #2c5282 100%)',
            borderRadius: '3px',
            padding: '1.5mm 2mm',
            marginBottom: '1.5mm',
            textAlign: 'center',
          }}
        >
          <div 
            style={{ 
              fontSize: '6px', 
              color: '#ffffff',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            {ticketTypeLabel}
          </div>
          <div 
            style={{ 
              fontSize: '9px', 
              color: '#FCD116',
              fontWeight: 'bold',
              marginTop: '0.5mm',
            }}
          >
            {formatAmount(config.amount)} GNF
          </div>
        </div>

        {/* Syndicat */}
        <div 
          className="text-center"
          style={{ 
            fontSize: '5px', 
            color: '#2d3748',
            marginBottom: '1.5mm',
            fontWeight: '500',
          }}
        >
          {config.syndicateName}
        </div>

        {/* Icône Moto stylisée */}
        <div className="flex justify-center" style={{ marginBottom: '1.5mm' }}>
          <svg 
            viewBox="0 0 60 28" 
            style={{ width: '14mm', height: '7mm' }}
          >
            {/* Roue arrière */}
            <circle cx="10" cy="20" r="6" fill="none" stroke="#1a365d" strokeWidth="1.5"/>
            <circle cx="10" cy="20" r="3" fill="#1a365d"/>
            
            {/* Roue avant */}
            <circle cx="48" cy="20" r="6" fill="none" stroke="#1a365d" strokeWidth="1.5"/>
            <circle cx="48" cy="20" r="3" fill="#1a365d"/>
            
            {/* Cadre */}
            <path 
              d="M10 20 L18 12 L35 10 L48 20" 
              fill="none" 
              stroke="#1a365d" 
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            
            {/* Selle */}
            <path 
              d="M18 12 L24 6 L30 6 L32 8" 
              fill="none" 
              stroke="#1a365d" 
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            
            {/* Guidon */}
            <path 
              d="M35 10 L40 5 L46 7" 
              fill="none" 
              stroke="#1a365d" 
              strokeWidth="2"
              strokeLinecap="round"
            />
            
            {/* Phare */}
            <circle cx="46" cy="7" r="2.5" fill="#FCD116" stroke="#1a365d" strokeWidth="0.5"/>
            
            {/* Conducteur */}
            <circle cx="24" cy="2" r="3" fill="#1a365d"/>
            <ellipse cx="24" cy="7" rx="3" ry="4" fill="#1a365d"/>
          </svg>
        </div>

        {/* Pied de ticket */}
        <div 
          style={{ 
            borderTop: '1px dashed #a0aec0',
            paddingTop: '1mm',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ fontSize: '4.5px', color: '#718096' }}>
            {config.date}
          </div>
          <div 
            style={{ 
              fontSize: '6px', 
              fontWeight: 'bold',
              color: '#1a365d',
              fontFamily: "'Courier New', monospace",
            }}
          >
            N° {formattedNumber}
          </div>
        </div>

        {/* Mention optionnelle */}
        {config.optionalMention && (
          <div 
            className="text-center"
            style={{ 
              fontSize: '4px', 
              color: '#a0aec0',
              fontStyle: 'italic',
              marginTop: '0.5mm',
            }}
          >
            {config.optionalMention}
          </div>
        )}
      </div>

      {/* Sceau officiel (coin inférieur droit) */}
      <div 
        className="absolute"
        style={{ 
          bottom: '2mm', 
          right: '2mm',
          width: '10mm',
          height: '10mm',
          opacity: 0.15,
        }}
      >
        <svg viewBox="0 0 50 50" style={{ width: '100%', height: '100%' }}>
          <circle cx="25" cy="25" r="23" fill="none" stroke="#1a365d" strokeWidth="2"/>
          <circle cx="25" cy="25" r="18" fill="none" stroke="#1a365d" strokeWidth="1"/>
          <text x="25" y="22" textAnchor="middle" fontSize="6" fill="#1a365d" fontWeight="bold">
            SYNDICAT
          </text>
          <text x="25" y="30" textAnchor="middle" fontSize="5" fill="#1a365d">
            OFFICIEL
          </text>
        </svg>
      </div>

      {/* Numéro de série discret (coin supérieur gauche) */}
      <div 
        className="absolute"
        style={{ 
          top: '7mm', 
          left: '2mm',
          fontSize: '3.5px',
          color: '#a0aec0',
          fontFamily: "'Courier New', monospace",
          transform: 'rotate(-90deg)',
          transformOrigin: 'left top',
        }}
      >
        SN-{formattedNumber}
      </div>
    </div>
  );
}
