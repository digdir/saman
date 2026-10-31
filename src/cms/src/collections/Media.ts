import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'medier',
  dbName: 'media',
  labels: {
    singular: 'Media',
    plural: 'Medier',
  },
  typescript: {
    interface: 'Media',
  },
  // Media includes photos of employees (people.photo), so documents and files
  // are only for signed-in users.
  access: {
    read: ({ req }) => Boolean(req.user),
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
