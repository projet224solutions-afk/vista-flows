/**
 * Ticket de Transport Professionnel - Design Officiel Guinéen
 * Orientation PAYSAGE - Style Gouvernemental Premium
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
        fontFamily: "'Georgia', 'Times New Roman', serif",
        background: '#ffffff',
        border: '1.5px solid #1e3a5f',
        borderRadius: '3px',
        display: 'flex',
        flexDirection: 'row',
        boxSizing: 'border-box',
      }}
    >
      {/* Bande tricolore gauche - fine et élégante */}
      <div 
        style={{
          width: '2.5mm',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}
      >
        <div style={{ flex: 1, background: '#CE1126' }} />
        <div style={{ flex: 1, background: '#FCD116' }} />
        <div style={{ flex: 1, background: '#009639' }} />
      </div>

      {/* Contenu principal */}
      <div 
        style={{ 
          flex: 1, 
          padding: '2mm 3mm 2mm 2.5mm',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
        }}
      >
        {/* Filigrane de sécurité */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            opacity: 0.03,
            backgroundImage: `
              repeating-linear-gradient(45deg, #1e3a5f 0px, transparent 1px, transparent 6px),
              repeating-linear-gradient(-45deg, #1e3a5f 0px, transparent 1px, transparent 6px)
            `,
          }}
        />

        {/* Section supérieure */}
        <div className="relative">
          {/* En-tête avec République et devise */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1mm' }}>
            <div>
              <div 
                style={{ 
                  fontSize: '6.5px', 
                  fontWeight: 'bold',
                  letterSpacing: '0.8px',
                  color: '#1e3a5f',
                  textTransform: 'uppercase',
                }}
              >
                République de Guinée
              </div>
              <div 
                style={{ 
                  fontSize: '4.5px', 
                  fontStyle: 'italic',
                  color: '#64748b',
                }}
              >
                Travail • Justice • Solidarité
              </div>
            </div>
            
            {/* Numéro de ticket */}
            <div 
              style={{ 
                background: '#1e3a5f',
                color: '#ffffff',
                padding: '0.8mm 2mm',
                borderRadius: '2px',
                fontSize: '5.5px',
                fontWeight: 'bold',
                fontFamily: "'Courier New', monospace",
                letterSpacing: '0.5px',
              }}
            >
              N° {formattedNumber}
            </div>
          </div>

          {/* Commune */}
          <div 
            style={{ 
              fontSize: '5.5px', 
              fontWeight: 'bold',
              color: '#CE1126',
              textTransform: 'uppercase',
              letterSpacing: '0.3px',
              marginBottom: '1.5mm',
            }}
          >
            Commune de {config.commune}
          </div>
        </div>

        {/* Section centrale - Type et Montant */}
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '3mm',
          }}
        >
          {/* Type de ticket */}
          <div style={{ flex: 1 }}>
            <div 
              style={{ 
                fontSize: '5px', 
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '0.5mm',
              }}
            >
              Type
            </div>
            <div 
              style={{ 
                fontSize: '6.5px', 
                fontWeight: 'bold',
                color: '#1e3a5f',
              }}
            >
              {ticketTypeLabel}
            </div>
          </div>

          {/* Icône Moto */}
          <div style={{ flexShrink: 0 }}>
            <svg 
              viewBox="0 0 50 24" 
              style={{ width: '12mm', height: '6mm' }}
            >
              <circle cx="8" cy="17" r="5" fill="none" stroke="#1e3a5f" strokeWidth="1.2"/>
              <circle cx="8" cy="17" r="2" fill="#1e3a5f"/>
              <circle cx="40" cy="17" r="5" fill="none" stroke="#1e3a5f" strokeWidth="1.2"/>
              <circle cx="40" cy="17" r="2" fill="#1e3a5f"/>
              <path d="M8 17 L15 10 L30 8 L40 17" fill="none" stroke="#1e3a5f" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M15 10 L20 5 L26 5" fill="none" stroke="#1e3a5f" strokeWidth="2" strokeLinecap="round"/>
              <path d="M30 8 L35 4 L40 6" fill="none" stroke="#1e3a5f" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="40" cy="6" r="2" fill="#FCD116" stroke="#1e3a5f" strokeWidth="0.5"/>
              <circle cx="20" cy="2" r="2.5" fill="#1e3a5f"/>
            </svg>
          </div>

          {/* Montant */}
          <div style={{ textAlign: 'right' }}>
            <div 
              style={{ 
                fontSize: '5px', 
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '0.5mm',
              }}
            >
              Montant
            </div>
            <div 
              style={{ 
                fontSize: '8px', 
                fontWeight: 'bold',
                color: '#009639',
              }}
            >
              {formatAmount(config.amount)} <span style={{ fontSize: '5px' }}>GNF</span>
            </div>
          </div>
        </div>

        {/* Section inférieure */}
        <div className="relative">
          {/* Ligne de séparation */}
          <div 
            style={{ 
              borderTop: '0.5px dashed #94a3b8',
              marginBottom: '1mm',
            }}
          />

          {/* Syndicat et Date */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <div 
                style={{ 
                  fontSize: '4.5px', 
                  color: '#475569',
                  maxWidth: '25mm',
                  lineHeight: 1.2,
                }}
              >
                {config.syndicateName}
              </div>
              {config.optionalMention && (
                <div 
                  style={{ 
                    fontSize: '3.5px', 
                    color: '#94a3b8',
                    fontStyle: 'italic',
                    marginTop: '0.3mm',
                  }}
                >
                  {config.optionalMention}
                </div>
              )}
            </div>
            
            <div 
              style={{ 
                fontSize: '4.5px', 
                color: '#64748b',
                fontFamily: "'Courier New', monospace",
              }}
            >
              {config.date}
            </div>
          </div>
        </div>

        {/* Sceau discret */}
        <div 
          className="absolute"
          style={{ 
            bottom: '2mm', 
            right: '12mm',
            width: '8mm',
            height: '8mm',
            opacity: 0.08,
          }}
        >
          <svg viewBox="0 0 40 40" style={{ width: '100%', height: '100%' }}>
            <circle cx="20" cy="20" r="18" fill="none" stroke="#1e3a5f" strokeWidth="1.5"/>
            <circle cx="20" cy="20" r="14" fill="none" stroke="#1e3a5f" strokeWidth="0.8"/>
            <text x="20" y="18" textAnchor="middle" fontSize="5" fill="#1e3a5f" fontWeight="bold">TAXI</text>
            <text x="20" y="24" textAnchor="middle" fontSize="4" fill="#1e3a5f">MOTO</text>
          </svg>
        </div>
      </div>

      {/* Bande droite avec code série */}
      <div 
        style={{
          width: '4mm',
          background: 'linear-gradient(180deg, #f1f5f9 0%, #e2e8f0 100%)',
          borderLeft: '0.5px solid #cbd5e1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <div 
          style={{
            transform: 'rotate(-90deg)',
            whiteSpace: 'nowrap',
            fontSize: '3.5px',
            color: '#94a3b8',
            fontFamily: "'Courier New', monospace",
            letterSpacing: '0.5px',
          }}
        >
          SN-{formattedNumber}
        </div>
      </div>
    </div>
  );
}
