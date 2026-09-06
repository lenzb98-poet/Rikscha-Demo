/**
 * Fahrten, Plätze und Statistik – auf den lokalen Beispieldaten.
 *
 * Die Regeln entsprechen denen der Vollversion: Ein Platz gehört genau einer
 * Person, der Zustand einer Fahrt ergibt sich aus Termin, Besetzung und
 * Nachtrag, und nachtragen lässt sich zwei Tage lang.
 */
import {
  aendere,
  aktuellerBenutzer,
  beobachte,
  benutzerName,
  darfVerwalten,
  daten,
  fehler,
  ich,
  jetzt,
  kurzWarten,
  neueId,
} from './demoBackend'
import type { DemoRide, DemoSlot } from './demoDaten'
import type {
  Bericht,
  Fahrt,
  FahrtEingabe,
  Notiz,
  Pilot,
  Platz,
  RikschaName,
  RikschaStatistik,
  Uebernahme,
  UebernahmeEingabe,
  Zustand,
} from './fahrten'

/** Wie lange nach dem Termin auf den Nachtrag gewartet wird: zwei Tage. */
const FRIST_MS = 2 * 24 * 60 * 60 * 1000

function slotsVon(rideId: string): DemoSlot[] {
  return daten()
    .slots.filter((s) => s.ride_id === rideId)
    .sort((a, b) => a.position - b.position)
}

function platzVollstaendig(s: DemoSlot): boolean {
  return (
    s.report_km !== null &&
    s.report_minutes !== null &&
    s.report_passengers !== null &&
    s.rikscha !== null
  )
}

function zustandVon(
  f: DemoRide,
  benoetigt: number,
  angemeldet: number,
  vollstaendig: boolean,
): Zustand {
  if (f.status === 'abgesagt') return 'abgesagt'
  if (f.status === 'abgeschlossen') return 'abgeschlossen'
  const start = new Date(f.starts_at).getTime()
  if (start >= Date.now()) return angemeldet >= benoetigt ? 'besetzt' : 'offen'
  if (vollstaendig) return 'abgeschlossen'
  if (start + FRIST_MS < Date.now()) return 'abgeschlossen'
  return 'nachtragen'
}

/** Summe der vorhandenen Angaben; null, wenn niemand etwas eingetragen hat. */
function summe(werte: (number | null)[]): number | null {
  const vorhanden = werte.filter((w): w is number => w !== null)
  if (vorhanden.length === 0) return null
  return Math.round(vorhanden.reduce((a, b) => a + b, 0) * 100) / 100
}

function alsFahrt(f: DemoRide, ichId: string): Fahrt {
  const slots = slotsVon(f.id)
  const benoetigt = Math.max(f.pilots_needed, slots.length)
  const belegt = slots.filter((s) => s.pilot_id !== null).length
  const besetzt = slots.filter((s) => s.pilot_id !== null)
  const vollstaendig = besetzt.length === 0 || besetzt.every(platzVollstaendig)

  const plaetze: Platz[] = slots.map((s) => ({
    id: s.id,
    position: s.position,
    pilot_id: s.pilot_id,
    pilot_name: benutzerName(s.pilot_id),
    ist_meiner: s.pilot_id !== null && s.pilot_id === ichId,
    report_km: s.report_km,
    report_minutes: s.report_minutes,
    report_passengers: s.report_passengers,
    report_bemerkung: s.report_bemerkung,
    rikscha: (s.rikscha as RikschaName | null) ?? null,
    report_at: s.report_at,
  }))

  const piloten: Pilot[] = slots
    .filter((s) => s.pilot_id !== null)
    .map((s) => ({ id: s.pilot_id as string, name: benutzerName(s.pilot_id) ?? 'Unbekannt' }))

  const notizen: Notiz[] = daten()
    .notes.filter((n) => n.ride_id === f.id)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((n) => ({
      id: n.id,
      name: benutzerName(n.author_id) ?? 'Unbekannt',
      body: n.body,
      created_at: n.created_at,
    }))

  const eintraege = slots
    .map((s) => s.report_at)
    .filter((a): a is string => a !== null)
    .sort()
  const letzterEintrag = eintraege.length > 0 ? eintraege[eintraege.length - 1] : undefined
  const letzterErfasser = slots
    .filter((s) => s.report_at === letzterEintrag)
    .map((s) => benutzerName(s.pilot_id))[0]

  return {
    id: f.id,
    starts_at: f.starts_at,
    location: f.location,
    info: f.info,
    pilots_needed: benoetigt,
    status: f.status,
    zustand: zustandVon(f, benoetigt, belegt, vollstaendig),
    angemeldet: belegt,
    bin_dabei: slots.some((s) => s.pilot_id === ichId),
    piloten,
    plaetze,
    notizen,
    report_km: summe(slots.map((s) => s.report_km)),
    report_minutes: summe(slots.map((s) => s.report_minutes)),
    report_passengers: summe(slots.map((s) => s.report_passengers)),
    report_name: letzterErfasser ?? null,
    report_at: letzterEintrag ?? null,
    report_deadline: new Date(new Date(f.starts_at).getTime() + FRIST_MS).toISOString(),
    bericht_offen:
      slots.some((s) => s.pilot_id === ichId && !platzVollstaendig(s)) &&
      new Date(f.starts_at).getTime() < Date.now() &&
      f.status !== 'abgesagt',
  }
}

export async function listRides(bereich: 'offen' | 'alle'): Promise<Fahrt[]> {
  const mich = ich()
  const liste = daten()
    .rides.map((f) => alsFahrt(f, mich.id))
    .filter((f) =>
      bereich === 'offen'
        ? f.status === 'geplant' &&
          new Date(f.starts_at).getTime() >= Date.now() &&
          f.angemeldet < f.pilots_needed
        : true,
    )
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
  return kurzWarten(liste)
}

function fahrtOderFehler(id: string): DemoRide {
  const f = daten().rides.find((r) => r.id === id)
  if (!f) throw fehler('Diese Fahrt gibt es nicht mehr.')
  return f
}

export async function bookSlot(slotId: string): Promise<void> {
  const mich = ich()
  const slot = daten().slots.find((s) => s.id === slotId)
  if (!slot) throw fehler('Diesen Platz gibt es nicht mehr.')
  if (slot.pilot_id !== null) throw fehler('Dieser Platz ist schon vergeben.')
  const fahrt = fahrtOderFehler(slot.ride_id)
  if (fahrt.status === 'abgesagt') throw fehler('Diese Fahrt ist abgesagt.')
  slot.pilot_id = mich.id
  aendere('fahrten')
  await kurzWarten(null)
}

export async function releaseSlot(slotId: string): Promise<void> {
  const mich = ich()
  const slot = daten().slots.find((s) => s.id === slotId)
  if (!slot) throw fehler('Diesen Platz gibt es nicht mehr.')
  if (slot.pilot_id !== mich.id && !darfVerwalten(mich)) {
    throw fehler('Diesen Platz hat jemand anderes gebucht.')
  }
  slot.pilot_id = null
  aendere('fahrten')
  await kurzWarten(null)
}

export async function rideSignup(rideId: string): Promise<void> {
  const mich = ich()
  const fahrt = fahrtOderFehler(rideId)
  if (fahrt.status === 'abgesagt') throw fehler('Diese Fahrt ist abgesagt.')
  const slots = slotsVon(rideId)
  if (slots.some((s) => s.pilot_id === mich.id)) return
  const frei = slots.find((s) => s.pilot_id === null)
  if (!frei) throw fehler('Es ist kein Platz mehr frei.')
  frei.pilot_id = mich.id
  aendere('fahrten')
  await kurzWarten(null)
}

export async function rideSignoff(rideId: string, note?: string): Promise<void> {
  const mich = ich()
  fahrtOderFehler(rideId)
  for (const s of slotsVon(rideId)) {
    if (s.pilot_id === mich.id) s.pilot_id = null
  }
  const text = note?.trim()
  if (text) notizAnlegen(rideId, mich.id, text)
  aendere('fahrten')
  await kurzWarten(null)
}

function notizAnlegen(rideId: string, autorId: string, body: string): void {
  daten().notes.push({
    id: neueId('n'),
    ride_id: rideId,
    author_id: autorId,
    body,
    created_at: jetzt(),
  })
}

export async function rideAddNote(rideId: string, note: string): Promise<void> {
  const mich = ich()
  fahrtOderFehler(rideId)
  const text = note.trim()
  if (text === '') throw fehler('Bitte eine Mitteilung eingeben.')
  notizAnlegen(rideId, mich.id, text)
  aendere('fahrten')
  await kurzWarten(null)
}

function nurVerwaltung() {
  const mich = ich()
  if (!darfVerwalten(mich)) throw fehler('Dafür fehlt dir die Berechtigung.')
  return mich
}

/** Legt so viele Plätze an, wie die Fahrt braucht – freie zuerst wieder weg. */
function passePlaetzeAn(rideId: string, anzahl: number): void {
  const db = daten()
  const slots = slotsVon(rideId)
  for (let i = slots.length; i < anzahl; i += 1) {
    db.slots.push({
      id: neueId('s'),
      ride_id: rideId,
      position: i + 1,
      pilot_id: null,
      report_km: null,
      report_minutes: null,
      report_passengers: null,
      report_bemerkung: null,
      rikscha: null,
      report_at: null,
    })
  }
  // Zu viele Plätze: nur die freien von hinten entfernen, gebuchte bleiben
  for (let i = slots.length - 1; i >= anzahl; i -= 1) {
    const slot = slots[i]
    if (slot.pilot_id === null) db.slots = db.slots.filter((s) => s.id !== slot.id)
  }
}

export async function createRide(f: FahrtEingabe): Promise<string> {
  nurVerwaltung()
  const id = neueId('r')
  daten().rides.push({
    id,
    starts_at: new Date(f.startsAt).toISOString(),
    location: f.location.trim(),
    info: f.info.trim(),
    pilots_needed: f.pilotsNeeded,
    status: 'geplant',
  })
  passePlaetzeAn(id, f.pilotsNeeded)
  aendere('fahrten')
  return kurzWarten(id)
}

export async function updateRide(id: string, f: FahrtEingabe): Promise<void> {
  nurVerwaltung()
  const fahrt = fahrtOderFehler(id)
  fahrt.starts_at = new Date(f.startsAt).toISOString()
  fahrt.location = f.location.trim()
  fahrt.info = f.info.trim()
  fahrt.pilots_needed = f.pilotsNeeded
  fahrt.status = f.status
  passePlaetzeAn(id, f.pilotsNeeded)
  aendere('fahrten')
  await kurzWarten(null)
}

export async function deleteRide(id: string): Promise<void> {
  nurVerwaltung()
  const db = daten()
  db.rides = db.rides.filter((r) => r.id !== id)
  db.slots = db.slots.filter((s) => s.ride_id !== id)
  db.notes = db.notes.filter((n) => n.ride_id !== id)
  aendere('fahrten')
  await kurzWarten(null)
}

export async function setPilot(rideId: string, pilotId: string, dabei: boolean): Promise<void> {
  nurVerwaltung()
  fahrtOderFehler(rideId)
  const slots = slotsVon(rideId)
  if (dabei) {
    if (slots.some((s) => s.pilot_id === pilotId)) return
    const frei = slots.find((s) => s.pilot_id === null)
    if (!frei) throw fehler('Es ist kein Platz mehr frei.')
    frei.pilot_id = pilotId
  } else {
    for (const s of slots) if (s.pilot_id === pilotId) s.pilot_id = null
  }
  aendere('fahrten')
  await kurzWarten(null)
}

export async function listPilots(): Promise<Pilot[]> {
  ich()
  const liste = daten()
    .users.filter((u) => u.is_active)
    .map((u) => ({ id: u.id, name: u.full_name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'de'))
  return kurzWarten(liste)
}

export async function rideCancel(rideId: string, grund: string): Promise<void> {
  const mich = ich()
  const fahrt = fahrtOderFehler(rideId)
  const text = grund.trim()
  if (text === '') throw fehler('Bitte einen Grund angeben.')
  const eingetragen = slotsVon(rideId).some((s) => s.pilot_id === mich.id)
  if (!eingetragen && !darfVerwalten(mich)) {
    throw fehler('Absagen dürfen nur Eingetragene und die Koordination.')
  }
  fahrt.status = 'abgesagt'
  notizAnlegen(rideId, mich.id, text)
  aendere('fahrten')
  await kurzWarten(null)
}

export async function slotReport(slotId: string, b: Bericht): Promise<void> {
  const mich = ich()
  const slot = daten().slots.find((s) => s.id === slotId)
  if (!slot) throw fehler('Diesen Platz gibt es nicht mehr.')
  if (slot.pilot_id !== mich.id && !darfVerwalten(mich)) {
    throw fehler('Nachtragen darf, wer gefahren ist – oder die Koordination.')
  }

  // Leere Felder bleiben leer statt zu 0 zu werden – vorhandene Angaben
  // bleiben dann unangetastet, sodass sich Angaben ergänzen lassen.
  const zahl = (wert: string) => {
    const t = wert.trim().replace(',', '.')
    return t === '' ? null : Number(t)
  }

  // Erfasst wird in Stunden, gespeichert in Minuten
  const stunden = zahl(b.stunden)
  const bemerkung = b.bemerkung.trim()

  const km = zahl(b.km)
  const personen = zahl(b.personen)

  if (km !== null) slot.report_km = km
  if (stunden !== null) slot.report_minutes = Math.round(stunden * 60)
  if (personen !== null) slot.report_passengers = personen
  if (b.rikscha) slot.rikscha = b.rikscha
  if (bemerkung !== '') slot.report_bemerkung = bemerkung
  slot.report_at = jetzt()

  aendere('fahrten')
  await kurzWarten(null)
}

export async function rikschaStatistik(): Promise<RikschaStatistik[]> {
  ich()
  const summen = new Map<string, RikschaStatistik>()
  for (const s of daten().slots) {
    if (!s.rikscha) continue
    const e = summen.get(s.rikscha) ?? {
      rikscha: s.rikscha,
      km: 0,
      minuten: 0,
      personen: 0,
      fahrten: 0,
    }
    e.km += s.report_km ?? 0
    e.minuten += s.report_minutes ?? 0
    e.personen += s.report_passengers ?? 0
    e.fahrten += 1
    summen.set(s.rikscha, e)
  }
  const liste = [...summen.values()]
    .map((e) => ({ ...e, km: Math.round(e.km * 10) / 10 }))
    .sort((a, b) => a.rikscha.localeCompare(b.rikscha, 'de'))
  return kurzWarten(liste)
}

/* --- Übernahme der bisherigen Statistik ---------------------------------- */

export async function listUebernahmen(): Promise<Uebernahme[]> {
  ich()
  const liste = [...daten().uebernahmen].sort((a, b) =>
    a.bezeichnung.localeCompare(b.bezeichnung, 'de'),
  )
  return kurzWarten(liste)
}

export async function saveUebernahme(id: string | null, e: UebernahmeEingabe): Promise<void> {
  const mich = nurVerwaltung()
  const zahl = (w: string) => {
    const t = w.trim().replace(',', '.')
    return t === '' ? 0 : Number(t)
  }
  const bezeichnung = e.bezeichnung.trim()
  if (bezeichnung === '') throw fehler('Bitte eine Bezeichnung angeben.')

  const werte = {
    bezeichnung,
    km: zahl(e.km),
    // Auch hier wird in Stunden erfasst und in Minuten gespeichert
    minuten: Math.round(zahl(e.stunden) * 60),
    personen: zahl(e.personen),
    erfasst_von: mich.full_name,
    erfasst_am: jetzt(),
  }

  const db = daten()
  const vorhanden = id ? db.uebernahmen.find((u) => u.id === id) : undefined
  if (vorhanden) Object.assign(vorhanden, werte)
  else db.uebernahmen.push({ id: neueId('ue'), ...werte })

  aendere('fahrten')
  await kurzWarten(null)
}

export async function deleteUebernahme(id: string): Promise<void> {
  nurVerwaltung()
  const db = daten()
  db.uebernahmen = db.uebernahmen.filter((u) => u.id !== id)
  aendere('fahrten')
  await kurzWarten(null)
}

/** Ruft `onChange` auf, sobald sich an den Fahrten etwas ändert. */
export function watchRides(onChange: () => void): () => void {
  const abmelden = beobachte('fahrten', onChange)

  // Der Zustand einer Fahrt hängt auch an der Uhrzeit (Termin vorbei, Frist
  // abgelaufen). Deshalb wie früher zusätzlich in Ruhe nachladen.
  const intervall = window.setInterval(() => {
    if (document.visibilityState === 'visible' && aktuellerBenutzer()) onChange()
  }, 30000)

  return () => {
    abmelden()
    window.clearInterval(intervall)
  }
}
