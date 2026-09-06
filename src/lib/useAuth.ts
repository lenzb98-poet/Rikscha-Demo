import { useEffect, useState } from 'react'
import { abmelden } from './daten'
import { aktuellerBenutzer, beobachte } from './demoBackend'

export type AppUser = {
  id: string
  full_name: string
  contact_email: string | null
  phone: string | null
  role: 'admin' | 'koordinator' | 'fahrer'
  is_active: boolean
}

/** In der Demo besteht die Sitzung nur aus der angemeldeten Person. */
export type Sitzung = { user: AppUser }

function leseSitzung(): Sitzung | null {
  const user = aktuellerBenutzer()
  if (!user) return null
  return {
    user: {
      id: user.id,
      full_name: user.full_name,
      contact_email: user.contact_email,
      phone: user.phone,
      role: user.role,
      is_active: user.is_active,
    },
  }
}

export function useAuth() {
  const [session, setSession] = useState<Sitzung | null>(leseSitzung)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setSession(leseSitzung())
    setLoading(false)
    // Anmelden, Abmelden und geänderte Stammdaten schlagen hier durch
    const ausSitzung = beobachte('sitzung', () => setSession(leseSitzung()))
    const ausStammdaten = beobachte('stammdaten', () => setSession(leseSitzung()))
    return () => {
      ausSitzung()
      ausStammdaten()
    }
  }, [])

  return {
    session,
    profile: session?.user ?? null,
    loading,
    signOut: () => void abmelden(),
  }
}
