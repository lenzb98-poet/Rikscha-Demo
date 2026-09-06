/**
 * Beispieldaten der Demo-Version.
 *
 * Diese Anwendung läuft ohne Server: Es gibt keine Datenbank und keine
 * Netzwerkzugriffe. Alles, was die Oberfläche anzeigt, stammt aus den hier
 * beschriebenen Beispieldaten und wird zur Laufzeit im Browser verändert.
 */

export type DemoRolle = 'admin' | 'koordinator' | 'fahrer'
export type DemoRideStatus = 'geplant' | 'abgesagt' | 'abgeschlossen'

export type DemoUser = {
  id: string
  full_name: string
  /** Technische Kennung wie früher in der Anmeldung – nur intern. */
  login_email: string
  role: DemoRolle
  is_active: boolean
  phone: string | null
  contact_email: string | null
  /** Null heißt: Es wurde noch kein Passwort vergeben. */
  passwort: string | null
  chat_gesehen_bis: string | null
}

export type DemoRide = {
  id: string
  starts_at: string
  location: string
  info: string
  pilots_needed: number
  status: DemoRideStatus
}

export type DemoSlot = {
  id: string
  ride_id: string
  position: number
  pilot_id: string | null
  report_km: number | null
  report_minutes: number | null
  report_passengers: number | null
  report_bemerkung: string | null
  rikscha: string | null
  report_at: string | null
}

export type DemoNote = {
  id: string
  ride_id: string
  author_id: string
  body: string
  created_at: string
}

export type DemoMessage = {
  id: string
  body: string
  created_at: string
  author_id: string
  image_path: string | null
  image_width: number | null
  image_height: number | null
  image_removed: boolean
  reply_to: string | null
}

export type DemoReaktion = {
  message_id: string
  user_id: string
  emoji: string
}

export type DemoHeim = {
  id: string
  name: string
  anschrift: string
  telefon: string
}

export type DemoUebernahme = {
  id: string
  bezeichnung: string
  km: number
  minuten: number
  personen: number
  erfasst_von: string | null
  erfasst_am: string
}

export type DemoDb = {
  users: DemoUser[]
  rides: DemoRide[]
  slots: DemoSlot[]
  notes: DemoNote[]
  messages: DemoMessage[]
  reaktionen: DemoReaktion[]
  heime: DemoHeim[]
  uebernahmen: DemoUebernahme[]
  /** Chatbilder als Data-URL – in der Demo gibt es keinen Dateispeicher. */
  bilder: Record<string, string>
}

/** Passwort, mit dem in der Demo alle vorbereiteten Zugänge funktionieren. */
export const DEMO_PASSWORT = 'demo1234'

/** Tage/Stunden relativ zu jetzt – so wirken die Beispieldaten immer aktuell. */
function verschoben(tage: number, stunde: number, minute = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + tage)
  d.setHours(stunde, minute, 0, 0)
  return d.toISOString()
}

const U = {
  lenz: 'u-1000-0000-0000-0000-000000000001',
  martina: 'u-1000-0000-0000-0000-000000000002',
  bernd: 'u-1000-0000-0000-0000-000000000003',
  anke: 'u-1000-0000-0000-0000-000000000004',
  hilde: 'u-1000-0000-0000-0000-000000000005',
  jonas: 'u-1000-0000-0000-0000-000000000006',
}

/** Frisch aufgebaute Beispieldaten. */
export function baueBeispieldaten(): DemoDb {
  const users: DemoUser[] = [
    {
      id: U.lenz,
      full_name: 'Lenz Becker',
      login_email: 'lenz.becker@demo.local',
      role: 'admin',
      is_active: true,
      phone: '05422 111111',
      contact_email: 'lenz.becker@demo.local',
      passwort: DEMO_PASSWORT,
      chat_gesehen_bis: null,
    },
    {
      id: U.martina,
      full_name: 'Martina Vogel',
      login_email: 'martina.vogel@demo.local',
      role: 'koordinator',
      is_active: true,
      phone: '05422 222222',
      contact_email: 'martina.vogel@demo.local',
      passwort: DEMO_PASSWORT,
      chat_gesehen_bis: null,
    },
    {
      id: U.bernd,
      full_name: 'Bernd Kramer',
      login_email: 'bernd.kramer@demo.local',
      role: 'fahrer',
      is_active: true,
      phone: '05422 333333',
      contact_email: null,
      passwort: DEMO_PASSWORT,
      chat_gesehen_bis: null,
    },
    {
      id: U.anke,
      full_name: 'Anke Meier',
      login_email: 'anke.meier@demo.local',
      role: 'fahrer',
      is_active: true,
      phone: null,
      contact_email: 'anke.meier@demo.local',
      passwort: DEMO_PASSWORT,
      chat_gesehen_bis: null,
    },
    {
      id: U.hilde,
      full_name: 'Hilde Bergmann',
      login_email: 'hilde.bergmann@demo.local',
      role: 'fahrer',
      is_active: true,
      phone: null,
      contact_email: null,
      // Noch kein Passwort: zeigt in der Demo die Erstanmeldung
      passwort: null,
      chat_gesehen_bis: null,
    },
    {
      id: U.jonas,
      full_name: 'Jonas Schulte',
      login_email: 'jonas.schulte@demo.local',
      role: 'fahrer',
      is_active: false,
      phone: null,
      contact_email: null,
      passwort: null,
      chat_gesehen_bis: null,
    },
  ]

  const heime: DemoHeim[] = [
    {
      id: 'h-0001',
      name: 'Seniorenheim Sonnenhof',
      anschrift: 'Lindenweg 4, 49324 Melle',
      telefon: '05422 900100',
    },
    {
      id: 'h-0002',
      name: 'Haus am Mühlenbach',
      anschrift: 'Mühlenstraße 21, 49324 Melle',
      telefon: '05422 900200',
    },
    {
      id: 'h-0003',
      name: 'Wohnpark Grönegau',
      anschrift: 'Grönegaustraße 8, 49324 Melle',
      telefon: '05422 900300',
    },
  ]

  const rides: DemoRide[] = [
    {
      id: 'r-0001',
      starts_at: verschoben(2, 14, 30),
      location: 'Seniorenheim Sonnenhof, Lindenweg 4, 49324 Melle',
      info: 'Tel. Seniorenheim Sonnenhof: 05422 900100\nTreffpunkt am Haupteingang.',
      pilots_needed: 2,
      status: 'geplant',
    },
    {
      id: 'r-0002',
      starts_at: verschoben(5, 10, 0),
      location: 'Haus am Mühlenbach, Mühlenstraße 21, 49324 Melle',
      info: 'Tel. Haus am Mühlenbach: 05422 900200\nRunde am Mühlenteich, ca. zwei Stunden.',
      pilots_needed: 2,
      status: 'geplant',
    },
    {
      id: 'r-0003',
      starts_at: verschoben(9, 15, 0),
      location: 'Wohnpark Grönegau, Grönegaustraße 8, 49324 Melle',
      info: 'Tel. Wohnpark Grönegau: 05422 900300',
      pilots_needed: 3,
      status: 'geplant',
    },
    {
      id: 'r-0004',
      // Gestern: Angaben fehlen noch, die Frist läuft
      starts_at: verschoben(-1, 15, 0),
      location: 'Seniorenheim Sonnenhof, Lindenweg 4, 49324 Melle',
      info: 'Tel. Seniorenheim Sonnenhof: 05422 900100',
      pilots_needed: 2,
      status: 'geplant',
    },
    {
      id: 'r-0005',
      // Vorletzte Woche: vollständig nachgetragen
      starts_at: verschoben(-9, 14, 0),
      location: 'Haus am Mühlenbach, Mühlenstraße 21, 49324 Melle',
      info: 'Tel. Haus am Mühlenbach: 05422 900200',
      pilots_needed: 2,
      status: 'geplant',
    },
    {
      id: 'r-0006',
      starts_at: verschoben(-16, 16, 0),
      location: 'Wohnpark Grönegau, Grönegaustraße 8, 49324 Melle',
      info: 'Wegen Regen abgesagt.',
      pilots_needed: 2,
      status: 'abgesagt',
    },
  ]

  const slot = (
    id: string,
    ride_id: string,
    position: number,
    pilot_id: string | null,
    bericht?: Partial<DemoSlot>,
  ): DemoSlot => ({
    id,
    ride_id,
    position,
    pilot_id,
    report_km: null,
    report_minutes: null,
    report_passengers: null,
    report_bemerkung: null,
    rikscha: null,
    report_at: null,
    ...bericht,
  })

  const slots: DemoSlot[] = [
    slot('s-0001', 'r-0001', 1, U.bernd),
    slot('s-0002', 'r-0001', 2, null),

    slot('s-0003', 'r-0002', 1, U.anke),
    slot('s-0004', 'r-0002', 2, U.martina),

    slot('s-0005', 'r-0003', 1, null),
    slot('s-0006', 'r-0003', 2, null),
    slot('s-0007', 'r-0003', 3, null),

    slot('s-0008', 'r-0004', 1, U.bernd),
    slot('s-0009', 'r-0004', 2, U.anke),

    slot('s-0010', 'r-0005', 1, U.martina, {
      report_km: 8.5,
      report_minutes: 95,
      report_passengers: 2,
      rikscha: 'Fritz',
      report_bemerkung: 'Schöne Runde bei Sonnenschein.',
      report_at: verschoben(-9, 18, 0),
    }),
    slot('s-0011', 'r-0005', 2, U.bernd, {
      report_km: 7.2,
      report_minutes: 90,
      report_passengers: 2,
      rikscha: 'Liese',
      report_at: verschoben(-9, 18, 20),
    }),

    slot('s-0012', 'r-0006', 1, U.anke),
    slot('s-0013', 'r-0006', 2, null),
  ]

  const notes: DemoNote[] = [
    {
      id: 'n-0001',
      ride_id: 'r-0006',
      author_id: U.martina,
      body: 'Wegen Regen abgesagt',
      created_at: verschoben(-16, 12, 0),
    },
    {
      id: 'n-0002',
      ride_id: 'r-0002',
      author_id: U.anke,
      body: 'Ich bringe eine Decke für die Fahrgäste mit.',
      created_at: verschoben(-1, 9, 30),
    },
  ]

  const messages: DemoMessage[] = [
    {
      id: 'm-0001',
      body: 'Willkommen in der Demo-Version! Hier tauscht sich das Team aus.',
      created_at: verschoben(-3, 9, 15),
      author_id: U.martina,
      image_path: null,
      image_width: null,
      image_height: null,
      image_removed: false,
      reply_to: null,
    },
    {
      id: 'm-0002',
      body: 'Fritz hat wieder Luft auf beiden Reifen – ich war eben in der Garage.',
      created_at: verschoben(-2, 17, 40),
      author_id: U.bernd,
      image_path: null,
      image_width: null,
      image_height: null,
      image_removed: false,
      reply_to: null,
    },
    {
      id: 'm-0003',
      body: 'Danke dir! Dann nehme ich Fritz am Freitag.',
      created_at: verschoben(-2, 18, 5),
      author_id: U.anke,
      image_path: null,
      image_width: null,
      image_height: null,
      image_removed: false,
      reply_to: 'm-0002',
    },
    {
      id: 'm-0004',
      body: 'Für Donnerstag ist noch ein Platz frei – mag jemand mitfahren?',
      created_at: verschoben(-1, 11, 0),
      author_id: U.martina,
      image_path: null,
      image_width: null,
      image_height: null,
      image_removed: false,
      reply_to: null,
    },
  ]

  const reaktionen: DemoReaktion[] = [
    { message_id: 'm-0002', user_id: U.martina, emoji: '👍' },
    { message_id: 'm-0002', user_id: U.anke, emoji: '👍' },
    { message_id: 'm-0001', user_id: U.bernd, emoji: '❤️' },
  ]

  const uebernahmen: DemoUebernahme[] = [
    {
      id: 'ue-0001',
      bezeichnung: 'Fahrtenbuch 2023',
      km: 412.5,
      minuten: 5460,
      personen: 168,
      erfasst_von: 'Martina Vogel',
      erfasst_am: verschoben(-120, 10, 0),
    },
    {
      id: 'ue-0002',
      bezeichnung: 'Fahrtenbuch 2024',
      km: 638.2,
      minuten: 7920,
      personen: 244,
      erfasst_von: 'Martina Vogel',
      erfasst_am: verschoben(-60, 10, 0),
    },
  ]

  return { users, rides, slots, notes, messages, reaktionen, heime, uebernahmen, bilder: {} }
}
