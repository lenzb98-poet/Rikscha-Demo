/// <reference types="vite/client" />

/**
 * Die Demo-Version braucht keine Umgebungsvariablen: Es gibt keinen Server
 * und keine Zugangsdaten. Die Beispieldaten stehen in src/lib/demoDaten.ts.
 */
interface ImportMetaEnv {
  /** Nur ein Platzhalter, damit die Typprüfung eine Form kennt. */
  readonly VITE_DEMO?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
