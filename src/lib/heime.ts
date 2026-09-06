import { aendere, daten, darfVerwalten, fehler, ich, kurzWarten, neueId } from './demoBackend'

/**
 * Die Seniorenheime, zu denen regelmäßig gefahren wird - als Vorlage beim
 * Anlegen einer Fahrt.
 *
 * Die Liste wird in den Admin Einstellungen gepflegt. In dieser Demo liegt
 * sie bei den lokalen Beispieldaten.
 */
export type Heim = {
  id: string
  name: string
  anschrift: string
  telefon: string
}

/** Lesen dürfen alle Freigeschalteten - jede Person legt mal eine Fahrt an. */
export async function listHeime(): Promise<Heim[]> {
  ich()
  const liste = [...daten().heime].sort((a, b) => a.name.localeCompare(b.name, 'de'))
  return kurzWarten(liste)
}

/** Ohne id kommt ein Haus dazu, mit id wird das vorhandene geändert. */
export async function speichereHeim(h: {
  id?: string
  name: string
  anschrift: string
  telefon: string
}): Promise<Heim> {
  nurVerwaltung()
  const name = h.name.trim()
  if (name === '') throw fehler('Bitte einen Namen angeben.')

  const werte = { name, anschrift: h.anschrift.trim(), telefon: h.telefon.trim() }
  const db = daten()
  const vorhanden = h.id ? db.heime.find((x) => x.id === h.id) : undefined

  const heim: Heim = vorhanden
    ? Object.assign(vorhanden, werte)
    : { id: neueId('h'), ...werte }
  if (!vorhanden) db.heime.push(heim)

  aendere('stammdaten')
  return kurzWarten(heim)
}

/**
 * Entfernt eine Vorlage. Schon angelegte Fahrten bleiben unberührt: Ort und
 * Infotext stehen dort als eigener Text und hängen nicht an der Vorlage.
 */
export async function loescheHeim(id: string): Promise<string> {
  nurVerwaltung()
  const db = daten()
  const heim = db.heime.find((h) => h.id === id)
  if (!heim) throw fehler('Diese Vorlage gibt es nicht mehr.')
  db.heime = db.heime.filter((h) => h.id !== id)
  aendere('stammdaten')
  return kurzWarten(heim.name)
}

/** Vorlagen pflegen darf nur die Koordination. */
function nurVerwaltung() {
  const mich = ich()
  if (!darfVerwalten(mich)) throw fehler('Dafür fehlt dir die Berechtigung.')
  return mich
}

/** Was im Feld „Wo“ steht: Name und Anschrift. */
export function heimOrt(h: Heim): string {
  return h.anschrift.trim() === '' ? h.name : `${h.name}, ${h.anschrift}`
}

/** Die Telefonzeile für den Infotext. */
export function heimTelefonzeile(h: Heim): string {
  return `Tel. ${h.name}: ${h.telefon}`
}

/**
 * Setzt die Telefonzeile des gewählten Hauses in den Infotext.
 *
 * Selbst geschriebene Hinweise bleiben stehen; nur eine Telefonzeile, die
 * von einem anderen Haus stammt, wird ersetzt. Sonst sammelten sich beim
 * Umwählen alte Nummern an. Dafür braucht es die ganze Liste - `alle` sind
 * die aktuell geladenen Vorlagen.
 */
export function infoMitTelefon(info: string, h: Heim, alle: Heim[]): string {
  const bekannt = new Set(alle.map(heimTelefonzeile))
  const rest = info
    .split('\n')
    .filter((zeile) => !bekannt.has(zeile.trim()))
    .join('\n')
    .trim()

  const zeile = heimTelefonzeile(h)
  return rest === '' ? zeile : `${zeile}\n${rest}`
}
