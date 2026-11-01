import type { CollectionConfig } from 'payload'

// Employees and contractors, imported from Digdir's authoritative source
// (NF-07). The import writes through the Local API, which bypasses access
// control, so nobody can change people through the admin panel or the
// REST/GraphQL API.
//
// The import matches people on externalId. It stores the source's IDs for
// the manager, the location and the units as they come, and sets the
// `manager`, `location` and `units` relationships from them once all people,
// locations and units exist. An ID with no match leaves the relationship
// empty and keeps the raw ID.
export const People: CollectionConfig = {
  slug: 'personer',
  dbName: 'people',
  labels: {
    singular: 'Person',
    plural: 'Personer',
  },
  typescript: {
    interface: 'Person',
  },
  admin: {
    useAsTitle: 'fullName',
    defaultColumns: ['fullName', 'title', 'units', 'location', 'isEmployee', 'active'],
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  defaultSort: ['lastName', 'firstName'],
  fields: [
    {
      name: 'firstName',
      type: 'text',
      required: true,
    },
    {
      name: 'lastName',
      type: 'text',
      required: true,
    },
    {
      // Stored rather than virtual, so it can be the title and be searched (FO-03).
      name: 'fullName',
      type: 'text',
      index: true,
      admin: {
        readOnly: true,
      },
      hooks: {
        beforeChange: [
          ({ siblingData }) =>
            [siblingData.firstName, siblingData.lastName].filter(Boolean).join(' '),
        ],
      },
    },
    {
      name: 'email',
      type: 'email',
      required: true,
      unique: true,
    },
    {
      // The formal job title, e.g. «Seniorrådgiver». Roles in a team, unit or
      // project belong to the membership, not to the person.
      name: 'title',
      type: 'text',
    },
    {
      name: 'employeeNumber',
      type: 'text',
    },
    {
      // The source's own ID for the person; the import matches on it.
      name: 'externalId',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      // The manager's externalId, as it comes from the source.
      name: 'externalManagerId',
      type: 'text',
      index: true,
    },
    {
      // Personalleder, set from externalManagerId.
      name: 'manager',
      type: 'relationship',
      relationTo: 'personer',
    },
    {
      // The location's externalLocationId, as it comes from the source.
      name: 'externalLocationId',
      type: 'text',
      required: true,
      index: true,
    },
    {
      // Set from externalLocationId.
      name: 'location',
      type: 'relationship',
      relationTo: 'lokasjoner',
    },
    {
      // The units' externalUnitIds, as they come from the source. A person can
      // belong to more than one unit (FO-02).
      name: 'externalUnitIds',
      type: 'text',
      hasMany: true,
    },
    {
      // Set from externalUnitIds.
      name: 'units',
      type: 'relationship',
      relationTo: 'enheter',
      hasMany: true,
    },
    {
      // Employee or contractor.
      name: 'isEmployee',
      type: 'checkbox',
      required: true,
      defaultValue: false,
    },
    {
      // False once the person no longer works in Digdir. Kept rather than
      // deleted, so their history in teams survives.
      name: 'active',
      type: 'checkbox',
      required: true,
      defaultValue: true,
    },
    {
      name: 'mobile',
      type: 'text',
    },
    {
      name: 'photo',
      type: 'upload',
      relationTo: 'medier',
    },
  ],
}
