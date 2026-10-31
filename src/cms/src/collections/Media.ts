import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'medier',
  dbName: 'media',
  labels: {
    singular: 'Fil',
    plural: 'Filer',
  },
  typescript: {
    interface: 'Media',
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
  ],
  upload: {
    // Defaults to the slug; keep the folder that .gitignore already covers.
    staticDir: 'media',
  },
}
