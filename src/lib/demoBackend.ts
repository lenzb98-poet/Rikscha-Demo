/**
 * Der lokale Ersatz für Datenbank, Anmeldung und Dateispeicher.
 *
 * Die Demo-Version kommt ohne Server aus. Dieser Baustein hält die
 * Beispieldaten im Browser, merkt sich Änderungen zwischen zwei Besuchen und
 * benachrichtigt die Oberfläche, sobald sich etwas geändert hat – dieselbe
 * Rolle, die früher Datenbank und Realtime übernommen haben.
 */
import { baueBeispieldaten, type DemoDb, type DemoUser } from './demoDaten'

const SPEICHER_SCHLUESSEL = 'rikscha.demo.daten.v1'
const SITZUNG_SCHLUESSEL = 'rikscha.demo.sitzung'

/* --- Speicher ------------------------------------------------------------ */

function lies<T>(speicher: Storage | null, schluessel: string): T | null {
  try {
    const roh = speicher?.getItem(schluessel)
    return roh ? (JSON.parse(roh) as T) : null
  } catch {
    // Privater Modus oder kaputter Eintrag: dann eben von vorn
    return null
  }
}

function lokal(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function sitzungsSpeicher(): Storage | null {
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

let db: DemoDb = lies<DemoDb>(lokal(), SPEICHER_SCHLUESSEL) ?? baueBeispieldaten()

/** Die Beispieldaten in ihrem aktuellen Stand. */
export function daten(): DemoDb {
  return db
}

function sichere(): void {
  const speicher = lokal()
  if (!speicher) return
  try {
    speicher.setItem(SPEICHER_SCHLUESSEL, JSON.stringify(db))
  } catch {
    // Bilder machen den Speicher schnell voll. Dann lieber die Daten ohne
    // Bilder behalten als gar nichts.
    try {
      speicher.setItem(SPEICHER_SCHLUESSEL, JSON.stringify({ ...db, bilder: {} }))
    } catch {
      // Kein Speicher verfügbar: Änderungen gelten nur für diesen Besuch
    }
  }
}

/** Setzt die Demo auf die ursprünglichen Beispieldaten zurück. */
export function setzeDemoZurueck(): void {
  db = baueBeispieldaten()
  sichere()
  melde()
}

/* --- Änderungen melden --------------------------------------------------- */

type Bereich = 'fahrten' | 'chat' | 'sitzung' | 'stammdaten'

const zuhoerer = new Map<Bereich, Set<() => void>>()

export function beobachte(bereich: Bereich, onChange: () => void): () => void {
  const menge = zuhoerer.get(bereich) ?? new Set<() => void>()
  menge.add(onChange)
  zuhoerer.set(bereich, menge)
  return () => {
    menge.delete(onChange)
  }
}

function melde(...bereiche: Bereich[]): void {
  const alle: Bereich[] =
    bereiche.length > 0 ? bereiche : ['fahrten', 'chat', 'sitzung', 'stammdaten']
  for (const bereich of alle) {
    for (const cb of zuhoerer.get(bereich) ?? []) cb()
  }
}

/** Schreibt die Änderung fest und benachrichtigt die Oberfläche. */
export function aendere(...bereiche: Bereich[]): void {
  sichere()
  melde(...bereiche)
}

/* --- Kleinkram ----------------------------------------------------------- */

/** Eine Kennung, auch ohne crypto.randomUUID (ältere Browser, ohne HTTPS). */
export function neueId(praefix: string): string {
  const zufall =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  return `${praefix}-${zufall}`
}

export function jetzt(): string {
  return new Date().toISOString()
}

/**
 * Ahmt eine Netzabfrage nach, damit Ladeanzeigen und Knopfsperren sichtbar
 * bleiben. Ohne die kurze Pause blitzt die Oberfläche nur.
 */
export function kurzWarten<T>(wert: T, ms = 120): Promise<T> {
  return new Promise((fertig) => setTimeout(() => fertig(wert), ms))
}

/** Fehler mit derselben Form, die früher aus der Datenbank kam. */
export function fehler(text: string): Error {
  return new Error(text)
}

/* --- Anmeldung ----------------------------------------------------------- */

const MERKEN = 'rikscha.angemeldet-bleiben'

export function angemeldetBleiben(): boolean {
  try {
    // Vorgabe: angemeldet bleiben
    return localStorage.getItem(MERKEN) !== '0'
  } catch {
    return true
  }
}

export function setzeAngemeldetBleiben(wert: boolean): void {
  try {
    localStorage.setItem(MERKEN, wert ? '1' : '0')
  } catch {
    // Privater Modus ohne Speicher: dann gilt die Vorgabe
  }
}

/**
 * Die Anmeldung liegt entweder dauerhaft im Browser (localStorage) oder nur
 * für die laufende Sitzung (sessionStorage) – wie in der Vollversion.
 */
function leseSitzung(): string | null {
  return (
    lies<string>(sitzungsSpeicher(), SITZUNG_SCHLUESSEL) ??
    lies<string>(lokal(), SITZUNG_SCHLUESSEL)
  )
}

function schreibeSitzung(userId: string | null): void {
  try {
    if (userId === null) {
      localStorage.removeItem(SITZUNG_SCHLUESSEL)
      sessionStorage.removeItem(SITZUNG_SCHLUESSEL)
    } else if (angemeldetBleiben()) {
      localStorage.setItem(SITZUNG_SCHLUESSEL, JSON.stringify(userId))
      sessionStorage.removeItem(SITZUNG_SCHLUESSEL)
    } else {
      sessionStorage.setItem(SITZUNG_SCHLUESSEL, JSON.stringify(userId))
      localStorage.removeItem(SITZUNG_SCHLUESSEL)
    }
  } catch {
    // Kein Speicher: die Anmeldung gilt nur für diese Seite
  }
}

let angemeldeteId: string | null = leseSitzung()

export function aktuelleBenutzerId(): string | null {
  // Der Eintrag könnte aus einem früheren Stand stammen
  if (angemeldeteId && !db.users.some((u) => u.id === angemeldeteId)) {
    angemeldeteId = null
    schreibeSitzung(null)
  }
  return angemeldeteId
}

export function aktuellerBenutzer(): DemoUser | null {
  const id = aktuelleBenutzerId()
  return db.users.find((u) => u.id === id) ?? null
}

/** Wer gerade angemeldet ist – oder ein Fehler wie früher aus der Datenbank. */
export function ich(): DemoUser {
  const user = aktuellerBenutzer()
  if (!user) throw fehler('Dein Zugang ist nicht freigeschaltet.')
  return user
}

export function melde_an(userId: string): void {
  angemeldeteId = userId
  schreibeSitzung(userId)
  melde('sitzung')
}

export function melde_ab(): void {
  angemeldeteId = null
  schreibeSitzung(null)
  melde('sitzung')
}

export function darfVerwalten(user: DemoUser | null): boolean {
  return user?.role === 'admin' || user?.role === 'koordinator'
}

export function benutzerName(id: string | null): string | null {
  if (!id) return null
  return db.users.find((u) => u.id === id)?.full_name ?? null
}
