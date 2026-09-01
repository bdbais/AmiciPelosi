'use client'

import { useState } from 'react'
import { ThankYou } from './ThankYou'
import { thankYou } from '@/lib/messages'

/**
 * Pulsanti di contatto: quando qualcuno tende una mano, l'app se ne accorge
 * e lo ringrazia.
 */
export function ContactActions({
  contactName,
  contactPhone,
  contactEmail,
  title,
}: {
  contactName: string
  contactPhone: string | null
  contactEmail: string | null
  title: string
}) {
  const [thanks, setThanks] = useState<string | null>(null)

  if (!contactPhone && !contactEmail) return null

  return (
    <>
      {thanks && <ThankYou message={thanks} autoHideMs={9000} />}
      <div className="stack" style={{ marginTop: 14 }}>
        {contactPhone && (
          <a
            href={`tel:${contactPhone}`}
            className="btn block"
            onClick={() => setThanks(thankYou('contact'))}
          >
            📞 Chiama {contactName}
          </a>
        )}
        {contactEmail && (
          <a
            href={`mailto:${contactEmail}?subject=${encodeURIComponent(`Amici Pelosi - ${title}`)}`}
            className="btn secondary block"
            onClick={() => setThanks(thankYou('contact'))}
          >
            ✉️ Scrivi una email
          </a>
        )}
      </div>
    </>
  )
}
