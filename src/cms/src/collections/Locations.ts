import type { CollectionConfig } from 'payload'

// Offices, imported from Digdir's authoritative source (NF-07). The import
// writes through the Local API, which bypasses access control, so nobody can
// change locations through the admin panel or the REST/GraphQL API.
export const Locations: CollectionConfig = {
  slug: 'locations',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'code', 'externalLocationId'],
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  defaultSort: 'name',
  fields: [
    {
      // The source's own ID for the location; the import matches on it.
      name: 'externalLocationId',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'code',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'people',
      type: 'join',
      collection: 'people',
      on: 'location',
    },
  ],
}
