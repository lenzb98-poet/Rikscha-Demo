import { useState } from 'react'
import { demoAnmelden, DEMO_HINWEIS } from '../lib/daten'
import { toGermanError } from '../lib/errors'
import { Logo, Moewe, RadelnLogo } from '../components/Marke'

/**
 * Anmeldung der Demo-Version: ein Knopf, kein Name, kein Passwort.
 *
 * Wer die Demo ansieht, soll sofort hineinkommen. Angemeldet wird deshalb
 * als Administration, damit alle Bereiche offenstehen.
 */
export function Login() {
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleAnmelden() {
    setError(null)
    setBusy(true)
    try {
      await demoAnmelden()
    } catch (err) {
      setError(toGermanError(err))
      setBusy(false)
    }
  }

  return (
    <div className="auth">
      <div className="auth__inner">
        <Moewe className="marke-moewe" />
        <Logo className="marke-logo" />

        <div className="auth__card">
          <header className="auth__header">
            <RadelnLogo className="auth__radeln" />
            <h1>Rikscha-Fahrten</h1>
            <p className="auth__sub">Demo für Fahrer:innen und Koordination</p>
          </header>

          <p className="alert alert--warn">{DEMO_HINWEIS}</p>

          <div className="auth__form">
            <p className="auth__intro">
              Zum Ansehen ist keine Anmeldung nötig. Ein Tipp auf den Knopf öffnet die App mit
              Beispieldaten.
            </p>
            <button className="btn" type="button" onClick={handleAnmelden} disabled={busy} autoFocus>
              {busy ? 'Einen Moment …' : 'Anmelden'}
            </button>
          </div>

          {error && <p className="alert alert--error">{error}</p>}
        </div>
      </div>
    </div>
  )
}
