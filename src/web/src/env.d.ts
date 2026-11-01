interface ImportMetaEnv {
  readonly PUBLIC_CMS_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare namespace App {
  interface Locals {
    /** Set by the middleware on every page except /logg-inn. */
    user?: import('@saman/shared').User
  }
}
