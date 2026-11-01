import type { CollectionConfig } from 'payload'

// Divisions, departments and sections, imported from their own file from
// Digdir's authoritative source (NF-07). The import writes through the Local
// API, which bypasses access control, so nobody can change units through the
// admin panel or the REST/GraphQL API. What a unit leader maintains in Saman
// (LO-03) will live elsewhere.
//
// The import matches units on externalUnitId. It stores the source's IDs for
// the parent unit and the leader as they come, and sets the `parent` and
// `leader` relationships from them once all units and people exist. An ID
// with no match leaves the relationship empty and keeps the raw ID.
export const Units: CollectionConfig = {
  slug: 'enheter',
  dbName: 'units',
  labels: {
    singular: 'Enhet',
    plural: 'Enheter',
  },
  typescript: {
    interface: 'Unit',
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'level', 'parent', 'leader', 'active'],
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
      // The source's own ID for the unit; the import matches on it.
      name: 'externalUnitId',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'name',
      type: 'text',
      required: true,
      index: true,
    },
    {
      // A short code such as «SSR». Not every unit has one.
      name: 'code',
      type: 'text',
    },
    {
      // The levels of the organisation chart (LO-01).
      name: 'level',
      type: 'select',
      required: true,
      options: [
        { label: 'Divisjon', value: 'division' },
        { label: 'Avdeling', value: 'department' },
        { label: 'Seksjon', value: 'section' },
      ],
    },
    {
      // The parent unit's externalUnitId, as it comes from the source. Empty
      // for the divisions at the top.
      name: 'externalParentId',
      type: 'text',
      index: true,
    },
    {
      // Set from externalParentId. A unit has at most one parent.
      name: 'parent',
      type: 'relationship',
      relationTo: 'enheter',
    },
    {
      // The leader's externalId in personer, as it comes from the source.
      name: 'externalLeaderId',
      type: 'text',
      index: true,
    },
    {
      // Enhetsleder (LO-02), set from externalLeaderId.
      name: 'leader',
      type: 'relationship',
      relationTo: 'personer',
    },
    {
      // False once the unit is closed. Kept rather than deleted, so what is
      // linked to it, such as teams and OKR, keeps its history.
      name: 'active',
      type: 'checkbox',
      required: true,
      defaultValue: true,
    },
    {
      // Sub-units (LO-02).
      name: 'children',
      type: 'join',
      collection: 'enheter',
      on: 'parent',
    },
    {
      // The people in the unit (LO-02).
      name: 'people',
      type: 'join',
      collection: 'personer',
      on: 'units',
    },
  ],
}
