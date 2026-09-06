import { useState } from 'react'
import {
  anmelden,
  angemeldetBleiben,
  checkLoginName,
  DEMO_HINWEIS,
  passwortFestlegen,
  setzeAngemeldetBleiben,
} from '../lib/daten'
import { toGermanError } from '../lib/errors'
import { PasswordField, validatePassword } from '../components/PasswordField'
import { Logo, Moewe, RadelnLogo } from '../components/Marke'

type Step = 'name' | 'password' | 'create-password'

export function Login() {
  const [step, setStep] = useState<Step>('name')
  const [name, setName] = useState('')
  const [fullName, setFullName] = useState<string | null>(null)
  // Technische Kennung der Anmeldung - wird nie angezeigt.
  const [loginEmail, setLoginEmail] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  // Die letzte Wahl ist beim nächsten Mal vorausgewählt
  const [bleiben, setBleiben] = useState(angemeldetBleiben)

  function reset() {
    setStep('name')
    setPassword('')
    setRepeat('')
    setError(null)
  }

  /** Schritt 1: Namen in der Benutzertabelle suchen. */
  async function handleNameSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const check = await checkLoginName(name)
      if (!check.found || !check.login_email) {
        setError(
          'Dieser Name ist nicht hinterlegt. Bitte achte auf die genaue Schreibweise oder wende dich an die Koordination der Hospizinitiative Melle.',
        )
        return
      }
      if (!check.is_active) {
        setError('Dieser Zugang ist deaktiviert. Bitte wende dich an die Koordination.')
        return
      }
      setFullName(check.full_name)
      setLoginEmail(check.login_email)
      setStep(check.has_account ? 'password' : 'create-password')
    } catch (err) {
      setError(toGermanError(err))
    } finally {
      setBusy(false)
    }
  }

  /** Schritt 2a: Anmeldung mit vorhandenem Passwort. */
  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    if (!loginEmail) return
    setError(null)
    setBusy(true)
    try {
      // Muss vor dem Anmelden feststehen: danach wird die Sitzung gespeichert
      setzeAngemeldetBleiben(bleiben)

      await anmelden(loginEmail, password)
    } catch (err) {
      setError(toGermanError(err))
    } finally {
      setBusy(false)
    }
  }

  /** Schritt 2b: Erstanmeldung – eigenes Passwort vergeben. */
  async function handleCreatePassword(e: React.FormEvent) {
    e.preventDefault()
    if (!loginEmail) return
    setError(null)
    const problem = validatePassword(password, repeat)
    if (problem) {
      setError(problem)
      return
    }
    setBusy(true)
    try {
      setzeAngemeldetBleiben(bleiben)

      await passwortFestlegen(loginEmail, password)
    } catch (err) {
      setError(toGermanError(err))
    } finally {
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
            <p className="auth__sub">Anmeldung für Fahrer:innen und Koordination</p>
          </header>

        <p className="alert alert--warn">{DEMO_HINWEIS}</p>

        {step === 'name' && (
          <form onSubmit={handleNameSubmit} className="auth__form">
            <p className="auth__intro">
              Bitte gib deinen vollständigen Namen ein. Wir prüfen, ob du für die Rikscha-App
              freigeschaltet bist.
            </p>
            <label className="field" htmlFor="name">
              <span className="field__label">Vor- und Nachname</span>
              <div className="field__wrap">
                <input
                  id="name"
                  type="text"
                  value={name}
                  autoComplete="name"
                  autoCapitalize="words"
                  placeholder="z. B. Lenz Becker"
                  autoFocus
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </label>
            <button className="btn" type="submit" disabled={busy}>
              {busy ? 'Prüfe …' : 'Weiter'}
            </button>
          </form>
        )}

        {step === 'password' && (
          <form onSubmit={handleSignIn} className="auth__form">
            <p className="auth__intro">
              Willkommen zurück! Bitte gib dein Passwort ein.
            </p>
            <p className="auth__email">{fullName}</p>
            <PasswordField
              id="password"
              label="Passwort"
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
              autoFocus
            />
            <label className="check check--schlank" htmlFor="bleiben-anmelden">
              <input
                id="bleiben-anmelden"
                type="checkbox"
                checked={bleiben}
                onChange={(e) => setBleiben(e.target.checked)}
              />
              <span>
                <strong>Angemeldet bleiben</strong>
                <span className="check__hint">
                  Sonst endet die Anmeldung, sobald du den Browser schließt.
                </span>
              </span>
            </label>

            <button className="btn" type="submit" disabled={busy}>
              {busy ? 'Melde an …' : 'Anmelden'}
            </button>
            <button type="button" className="btn btn--link" onClick={reset}>
              Anderer Name
            </button>
          </form>
        )}

        {step === 'create-password' && (
          <form onSubmit={handleCreatePassword} className="auth__form">
            <p className="auth__intro">
              Hallo {fullName}! Das ist deine erste Anmeldung – bitte lege jetzt dein eigenes
              Passwort fest.
            </p>
            <PasswordField
              id="new-password"
              label="Neues Passwort"
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              autoFocus
            />
            <PasswordField
              id="repeat-password"
              label="Passwort wiederholen"
              value={repeat}
              onChange={setRepeat}
              autoComplete="new-password"
            />
            <p className="hint">Mindestens 8 Zeichen, mit mindestens einem Buchstaben und einer Zahl.</p>
            <label className="check check--schlank" htmlFor="bleiben-neu">
              <input
                id="bleiben-neu"
                type="checkbox"
                checked={bleiben}
                onChange={(e) => setBleiben(e.target.checked)}
              />
              <span>
                <strong>Angemeldet bleiben</strong>
                <span className="check__hint">
                  Sonst endet die Anmeldung, sobald du den Browser schließt.
                </span>
              </span>
            </label>

            <button className="btn" type="submit" disabled={busy}>
              {busy ? 'Speichere …' : 'Passwort festlegen und anmelden'}
            </button>
            <button type="button" className="btn btn--link" onClick={reset}>
              Zurück
            </button>
          </form>
        )}

          {error && <p className="alert alert--error">{error}</p>}
        </div>
      </div>
    </div>
  )
}
