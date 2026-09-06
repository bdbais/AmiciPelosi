'use client'

import { useState } from 'react'
import { PetForm, type PetInitial } from './PetForm'

/**
 * Il pulsante che riapre la scheda per correggerla.
 *
 * Una scheda si compila una volta e si rilegge per anni: il microchip con una
 * cifra sbagliata la rende inutile proprio il giorno in cui servirebbe. Il
 * diario e le foto che non si toccano restano dove sono.
 */
export function PetEditor({ pet }: { pet: PetInitial }) {
  const [editing, setEditing] = useState(false)

  if (!editing) {
    return (
      <div className="card">
        <h3>Correggi la scheda</h3>
        <p className="section-hint">
          Un dato sbagliato qui si scopre nel giorno peggiore. Il diario e le foto che non
          sostituisci restano dove sono.
        </p>
        <button type="button" className="btn secondary" onClick={() => setEditing(true)}>
          ✏️ Modifica i dati
        </button>
      </div>
    )
  }

  return <PetForm initial={pet} onDone={() => setEditing(false)} />
}
