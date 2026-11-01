import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { en } from '@payloadcms/translations/languages/en'
import { nb } from '@payloadcms/translations/languages/nb'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { People } from './collections/People'
import { Locations } from './collections/Locations'
import { Units } from './collections/Units'
import { health } from './endpoints/health'
import { serverURL, webURL } from './urls'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  serverURL,
  cors: [webURL],
  csrf: [webURL],
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    components: {
      afterLogin: ['/components/ProviderLoginButtons#ProviderLoginButtons'],
    },
  },
  // The admin panel uses the language a user picked under Account. Otherwise
  // it takes the first language in the browser's Accept-Language that Payload
  // has translations for, and falls back to Norwegian if that isn't nb or en.
  i18n: {
    supportedLanguages: { nb, en },
    fallbackLanguage: 'nb',
  },
  collections: [Users, Media, People, Locations, Units],
  endpoints: [health],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
  }),
  sharp,
  plugins: [],
})
