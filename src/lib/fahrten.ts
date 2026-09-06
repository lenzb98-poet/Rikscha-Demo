import { useCallback, useEffect, useState } from 'react'
import {
  bookSlot,
  createRide,
  deleteRide,
  deleteUebernahme,
  listPilots,
  listRides,
  listUebernahmen,
  releaseSlot,
  rideAddNote,
  rideCancel,
  rideSignoff,
  rideSignup,
  rikschaStatistik,
  saveUebernahme,
  setPilot,
  slotReport,
  updateRide,
  watchRides,
} from './demoFahrten'

/**
 * Die Datenzugriffe liegen in demoFahrten.ts und arbeiten auf den lokalen
 * Beispieldaten - hier bleiben Typen, Regeln und Darstellung.
 */
export {
  bookSlot,
  createRide,
  deleteRide,
  deleteUebernahme,
  listPilots,
  listRides,
  listUebernahmen,
  releaseSlot,
  rideAddNote,
  rideCancel,
  rideSignoff,
  rideSignup,
  rikschaStatistik,
  saveUebernahme,
  setPilot,
  slotReport,
  updateRide,
  watchRides,
}

export type Zustand = 'offen' | 'besetzt' | 'nachtragen' | 'abgeschlossen' | 'abgesagt'
export type RideStatus = 'geplant' | 'abgesagt' | 'abgeschlossen'

export type Pilot = { id: string; name: string }

/** Die vier Rikschas des Vereins. */
export const RIKSCHAS = ['Fritz', 'Fred', 'Liese', 'Lotte'] as const
export type RikschaName = (typeof RIKSCHAS)[number]

/** Ein einzeln buchbarer Rikscha-Platz einer Fahrt, mit eigener Nacherfassung. */
export type Platz = {
  id: string
  position: number
  pilot_id: string | null
  pilot_name: string | null
  ist_meiner: boolean
  report_km: number | null
  report_minutes: number | null
  report_passengers: number | null
  report_bemerkung: string | null
  rikscha: RikschaName | null
  report_at: string | null
}
export type Notiz = { id: string; name: string; body: string; created_at: string }

export type Fahrt = {
  id: string
  starts_at: string
  location: string
  info: string
  pilots_needed: number
  status: RideStatus
  zustand: Zustand
  angemeldet: number
  bin_dabei: boolean
  piloten: Pilot[]
  /** Alle Plätze der Fahrt, auch die freien. */
  plaetze: Platz[]
  notizen: Notiz[]
  /** Nachtrag nach der Fahrt; null, solange niemand ihn eingetragen hat. */
  report_km: number | null
  report_minutes: number | null
  report_passengers: number | null
  report_name: string | null
  report_at: string | null
  /** Bis wann nachgetragen werden kann – von der Datenbank berechnet. */
  report_deadline: string
  /** Mir fehlt zu dieser Fahrt noch etwas an meinem eigenen Platz. */
  bericht_offen: boolean
}

export const ZUSTAND_TEXT: Record<Zustand, string> = {
  offen: 'Offen',
  besetzt: 'Zugesagt',
  nachtragen: 'Angaben fehlen',
  abgeschlossen: 'Abgeschlossen',
  abgesagt: 'Abgesagt',
}

/** 'offen' = noch Plätze frei, 'alle' = Kalender, Verwaltung und Auswertung */

/** Bucht genau diesen Platz. */

/** Gibt genau diesen Platz wieder frei. */

/** Nimmt den ersten freien Platz der Fahrt. */

/** Abmelden, wahlweise mit Mitteilung an die Koordination. */

/** Mitteilung zu einer Fahrt, ohne sich abzumelden. */

export type FahrtEingabe = {
  startsAt: string
  location: string
  info: string
  pilotsNeeded: number
  status: RideStatus
}






/** Freie Plätze einer Fahrt. */
export function freiePlaetze(f: Fahrt): Platz[] {
  return f.plaetze.filter((p) => p.pilot_id === null)
}

/* --- Datum und Zeit ------------------------------------------------------ */

export function formatiereTermin(iso: string): string {
  return new Date(iso).toLocaleString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatiereKurz(iso: string): string {
  return new Date(iso).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Wandelt einen Zeitpunkt in den Wert für ein datetime-local-Feld um. */
export function fuerEingabefeld(iso: string): string {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

/**
 * Lädt alle Fahrten und hält sie aktuell. Auf der Startseite werden sie an
 * mehreren Stellen gebraucht (Meldung und Zähler unter den Knöpfen), deshalb
 * an einer Stelle laden statt mehrfach abfragen.
 */
export function useFahrten() {
  const [fahrten, setFahrten] = useState<Fahrt[] | null>(null)
  const [uebernahmen, setUebernahmen] = useState<Uebernahme[]>([])

  const laden = useCallback(() => {
    listRides('alle')
      .then(setFahrten)
      .catch(() => {
        // Auf der Startseite lieber still bleiben als eine Fehlermeldung zeigen
      })
    // Für die Auswertung: die Zahlen aus der Zeit vor dieser App
    listUebernahmen()
      .then(setUebernahmen)
      .catch(() => setUebernahmen([]))
  }, [])

  useEffect(() => {
    laden()
    return watchRides(laden)
  }, [laden])

  return { fahrten, uebernahmen, laden }
}

/** Standardgrund, den die Absage-Auswahl vorschlägt. */
export const GRUND_REGEN = 'Wegen Regen abgesagt'

export type Bericht = {
  km: string
  /** Eingabe in Stunden, etwa "2,5" – gespeichert wird in Minuten. */
  stunden: string
  personen: string
  rikscha: RikschaName | ''
  bemerkung: string
}

/** Minuten als Stundenwert für die Eingabe: 150 → "2,5" */
export function minutenAlsStunden(minuten: number | null): string {
  if (minuten === null) return ''
  return String(Math.round((minuten / 60) * 100) / 100).replace('.', ',')
}

export type RikschaStatistik = {
  rikscha: string
  km: number
  minuten: number
  personen: number
  fahrten: number
}

/** Summen je Rikscha über alle nachgetragenen Plätze. */

/** Sind alle Angaben zu diesem Platz vorhanden? */
export function platzVollstaendig(p: Platz): boolean {
  return (
    p.report_km !== null &&
    p.report_minutes !== null &&
    p.report_passengers !== null &&
    p.rikscha !== null
  )
}

/** Meine eigenen Plätze, zu denen noch Angaben fehlen. */
export function offenePlaetze(f: Fahrt): Platz[] {
  return f.plaetze.filter((p) => p.ist_meiner && !platzVollstaendig(p))
}

/** "8,5 km · 1 Std. 15 Min. · 2 Fahrgäste" – nur die vorhandenen Angaben. */
export function formatiereBericht(f: Fahrt): string | null {
  const teile: string[] = []

  if (f.report_km !== null) teile.push(`${String(f.report_km).replace('.', ',')} km`)

  if (f.report_minutes !== null) {
    const m = f.report_minutes
    teile.push(
      m >= 60 ? `${Math.floor(m / 60)} Std.${m % 60 ? ` ${m % 60} Min.` : ''}` : `${m} Min.`,
    )
  }

  if (f.report_passengers !== null) {
    teile.push(f.report_passengers === 1 ? '1 Fahrgast' : `${f.report_passengers} Fahrgäste`)
  }

  return teile.length ? teile.join(' · ') : null
}

/** Welche Angaben fehlen an diesem Platz noch? Für den Hinweis im Dialog. */
export function fehlendeAngaben(p: Platz): string[] {
  const fehlt: string[] = []
  if (p.report_km === null) fehlt.push('Kilometer')
  if (p.report_minutes === null) fehlt.push('Dauer')
  if (p.report_passengers === null) fehlt.push('Fahrgäste')
  if (p.rikscha === null) fehlt.push('Rikscha')
  return fehlt
}

export type Auswertung = {
  km: number
  minuten: number
  personen: number
  /** Fahrten, zu denen mindestens eine Angabe vorliegt. */
  fahrten: number
}

/**
 * Summiert die nachgetragenen Angaben aller Fahrten.
 *
 * Gezählt wird, was eingetragen ist – auch aus Fahrten, bei denen erst ein Teil
 * der Angaben vorliegt. Fehlende Werte zählen als nichts, nicht als null.
 */
export function werteAus(fahrten: Fahrt[]): Auswertung {
  const summe: Auswertung = { km: 0, minuten: 0, personen: 0, fahrten: 0 }

  for (const f of fahrten) {
    if (f.report_km === null && f.report_minutes === null && f.report_passengers === null) {
      continue
    }
    summe.km += f.report_km ?? 0
    summe.minuten += f.report_minutes ?? 0
    summe.personen += f.report_passengers ?? 0
    summe.fahrten += 1
  }

  // Kommastellen sauber halten: 8,5 + 3,2 ergibt sonst 11,700000000000001
  summe.km = Math.round(summe.km * 10) / 10
  return summe
}

const ZAHL = new Intl.NumberFormat('de-DE')
const ZAHL_KOMMA = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 })

export const formatiereZahl = (n: number) => ZAHL.format(n)
export const formatiereKomma = (n: number) => ZAHL_KOMMA.format(n)

/** "20 Std. 40 Min." – als Lesehilfe unter der Minutenzahl. */
export function alsStunden(minuten: number): string {
  const std = Math.floor(minuten / 60)
  const rest = minuten % 60
  if (std === 0) return ''
  return rest ? `${ZAHL.format(std)} Std. ${rest} Min.` : `${ZAHL.format(std)} Std.`
}

/**
 * Wie lange bleibt noch Zeit für den Nachtrag? Leerer Text heißt: Frist vorbei.
 * Gerundet auf ganze Tage und Stunden – auf die Minute genau hilft hier niemandem.
 */
export function verbleibendeFrist(bis: string): string {
  const ms = new Date(bis).getTime() - Date.now()
  if (ms <= 0) return ''

  const minuten = Math.floor(ms / 60000)
  const stunden = Math.floor(minuten / 60)
  const tage = Math.floor(stunden / 24)

  if (tage >= 1) {
    const restStunden = stunden % 24
    const tagText = tage === 1 ? 'ein Tag' : `${tage} Tage`
    if (restStunden === 0) return tagText
    return `${tagText} und ${restStunden} ${restStunden === 1 ? 'Stunde' : 'Stunden'}`
  }

  if (stunden >= 1) {
    return `${stunden} ${stunden === 1 ? 'Stunde' : 'Stunden'}`
  }

  return `${Math.max(1, minuten)} Minuten`
}

/** "Mo., 26. August, 14:00 Uhr" – der Zeitpunkt, zu dem die Frist abläuft. */
export function formatiereFrist(bis: string): string {
  return new Date(bis).toLocaleString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/* --- Übernahme der bisherigen Statistik ---------------------------------- */

export type Uebernahme = {
  id: string
  bezeichnung: string
  km: number
  minuten: number
  personen: number
  erfasst_von: string | null
  erfasst_am: string
}


export type UebernahmeEingabe = {
  bezeichnung: string
  km: string
  /** Eingabe in Stunden, wie im bisherigen Fahrtenbuch. */
  stunden: string
  personen: string
}



/** Summe aus Fahrten und übernommener Statistik. */
export function werteAusGesamt(fahrten: Fahrt[], uebernahmen: Uebernahme[]): Auswertung {
  const summe = werteAus(fahrten)

  for (const u of uebernahmen) {
    summe.km += Number(u.km) || 0
    summe.minuten += u.minuten || 0
    summe.personen += u.personen || 0
  }

  summe.km = Math.round(summe.km * 10) / 10
  return summe
}
