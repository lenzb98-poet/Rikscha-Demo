/**
 * Die Datenschnittstelle der Anwendung.
 *
 * In der Demo-Version arbeitet sie ausschließlich mit den lokalen
 * Beispieldaten (siehe demoDaten.ts). Es werden keine Anfragen an einen
 * Server geschickt; die Anwendung funktioniert vollständig offline.
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
  melde_ab,
  melde_an,
  neueId,
} from './demoBackend'
import type { DemoMessage, DemoUser } from './demoDaten'

export { setzeDemoZurueck } from './demoBackend'

/** In dieser Fassung liegen alle Daten im Browser. */
export const IST_DEMO = true

/** Hinweis auf der Anmeldeseite, damit klar ist, womit man es zu tun hat. */
export const DEMO_HINWEIS =
  'Demo-Version ohne Server: Alle Daten sind Beispieldaten im Browser. ' +
  'Änderungen bleiben auf diesem Gerät und betreffen niemanden sonst.'

/* --- Anmeldung ----------------------------------------------------------- */

/**
 * Meldet in der Demo ohne Eingabe an – ein Knopf genügt.
 *
 * Genommen wird die Administration, damit beim Ansehen alle Bereiche
 * offenstehen; sonst die erste freigeschaltete Person.
 */
export async function demoAnmelden(): Promise<void> {
  const frei = daten().users.filter((u) => u.is_active)
  const user = frei.find((u) => u.role === 'admin') ?? frei[0]
  if (!user) throw fehler('In den Beispieldaten ist niemand freigeschaltet.')
  await kurzWarten(null)
  melde_an(user.id)
}

export async function abmelden(): Promise<void> {
  melde_ab()
}

/* --- Benutzerverwaltung -------------------------------------------------- */

export type Rolle = 'admin' | 'koordinator' | 'fahrer'

export type TeamMember = {
  id: string
  full_name: string
  role: Rolle
  is_active: boolean
  phone: string | null
  contact_email: string | null
  /**
   * Ob die Person schon ein Passwort vergeben hat. Null für Fahrer:innen –
   * das ist Verwaltungswissen und wird ihnen gar nicht erst geliefert.
   */
  hat_passwort?: boolean | null
}

export type Stammdaten = {
  fullName: string
  role: Rolle
  phone: string
  contactEmail: string
}

function alsTeamMember(u: DemoUser, verwaltet: boolean): TeamMember {
  return {
    id: u.id,
    full_name: u.full_name,
    role: u.role,
    is_active: u.is_active,
    phone: u.phone,
    contact_email: u.contact_email,
    hat_passwort: verwaltet ? u.passwort !== null : null,
  }
}

function nurVerwaltung(): DemoUser {
  const mich = ich()
  if (!darfVerwalten(mich)) throw fehler('Dafür fehlt dir die Berechtigung.')
  return mich
}

/**
 * Lädt die Pilot:innen-Liste. Deaktivierte erscheinen nur für Koordination
 * und Administration.
 */
export async function listUsers(): Promise<TeamMember[]> {
  const mich = ich()
  const verwaltet = darfVerwalten(mich)
  const liste = daten()
    .users.filter((u) => verwaltet || u.is_active)
    .map((u) => alsTeamMember(u, verwaltet))
    .sort((a, b) => a.full_name.localeCompare(b.full_name, 'de'))
  return kurzWarten(liste)
}

/** Legt eine:n neue:n Fahrer:in an. */
export async function createUser(d: Stammdaten): Promise<TeamMember> {
  nurVerwaltung()
  const name = d.fullName.trim()
  if (name === '') throw fehler('Bitte einen Namen eingeben.')
  if (daten().users.some((u) => u.full_name.toLowerCase() === name.toLowerCase())) {
    throw fehler('Diesen Namen gibt es bereits.')
  }
  const user: DemoUser = {
    id: neueId('u'),
    full_name: name,
    login_email: `${name.toLowerCase().replace(/[^a-z0-9]+/g, '.')}@demo.local`,
    role: d.role,
    is_active: true,
    phone: d.phone.trim() || null,
    contact_email: d.contactEmail.trim() || null,
    passwort: null,
    chat_gesehen_bis: null,
  }
  daten().users.push(user)
  aendere('stammdaten')
  return kurzWarten(alsTeamMember(user, true))
}

/** Ändert alle Stammdaten. */
export async function updateUser(
  id: string,
  d: Stammdaten & { isActive: boolean },
): Promise<TeamMember> {
  const mich = nurVerwaltung()
  const user = daten().users.find((u) => u.id === id)
  if (!user) throw fehler('Diesen Eintrag gibt es nicht mehr.')
  // Wie in der Vollversion: die Adminrolle vergibt nur die Administration
  if (d.role === 'admin' && mich.role !== 'admin') {
    throw fehler('Die Adminrolle darf nur die Administration vergeben.')
  }
  user.full_name = d.fullName.trim()
  user.role = d.role
  user.is_active = d.isActive
  user.phone = d.phone.trim() || null
  user.contact_email = d.contactEmail.trim() || null
  aendere('stammdaten')
  return kurzWarten(alsTeamMember(user, true))
}

/** Hat die Person schon ein Passwort vergeben? */
export function hatPasswort(m: TeamMember): boolean {
  return m.hat_passwort === true
}

/**
 * Setzt das Passwort zurück: Beim nächsten Anmelden vergibt die Person
 * selbst ein neues.
 */
export async function resetPassword(id: string): Promise<string> {
  nurVerwaltung()
  const user = daten().users.find((u) => u.id === id)
  if (!user) throw fehler('Diesen Eintrag gibt es nicht mehr.')
  user.passwort = null
  aendere('stammdaten')
  return kurzWarten(user.full_name)
}

/** Löscht einen Eintrag endgültig. */
export async function deleteUser(id: string): Promise<string> {
  nurVerwaltung()
  const db = daten()
  const user = db.users.find((u) => u.id === id)
  if (!user) throw fehler('Diesen Eintrag gibt es nicht mehr.')
  db.users = db.users.filter((u) => u.id !== id)
  for (const s of db.slots) if (s.pilot_id === id) s.pilot_id = null
  aendere('stammdaten', 'fahrten')
  return kurzWarten(user.full_name)
}

/* --- Chat ---------------------------------------------------------------- */

/**
 * Die Zeichen zur Auswahl. Feste, kleine Liste statt einer vollen
 * Emoji-Tastatur: überall gleich, ohne Fremdbibliothek, mit einem Griff
 * bedienbar.
 */
export const REAKTIONEN = ['👍', '❤️', '😊', '👏', '🙏', '😢'] as const

export type Reaktion = {
  emoji: string
  anzahl: number
  /** Wer reagiert hat, für den Tooltip. */
  namen: string
  ist_meine: boolean
}

export type ChatNachricht = {
  id: string
  body: string
  created_at: string
  author_id: string
  author_name: string
  ist_eigene: boolean
  image_path: string | null
  image_width: number | null
  image_height: number | null
  image_removed: boolean
  /** Auf welche Nachricht sich diese bezieht; null bei einer gewöhnlichen. */
  reply_to: string | null
  reply_autor: string | null
  /** Ausschnitt der Bezugsnachricht, auf 140 Zeichen gekürzt. */
  reply_text: string | null
  reply_bild: boolean | null
  /** Nach Häufigkeit sortiert; leer, wenn niemand reagiert hat. */
  reaktionen: Reaktion[]
}

function reaktionenZu(messageId: string, ichId: string): Reaktion[] {
  const gruppen = new Map<string, { namen: string[]; ist_meine: boolean }>()
  for (const r of daten().reaktionen) {
    if (r.message_id !== messageId) continue
    const eintrag = gruppen.get(r.emoji) ?? { namen: [], ist_meine: false }
    eintrag.namen.push(benutzerName(r.user_id) ?? 'Unbekannt')
    if (r.user_id === ichId) eintrag.ist_meine = true
    gruppen.set(r.emoji, eintrag)
  }
  return [...gruppen.entries()]
    .map(([emoji, e]) => ({
      emoji,
      anzahl: e.namen.length,
      namen: e.namen.join(', '),
      ist_meine: e.ist_meine,
    }))
    // Häufigste zuerst, bei Gleichstand nach dem Zeichen
    .sort((a, b) => b.anzahl - a.anzahl || a.emoji.localeCompare(b.emoji))
}

function alsNachricht(m: DemoMessage, ichId: string): ChatNachricht {
  const bezug = m.reply_to ? daten().messages.find((x) => x.id === m.reply_to) : undefined
  return {
    id: m.id,
    body: m.body,
    created_at: m.created_at,
    author_id: m.author_id,
    author_name: benutzerName(m.author_id) ?? 'Unbekannt',
    ist_eigene: m.author_id === ichId,
    image_path: m.image_path,
    image_width: m.image_width,
    image_height: m.image_height,
    image_removed: m.image_removed,
    reply_to: m.reply_to,
    reply_autor: bezug ? benutzerName(bezug.author_id) : null,
    reply_text: bezug ? bezug.body.slice(0, 140) : null,
    reply_bild: bezug ? bezug.image_path !== null : null,
    reaktionen: reaktionenZu(m.id, ichId),
  }
}

/** Lädt den Verlauf, neueste zuerst. */
export async function listMessages(limit = 200): Promise<ChatNachricht[]> {
  const mich = ich()
  const liste = [...daten().messages]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit)
    .map((m) => alsNachricht(m, mich.id))
  return kurzWarten(liste)
}

/** Adressen der Chatbilder. In der Demo liegen sie als Data-URL im Browser. */
export async function bildAdressen(pfade: string[]): Promise<Record<string, string>> {
  if (pfade.length === 0) return {}
  const map: Record<string, string> = {}
  for (const pfad of pfade) {
    const bild = daten().bilder[pfad]
    if (bild) map[pfad] = bild
  }
  return kurzWarten(map, 0)
}

/** Legt ein Bild lokal ab und gibt seinen Pfad zurück. */
export async function ladeBildHoch(datei: Blob, endung = 'jpg'): Promise<string> {
  const pfad = `${neueId('bild')}.${endung}`
  const dataUrl = await new Promise<string>((fertig, schiefgegangen) => {
    const leser = new FileReader()
    leser.onload = () => fertig(String(leser.result))
    leser.onerror = () => schiefgegangen(fehler('Das Bild konnte nicht gespeichert werden.'))
    leser.readAsDataURL(datei)
  })
  daten().bilder[pfad] = dataUrl
  aendere('chat')
  return pfad
}

export type NeueNachricht = {
  body: string
  imagePath?: string | null
  imageSize?: number | null
  imageWidth?: number | null
  imageHeight?: number | null
  /** Auf welche Nachricht geantwortet wird. */
  replyTo?: string | null
}

/** Sendet eine Nachricht. Der Absender ist die angemeldete Person. */
export async function sendMessage(n: NeueNachricht): Promise<ChatNachricht> {
  const mich = ich()
  const text = n.body.trim()
  if (text === '' && !n.imagePath) throw fehler('Bitte etwas schreiben.')
  const nachricht: DemoMessage = {
    id: neueId('m'),
    body: text,
    created_at: jetzt(),
    author_id: mich.id,
    image_path: n.imagePath ?? null,
    image_width: n.imageWidth ?? null,
    image_height: n.imageHeight ?? null,
    image_removed: false,
    reply_to: n.replyTo ?? null,
  }
  daten().messages.push(nachricht)
  aendere('chat')
  return kurzWarten(alsNachricht(nachricht, mich.id))
}

/**
 * Setzt eine Reaktion oder nimmt sie wieder weg – derselbe Aufruf schaltet
 * um. Gibt zurück, ob sie jetzt gesetzt ist.
 */
export async function reagiere(messageId: string, emoji: string): Promise<boolean> {
  const mich = ich()
  if (!(REAKTIONEN as readonly string[]).includes(emoji)) {
    throw fehler('Dieses Zeichen steht nicht zur Auswahl.')
  }
  const db = daten()
  const vorhanden = db.reaktionen.some(
    (r) => r.message_id === messageId && r.user_id === mich.id && r.emoji === emoji,
  )
  db.reaktionen = db.reaktionen.filter(
    (r) => !(r.message_id === messageId && r.user_id === mich.id && r.emoji === emoji),
  )
  if (!vorhanden) db.reaktionen.push({ message_id: messageId, user_id: mich.id, emoji })
  aendere('chat')
  return kurzWarten(!vorhanden)
}

/** Löscht eine Nachricht samt Bild. Erlaubt für eigene, für die Verwaltung auch fremde. */
export async function deleteMessage(id: string): Promise<void> {
  const mich = ich()
  const db = daten()
  const nachricht = db.messages.find((m) => m.id === id)
  if (!nachricht) return
  if (nachricht.author_id !== mich.id && !darfVerwalten(mich)) {
    throw fehler('Fremde Nachrichten darf nur die Koordination löschen.')
  }
  db.messages = db.messages.filter((m) => m.id !== id)
  db.reaktionen = db.reaktionen.filter((r) => r.message_id !== id)
  // Antworten darauf verlieren nur den Bezug, nicht ihren Text
  for (const m of db.messages) if (m.reply_to === id) m.reply_to = null
  if (nachricht.image_path) delete db.bilder[nachricht.image_path]
  aendere('chat')
  await kurzWarten(null)
}

/** Wie viel Platz die Chatbilder höchstens belegen dürfen. */
const BILDER_GRENZE = 750 * 1024 * 1024

/**
 * Räumt den Bildspeicher auf: älteste Bilder verschwinden, bis die Grenze
 * wieder eingehalten wird. Gibt die Zahl der entfernten Bilder zurück.
 */
export async function raeumeBildspeicherAuf(): Promise<number> {
  const db = daten()
  const groesse = (pfad: string) => (db.bilder[pfad]?.length ?? 0) * 0.75

  let belegt = Object.keys(db.bilder).reduce((summe, p) => summe + groesse(p), 0)
  if (belegt <= BILDER_GRENZE) return kurzWarten(0)

  const mitBild = db.messages
    .filter((m) => m.image_path && !m.image_removed)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))

  let entfernt = 0
  for (const m of mitBild) {
    if (belegt <= BILDER_GRENZE) break
    const pfad = m.image_path as string
    belegt -= groesse(pfad)
    delete db.bilder[pfad]
    m.image_removed = true
    m.image_path = null
    entfernt += 1
  }
  if (entfernt > 0) aendere('chat')
  return kurzWarten(entfernt)
}

/** Ruft `onChange` auf, sobald sich am Verlauf etwas ändert. */
export function watchMessages(onChange: () => void): () => void {
  return beobachte('chat', onChange)
}

/* --- Lesestand des Chats ------------------------------------------------- */

export function chatGesehenBis(): string | null {
  return aktuellerBenutzer()?.chat_gesehen_bis ?? null
}

export function setzeChatGesehenBis(bis: string): string {
  const mich = ich()
  // Der Stand wandert nur vorwärts und nie in die Zukunft
  const grenze = jetzt()
  const wert = bis > grenze ? grenze : bis
  if (!mich.chat_gesehen_bis || wert > mich.chat_gesehen_bis) {
    mich.chat_gesehen_bis = wert
    aendere('chat')
  }
  return mich.chat_gesehen_bis
}

export function zaehleUngelesen(): number {
  const mich = aktuellerBenutzer()
  if (!mich) return 0
  const stand = mich.chat_gesehen_bis
  return daten().messages.filter(
    (m) => m.author_id !== mich.id && (!stand || m.created_at > stand),
  ).length
}
