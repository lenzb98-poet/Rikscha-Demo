import { useCallback, useEffect, useState } from 'react'
import {
  chatGesehenBis,
  setzeChatGesehenBis,
  watchMessages,
  zaehleUngelesen,
} from './daten'
import { kurzWarten } from './demoBackend'

/**
 * Ungelesene Chatnachrichten.
 *
 * Der Lesestand steht beim Benutzereintrag selbst und gilt damit überall in
 * der Anwendung: Wer den Chat liest, sieht die Nachrichten auf der Startseite
 * nicht mehr als ungelesen.
 *
 * Der Stand wandert nur vorwärts und nie in die Zukunft.
 */

/**
 * Hält fest, bis wohin gelesen wurde. Ohne Angabe gilt der Moment des
 * Aufrufs. Gibt den tatsächlich gespeicherten Stand zurück.
 */
export async function chatGesehen(bis?: string): Promise<string> {
  const stand = setzeChatGesehenBis(bis ?? new Date().toISOString())
  return kurzWarten(stand, 0)
}

/** Bis wohin gelesen wurde; null, solange noch nichts gelesen wurde. */
export { chatGesehenBis }

/** Zahl der ungelesenen Nachrichten; eigene zählen nicht mit. */
export async function ungeleseneAnzahl(): Promise<number> {
  return kurzWarten(zaehleUngelesen(), 0)
}

/**
 * Zähler für den Chat-Knopf, hält sich selbst aktuell.
 *
 * `anlass` neu zu zählen: Ändert sich der Wert, wird sofort nachgezählt.
 * Gedacht für die angezeigte Ansicht – wer aus dem Chat zurückkommt, soll
 * den Zähler augenblicklich verschwinden sehen und nicht erst beim
 * nächsten Takt.
 */
export function useUngelesen(angemeldet: boolean, anlass?: unknown): number {
  const [anzahl, setAnzahl] = useState(0)

  const zaehlen = useCallback(() => {
    if (!angemeldet) return
    ungeleseneAnzahl()
      .then(setAnzahl)
      .catch(() => {
        // Ein fehlgeschlagener Zähler darf die Startseite nicht stören
      })
  }, [angemeldet])

  useEffect(() => {
    zaehlen()
    return watchMessages(zaehlen)
  }, [zaehlen, anlass])

  return anzahl
}
