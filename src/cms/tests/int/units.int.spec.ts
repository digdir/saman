import { getPayload, Payload, type RequiredDataFromCollectionSlug } from 'payload'
import config from '@/payload.config'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { Location, Person, Unit, User } from '@/payload-types'

let payload: Payload
let user: User
let location: Location

// Prefix for every test row, so cleanup never touches other data.
const prefix = `int-units-${Date.now()}`

const unit = (n: number, extra: Partial<Unit> = {}) =>
  ({
    externalUnitId: `${prefix}-unit-${n}`,
    name: `Enhet ${n}`,
    level: 'division',
    ...extra,
  }) as RequiredDataFromCollectionSlug<'enheter'>

const person = (n: number, extra: Partial<Person> = {}) =>
  ({
    firstName: 'Kari',
    lastName: `Nordmann ${n}`,
    email: `${prefix}-${n}@example.com`,
    externalId: `${prefix}-person-${n}`,
    externalLocationId: location.externalLocationId,
    ...extra,
  }) as RequiredDataFromCollectionSlug<'personer'>

const ids = (docs: (number | { id: number })[] | undefined) =>
  (docs ?? []).map((d) => (typeof d === 'object' ? d.id : d))

describe('Units', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    user = await payload.create({
      collection: 'brukere',
      data: { email: `${prefix}@example.com`, password: 'test-password' },
    })
    location = await payload.create({
      collection: 'lokasjoner',
      data: { externalLocationId: `${prefix}-loc`, code: `${prefix}-LEI`, name: 'Leikanger' },
    })
  })

  afterAll(async () => {
    await payload.delete({ collection: 'personer', where: { externalId: { like: prefix } } })
    // Children before parents, so no unit is left pointing at a deleted one.
    for (const level of ['section', 'department', 'division'] as const) {
      await payload.delete({
        collection: 'enheter',
        where: { externalUnitId: { like: prefix }, level: { equals: level } },
      })
    }
    await payload.delete({ collection: 'lokasjoner', where: { externalLocationId: { like: prefix } } })
    await payload.delete({ collection: 'brukere', where: { email: { like: prefix } } })
  })

  it('marks new units as active by default', async () => {
    const created = await payload.create({ collection: 'enheter', data: unit(1) })
    expect(created.active).toBe(true)
  })

  it('NF-07: rejects a duplicate externalUnitId', async () => {
    await payload.create({ collection: 'enheter', data: unit(2) })
    await expect(
      payload.create({ collection: 'enheter', data: unit(3, { externalUnitId: `${prefix}-unit-2` }) }),
    ).rejects.toThrow()
  })

  it('LO-01: requires a known level', async () => {
    await expect(
      payload.create({ collection: 'enheter', data: unit(4, { level: undefined }) }),
    ).rejects.toThrow()
    await expect(
      payload.create({ collection: 'enheter', data: unit(5, { level: 'team' as Unit['level'] }) }),
    ).rejects.toThrow()
  })

  it('LO-01: builds the hierarchy from parents and lists each unit\'s sub-units', async () => {
    const division = await payload.create({ collection: 'enheter', data: unit(6) })
    const department = await payload.create({
      collection: 'enheter',
      data: unit(7, { level: 'department', externalParentId: division.externalUnitId, parent: division.id }),
    })
    const sections = await Promise.all(
      [8, 9].map((n) =>
        payload.create({
          collection: 'enheter',
          data: unit(n, { level: 'section', externalParentId: department.externalUnitId, parent: department.id }),
        }),
      ),
    )

    const read = await payload.findByID({ collection: 'enheter', id: department.id, depth: 1 })
    expect((read.parent as Unit).id).toBe(division.id)
    expect(ids(read.children?.docs as never).sort()).toEqual(sections.map((s) => s.id).sort())

    const top = await payload.findByID({ collection: 'enheter', id: division.id })
    expect(top.parent).toBeFalsy()
    expect(ids(top.children?.docs as never)).toEqual([department.id])
  })

  it('LO-02: links the leader and lists the people in a unit', async () => {
    const leader = await payload.create({ collection: 'personer', data: person(1) })
    const led = await payload.create({
      collection: 'enheter',
      data: unit(10, { externalLeaderId: leader.externalId, leader: leader.id }),
    })
    const member = await payload.create({
      collection: 'personer',
      data: person(2, { externalUnitIds: [led.externalUnitId], units: [led.id] }),
    })

    const read = await payload.findByID({ collection: 'enheter', id: led.id, depth: 1 })
    expect((read.leader as Person).id).toBe(leader.id)
    expect(ids(read.people?.docs as never)).toEqual([member.id])
  })

  it('FO-02: lets a person belong to more than one unit', async () => {
    const [a, b] = await Promise.all(
      [11, 12].map((n) => payload.create({ collection: 'enheter', data: unit(n) })),
    )
    const member = await payload.create({
      collection: 'personer',
      data: person(3, { externalUnitIds: [a!.externalUnitId, b!.externalUnitId], units: [a!.id, b!.id] }),
      depth: 1,
    })

    expect((member.units as Unit[]).map((u) => u.name).sort()).toEqual(['Enhet 11', 'Enhet 12'])
    for (const u of [a!, b!]) {
      const read = await payload.findByID({ collection: 'enheter', id: u.id })
      expect(ids(read.people?.docs as never)).toContain(member.id)
    }
  })

  it('NF-07: lets signed-in users read units, but not anonymous users', async () => {
    await payload.create({ collection: 'enheter', data: unit(13) })
    const where = { externalUnitId: { equals: `${prefix}-unit-13` } }

    const signedIn = await payload.find({ collection: 'enheter', where, overrideAccess: false, user })
    expect(signedIn.docs).toHaveLength(1)

    await expect(payload.find({ collection: 'enheter', where, overrideAccess: false })).rejects.toThrow()
  })

  it('NF-07: only the import can change units, not even an administrator', async () => {
    const admin = { ...user, roles: ['admin' as const] }
    const created = await payload.create({ collection: 'enheter', data: unit(14) })

    await expect(
      payload.create({ collection: 'enheter', data: unit(15), overrideAccess: false, user: admin }),
    ).rejects.toThrow()
    await expect(
      payload.update({
        collection: 'enheter',
        id: created.id,
        data: { name: 'Nytt navn' },
        overrideAccess: false,
        user: admin,
      }),
    ).rejects.toThrow()
    await expect(
      payload.delete({ collection: 'enheter', id: created.id, overrideAccess: false, user: admin }),
    ).rejects.toThrow()
  })
})
