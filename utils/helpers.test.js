import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { helpers } from '../index.js'

describe('helpers.lastDay', () => {
  it('should return the beginning of the last day of the current month', () => {
    const testCases = [
      { date: new Date('2025-03-01'), expected: new Date('2025-03-31T00:00:00.000Z') },
      { date: new Date('2025-11-30T07:00:00.0000000-05:00'), expected: new Date('2025-11-30T00:00:00.000Z') },
      { date: new Date('2025-12-31T23:59:59.999Z'), expected: new Date('2025-12-31T00:00:00.000Z') },
      { date: new Date('2025-02-28T12:59:10.0000000-05:00'), expected: new Date('2025-02-28T00:00:00.000Z') },
    ]
    testCases.forEach(({ date, expected }) => {
      assert.deepStrictEqual(helpers.lastDay(date), expected)
    })

    // Test invalid date separately
    const result = helpers.lastDay('not a date')
    assert.ok(result instanceof Date)
    assert.ok(!isNaN(result.getTime()))
  })
})

describe('helpers.requireEnv', () => {
  it('returns the value of a variable that is set', () => {
    assert.equal(helpers.requireEnv({ API_KEY: 'abc' }, 'API_KEY'), 'abc')
  })

  it('throws, naming the variable, when it is missing or empty', () => {
    for (const env of [{}, { API_KEY: undefined }, { API_KEY: '' }]) {
      assert.throws(() => helpers.requireEnv(env, 'API_KEY'), {
        message: 'Missing the API_KEY environment variable',
      })
    }
  })
})

describe('helpers.parseJsonSecret', () => {
  it('parses a secret holding a JSON object', () => {
    const config = { consumer_key: 'ck', token: 'ti', realm: '1234567_SB1' }
    assert.deepStrictEqual(helpers.parseJsonSecret({ CONFIG: JSON.stringify(config) }, 'CONFIG'), config)
  })

  it('throws, naming the variable, when it is missing or empty', () => {
    for (const env of [{}, { CONFIG: '' }]) {
      assert.throws(() => helpers.parseJsonSecret(env, 'CONFIG'), {
        message: 'Missing the CONFIG environment variable',
      })
    }
  })

  it('rejects invalid JSON without quoting the secret', () => {
    assert.throws(
      () => helpers.parseJsonSecret({ CONFIG: '{"token_secret": "do-not-log-me"' }, 'CONFIG'),
      (error) => {
        assert.ok(error instanceof Error)
        assert.equal(error.message, 'The CONFIG secret is not valid JSON')
        // Node prints an error's cause along with it, so the parser's error mustn't be attached either.
        assert.ok(!('cause' in error))
        return true
      },
    )
  })

  it('rejects JSON that is not an object', () => {
    for (const text of ['"text"', '42', 'true', 'null', '[]', '[{"token": "ti"}]']) {
      assert.throws(() => helpers.parseJsonSecret({ CONFIG: text }, 'CONFIG'), {
        name: 'TypeError',
        message: 'The CONFIG secret must be a JSON object',
      })
    }
  })
})
