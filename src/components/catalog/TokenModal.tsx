import { useState, useCallback } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from '@stripe/react-stripe-js'
import { toast } from 'sonner'
import { purchaseTokens, requestBankTransfer } from '@/services/cloudApi'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

interface TokenModalProps {
  balance: number
  onClose: () => void
}

const PACKAGES = [
  { id: 1, tokens: '500', sub: '1–500 gettoni', price: '€575', unit: '€1,15/cad', save: 'Prezzo base', saveClass: 'base' },
  { id: 2, tokens: '1.500', sub: '501–1.500', price: '€1.575', unit: '€1,05/cad', save: '-9% rispetto base', saveClass: 'green' },
  { id: 3, tokens: '3.000', sub: '1.501–3.000', price: '€2.850', unit: '€0,95/cad', save: '-17% rispetto base', saveClass: 'blue', featured: true, badge: 'Consigliato' },
  { id: 4, tokens: '3.001+', sub: 'Tariffa max', price: '€0,85', unit: 'al gettone', save: '-26% rispetto base', saveClass: 'pink' },
]

const SAVE_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  base: { bg: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.35)', border: 'transparent' },
  green: { bg: 'rgba(0,200,100,0.1)', color: '#00d46a', border: 'rgba(0,200,100,0.15)' },
  blue: { bg: 'rgba(100,200,255,0.08)', color: '#64c8ff', border: 'rgba(100,200,255,0.15)' },
  pink: { bg: 'rgba(230,0,126,0.1)', color: '#ff69b4', border: 'rgba(230,0,126,0.2)' },
}

export default function TokenModal({ balance, onClose }: TokenModalProps) {
  const [selectedPkg, setSelectedPkg] = useState<number | null>(null)
  const [customQty, setCustomQty] = useState(3500)
  const [payTab, setPayTab] = useState(0)
  const [checkoutActive, setCheckoutActive] = useState(false)
  const [checkoutPkgId, setCheckoutPkgId] = useState<number | null>(null)
  const [checkoutQty, setCheckoutQty] = useState<number | undefined>(undefined)

  const fetchClientSecret = useCallback(() => {
    if (!checkoutPkgId) return Promise.reject(new Error('No package selected'))
    return purchaseTokens(checkoutPkgId, checkoutQty).then((data) => data.clientSecret)
  }, [checkoutPkgId, checkoutQty])

  const handlePayClick = () => {
    if (!selectedPkg) return
    if (selectedPkg === 4 && customQty < 3001) return
    setCheckoutPkgId(selectedPkg)
    setCheckoutQty(selectedPkg === 4 ? customQty : undefined)
    setCheckoutActive(true)
  }

  // Stripe Embedded Checkout view
  if (checkoutActive && checkoutPkgId) {
    return (
      <div
        className="absolute inset-0 z-[200] flex items-center justify-center"
        style={{ background: 'rgba(10,8,30,0.92)', backdropFilter: 'blur(16px)' }}
      >
        <div
          style={{
            width: 700,
            maxHeight: '90vh',
            padding: '32px 38px',
            background: 'rgba(22,20,45,0.98)',
            border: '1px solid rgba(123,100,169,0.25)',
            borderRadius: 20,
            boxShadow: '0 40px 100px rgba(0,0,0,0.6),0 0 80px rgba(82,49,137,0.1)',
            overflow: 'auto',
          }}
        >
          <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
            <button
              onClick={() => setCheckoutActive(false)}
              style={{
                padding: '6px 16px', borderRadius: 8, border: '1px solid rgba(123,100,169,0.2)',
                background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.6)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Outfit, sans-serif',
              }}
            >
              ← Torna ai pacchetti
            </button>
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: '50%', border: 'none',
                background: 'rgba(255,255,255,0.05)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div id="checkout" style={{ minHeight: 300 }}>
            <EmbeddedCheckoutProvider stripe={stripePromise} options={{ fetchClientSecret }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        </div>
      </div>
    )
  }

  // Package selection view (original)
  return (
    <div
      className="absolute inset-0 z-[200] flex items-center justify-center"
      style={{ background: 'rgba(10,8,30,0.92)', backdropFilter: 'blur(16px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          width: 700,
          padding: '32px 38px',
          background: 'rgba(22,20,45,0.98)',
          border: '1px solid rgba(123,100,169,0.25)',
          borderRadius: 20,
          boxShadow: '0 40px 100px rgba(0,0,0,0.6),0 0 80px rgba(82,49,137,0.1)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
          <div style={{ fontSize: 24, fontWeight: 800 }}>Acquista gettoni</div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: '50%', border: 'none',
              background: 'rgba(255,255,255,0.05)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', marginBottom: 16 }}>
          Scegli il pacchetto e il metodo di pagamento
        </div>

        {/* Balance pill */}
        <div
          className="inline-flex items-center gap-2"
          style={{
            background: 'rgba(230,0,126,0.08)', border: '1px solid rgba(230,0,126,0.25)',
            borderRadius: 30, padding: '6px 16px', marginBottom: 20,
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#E6007E', boxShadow: '0 0 6px #E6007E', display: 'inline-block' }} />
          <span style={{ fontSize: 12, fontWeight: 600 }}>
            Saldo attuale: <strong>{balance.toLocaleString('it-IT')} gettoni</strong>
          </span>
        </div>

        {/* Packages grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
          {PACKAGES.map((pkg) => {
            const isSelected = selectedPkg === pkg.id
            const isFeat = pkg.featured
            const saveStyle = SAVE_STYLES[pkg.saveClass]
            return (
              <button
                key={pkg.id}
                onClick={() => setSelectedPkg(pkg.id)}
                style={{
                  position: 'relative', borderRadius: 14, padding: '22px 20px 18px',
                  background: isSelected ? 'rgba(230,0,126,0.12)' : isFeat ? 'rgba(230,0,126,0.06)' : 'rgba(82,49,137,0.08)',
                  border: isSelected ? '1.5px solid #E6007E' : isFeat ? '1.5px solid rgba(230,0,126,0.4)' : '1.5px solid rgba(123,100,169,0.15)',
                  cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', overflow: 'hidden',
                  boxShadow: isSelected ? '0 0 0 1px #E6007E, 0 10px 30px rgba(230,0,126,0.25)' : 'none',
                }}
              >
                {pkg.badge && (
                  <span style={{
                    position: 'absolute', top: 12, right: 12, background: '#E6007E', color: '#fff',
                    fontSize: 9, fontWeight: 800, letterSpacing: '.08em', padding: '3px 10px',
                    borderRadius: 20, textTransform: 'uppercase',
                  }}>
                    {pkg.badge}
                  </span>
                )}
                <div style={{
                  fontSize: 36, fontWeight: 900, lineHeight: 1,
                  background: 'linear-gradient(135deg, #fff 50%, #7B64A9)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>
                  {pkg.tokens}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 500, margin: '2px 0 14px', textTransform: 'uppercase', letterSpacing: '.08em' }}>
                  {pkg.sub}
                </div>
                <hr style={{ border: 'none', borderTop: '1px solid rgba(123,100,169,0.12)', margin: '0 0 14px' }} />
                <div>
                  <span style={{ fontSize: 24, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{pkg.price}</span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginLeft: 6 }}>{pkg.unit}</span>
                </div>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', padding: '4px 10px',
                  borderRadius: 20, fontSize: 10, fontWeight: 700, marginTop: 6,
                  background: saveStyle.bg, color: saveStyle.color,
                  border: saveStyle.border !== 'transparent' ? `1px solid ${saveStyle.border}` : 'none',
                }}>
                  {pkg.save}
                </div>
              </button>
            )
          })}
        </div>

        {/* Payment method tabs */}
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: 10 }}>
          Metodo di pagamento
        </div>
        <div style={{ display: 'flex', gap: 2, background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 3, marginBottom: 16 }}>
          {['Bonifico bancario', 'Carta / SEPA (Stripe)'].map((label, i) => (
            <button
              key={i}
              onClick={() => setPayTab(i)}
              style={{
                flex: 1, padding: '7px 0', border: 'none', borderRadius: 6,
                fontFamily: 'Outfit, sans-serif', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.15s',
                background: payTab === i ? 'rgba(82,49,137,0.35)' : 'transparent',
                color: payTab === i ? '#fff' : 'rgba(255,255,255,0.35)',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {payTab === 0 ? (
          <div style={{
            padding: 16, borderRadius: 12,
            background: 'rgba(82,49,137,0.06)', border: '1px solid rgba(123,100,169,0.12)',
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 10 }}>
              Dati per bonifico — zero commissioni
            </div>
            {[
              ['Intestatario', 'Virtual Zone S.r.l.'],
              ['IBAN', 'IT60X0542811101000000123456'],
              ['Causale', 'Seleziona un pacchetto e clicca "Richiedi bonifico"'],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between" style={{ padding: '4px 0' }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>{label}</span>
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 12, color: '#fff', fontWeight: 700, fontFamily: 'Outfit, monospace', letterSpacing: '.04em' }}>{value}</span>
                  {label === 'IBAN' && (
                    <button
                      onClick={() => { navigator.clipboard.writeText(value.replace(/\s/g, '')); toast.success('IBAN copiato') }}
                      style={{
                        padding: '4px 12px', borderRadius: 6,
                        border: '1px solid rgba(123,100,169,0.2)', background: 'rgba(255,255,255,0.03)',
                        color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      Copia
                    </button>
                  )}
                </div>
              </div>
            ))}
            {selectedPkg && (
              <button
                onClick={async () => {
                  const pkg = PACKAGES.find((p) => p.id === selectedPkg)
                  if (!pkg) return
                  const tokenAmount = parseInt(pkg.tokens.replace(/\./g, ''), 10)
                  if (isNaN(tokenAmount) || tokenAmount <= 0) {
                    toast.error('Pacchetto personalizzato non supportato per bonifico')
                    return
                  }
                  try {
                    const result = await requestBankTransfer(tokenAmount)
                    toast.success(`Richiesta bonifico creata — Causale: ${result.bankDetails.reference}`)
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : 'Errore creazione richiesta')
                  }
                }}
                style={{
                  width: '100%', marginTop: 12, padding: '10px', borderRadius: 8,
                  border: '1px solid rgba(123,100,169,0.25)', background: 'rgba(82,49,137,0.12)',
                  color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  fontFamily: 'Outfit, sans-serif',
                }}
              >
                Richiedi bonifico per {PACKAGES.find((p) => p.id === selectedPkg)?.tokens} gettoni
              </button>
            )}
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 10 }}>
              I gettoni verranno accreditati alla conferma del bonifico (1-2 giorni lavorativi)
            </div>
          </div>
        ) : (
          <div style={{
            padding: 20, borderRadius: 12,
            background: 'rgba(82,49,137,0.06)', border: '1px solid rgba(123,100,169,0.12)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 6 }}>
              Pagamento sicuro con Stripe
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 16 }}>
              Carta di credito/debito o addebito SEPA
            </div>
            {selectedPkg === 4 && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 6 }}>
                  Quantità gettoni (min. 3.001)
                </label>
                <input
                  type="number"
                  min={3001}
                  value={customQty}
                  onChange={(e) => setCustomQty(Math.max(3001, parseInt(e.target.value) || 3001))}
                  style={{
                    width: 160, padding: '8px 12px', borderRadius: 8,
                    border: '1px solid rgba(123,100,169,0.3)', background: 'rgba(255,255,255,0.05)',
                    color: '#fff', fontSize: 16, fontWeight: 700, fontFamily: 'Outfit, sans-serif',
                    textAlign: 'center',
                  }}
                />
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginLeft: 10 }}>
                  = €{(customQty * 0.85).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
            <button
              disabled={!selectedPkg || (selectedPkg === 4 && customQty < 3001)}
              onClick={handlePayClick}
              style={{
                padding: '12px 36px', borderRadius: 10, border: 'none',
                background: 'linear-gradient(135deg, #E6007E, #523189)',
                color: '#fff', fontSize: 13, fontWeight: 700, cursor: selectedPkg ? 'pointer' : 'not-allowed',
                fontFamily: 'Outfit, sans-serif',
                opacity: selectedPkg ? 1 : 0.5,
                boxShadow: selectedPkg ? '0 6px 24px rgba(230,0,126,0.3)' : 'none',
              }}
            >
              {selectedPkg ? 'Paga con Stripe' : 'Seleziona un pacchetto'}
            </button>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', marginTop: 10 }}>
              Commissioni: 1,5% + 0,25€ (carte EU) / 0,35€ (SEPA)
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
