import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildActivationEvents, type LoadedInstall } from './activations'
import { validateEventProperties } from '../../telemetry/events'

// Real uuids so the produced events validate against the skill_activated schema
// (skill_id: z.string().uuid()) — the same property shape the rollups read.
const ID = [
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
]

function install(id: string | null): LoadedInstall {
  return {
    skills: id
      ? { id, name: `skill-${id.slice(0, 4)}`, category: 'coding', skill_content: '...' }
      : null,
  }
}

test('N installed skills emit N skill_activated events, one per skill', () => {
  const loaded = [install(ID[0]), install(ID[1]), install(ID[2])]
  const { events, skipped } = buildActivationEvents(loaded)

  assert.equal(events.length, 3, 'one event per loaded skill')
  assert.equal(skipped, 0)
  assert.deepEqual(
    events.map((e) => e.properties.skill_id),
    ID,
    'each event carries its skill id, in order'
  )
  for (const e of events) {
    assert.equal(e.name, 'skill_activated')
    // The emitted properties must satisfy the canonical schema, i.e. exactly the
    // shape the working-window (June 22–24) rows had.
    assert.ok(
      validateEventProperties('skill_activated', e.properties).success,
      'event validates against EVENT_SCHEMAS.skill_activated'
    )
  }
})

test('a loaded skill with no id is counted as skipped, not silently dropped', () => {
  const loaded = [install(ID[0]), install(null), install(ID[1])]
  const { events, skipped } = buildActivationEvents(loaded)

  assert.equal(events.length, 2, 'only id-bearing skills emit')
  assert.equal(skipped, 1, 'the id-less skill is surfaced so the caller can log it')
  assert.deepEqual(events.map((e) => e.properties.skill_id), [ID[0], ID[1]])
})

test('no installed skills emit no events (nothing to activate)', () => {
  const { events, skipped } = buildActivationEvents([])
  assert.equal(events.length, 0)
  assert.equal(skipped, 0)
})
