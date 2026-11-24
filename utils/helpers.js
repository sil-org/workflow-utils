/**
 * Returns a Date object with the end_of_month.beginning_of_day from a Date Time
 * @param {Date | string} date
 * @return {Date}
 */
export function lastDay(date) {
  if (!(date instanceof Date && !isNaN(date.getTime()))) {
    return new Date()
  }

  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 0, 0, 0, 0))
}

/**
 * Normalize strings
 * @param {string | undefined} v
 * @returns {string}
 */
export function normalizeString(v) {
  return typeof v === 'string' ? v.trim() : ''
}

/**
 * Parse a secret holding a JSON object. The error never includes the parser's
 * message, which can quote part of the secret.
 *
 * @param {Record<string, string|undefined>} env
 * @param {string} name
 */
export const parseJsonSecret = (env, name) => {
  const text = requireEnv(env, name)
  let value
  try {
    value = JSON.parse(text)
  } catch {
    throw new Error(`The ${name} secret is not valid JSON`)
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`The ${name} secret must be a JSON object`)
  }
  return value
}

/**
 * @param {Record<string, string|undefined>} env
 * @param {string} name
 */
export const requireEnv = (env, name) => {
  const value = env[name]
  if (!value) {
    throw new Error(`Missing the ${name} environment variable`)
  }
  return value
}

/**
 * Check if string starts with a prefix
 * @param {string} val
 * @param {string} prefix
 * @returns {boolean}
 */
export function startsWith(val, prefix) {
  return typeof val === 'string' && val.toUpperCase().startsWith(prefix.toUpperCase())
}
