import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'brukere',
  dbName: 'users',
  labels: {
    singular: 'Bruker',
    plural: 'Brukere',
  },
  typescript: {
    interface: 'User',
  },
  admin: {
    useAsTitle: 'email',
  },
  auth: true,
  fields: [
    // Email added by default
    // Add more fields as needed
  ],
}
