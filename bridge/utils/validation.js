import { existsSync } from 'fs'
import { SUPPORTED_ACTIONS } from '../automation/actions/index.js'

const SUPPORTED_PROFILE_VERSIONS = [1, 2]

// Actions that require specific fields
const V2_CLICK_ACTIONS = new Set(['click', 'double_click', 'right_click'])
const V2_IMAGE_ACTIONS = new Set(['wait_for_image', 'verify'])

/**
 * Validate a game profile at startup
 * Returns array of warnings (non-fatal) and throws on fatal errors
 */
export function validateProfile(profile, logger) {
  const warnings = []
  const id = profile.game_id || profile.id || 'unknown'

  // Required fields
  if (!profile.game_id) {
    throw new Error(`Profile missing game_id`)
  }
  if (!profile.name) {
    throw new Error(`Profile ${id}: missing name`)
  }
  if (!profile.platform) {
    throw new Error(`Profile ${id}: missing platform`)
  }
  if (!profile.exePath) {
    throw new Error(`Profile ${id}: missing exePath`)
  }
  if (typeof profile.durationMinutes !== 'number' || profile.durationMinutes <= 0) {
    throw new Error(`Profile ${id}: durationMinutes must be a positive number`)
  }
  if (typeof profile.minPlayers !== 'number' || profile.minPlayers < 1) {
    throw new Error(`Profile ${id}: minPlayers must be a positive number`)
  }
  if (typeof profile.maxPlayers !== 'number' || profile.maxPlayers < profile.minPlayers) {
    throw new Error(`Profile ${id}: maxPlayers must be >= minPlayers`)
  }

  // Version check
  const version = profile.profile_version ?? 1
  if (!SUPPORTED_PROFILE_VERSIONS.includes(version)) {
    throw new Error(`Profile ${id}: unsupported profile_version ${version} (expected one of ${SUPPORTED_PROFILE_VERSIONS.join(', ')})`)
  }

  // exePath existence (warn, don't crash — may be on different PC)
  // Skip check for bare exe names (resolved via PATH by spawn)
  if (!profile.exePath.includes('/') && !profile.exePath.includes('\\')) {
    // Bare executable name like "notepad.exe" — trust PATH resolution
  } else if (!existsSync(profile.exePath)) {
    warnings.push(`exePath not found on this machine: ${profile.exePath}`)
  }

  // Validate sequences
  for (const seqName of ['pre_checks', 'launch_sequence', 'stop_sequence']) {
    const seq = profile[seqName]
    if (!seq) continue
    if (!Array.isArray(seq)) {
      throw new Error(`Profile ${id}: ${seqName} must be an array`)
    }

    for (let i = 0; i < seq.length; i++) {
      const step = seq[i]

      // String = action group reference (resolved at runtime from clicks.json)
      if (typeof step === 'string') {
        continue
      }

      if (!step.type) {
        throw new Error(`Profile ${id}: ${seqName}[${i}] missing type`)
      }
      if (!SUPPORTED_ACTIONS.includes(step.type)) {
        warnings.push(`${seqName}[${i}]: unknown action "${step.type}" (will be skipped)`)
      }

      // Common validations
      if (step.type === 'wait' && (typeof step.seconds !== 'number' || step.seconds <= 0)) {
        throw new Error(`Profile ${id}: ${seqName}[${i}] wait must have seconds as a number > 0`)
      }

      // v2 action validations
      if (V2_CLICK_ACTIONS.has(step.type)) {
        if (!step.image && (step.fallback_x == null || step.fallback_y == null)) {
          throw new Error(`Profile ${id}: ${seqName}[${i}] ${step.type} must have "image" or both "fallback_x" and "fallback_y"`)
        }
      }

      if (step.confidence !== undefined) {
        if (typeof step.confidence !== 'number' || step.confidence < 0 || step.confidence > 1) {
          throw new Error(`Profile ${id}: ${seqName}[${i}] confidence must be a number between 0.0 and 1.0`)
        }
      }

      if (step.timeout !== undefined) {
        if (typeof step.timeout !== 'number' || step.timeout <= 0) {
          throw new Error(`Profile ${id}: ${seqName}[${i}] timeout must be a positive number`)
        }
      }

      if (step.type === 'type' && !step.text) {
        throw new Error(`Profile ${id}: ${seqName}[${i}] type action must have "text" field`)
      }

      if (step.type === 'hotkey' && (!Array.isArray(step.keys) || step.keys.length === 0)) {
        throw new Error(`Profile ${id}: ${seqName}[${i}] hotkey action must have non-empty "keys" array`)
      }

      if (V2_IMAGE_ACTIONS.has(step.type) && !step.image) {
        throw new Error(`Profile ${id}: ${seqName}[${i}] ${step.type} must have "image" field`)
      }
    }
  }

  if (warnings.length > 0) {
    for (const w of warnings) {
      logger.warn({ gameId: id }, w)
    }
  }

  return { valid: true, warnings }
}

/**
 * Validate all profiles on startup
 */
export function validateAllProfiles(profiles, logger) {
  let valid = 0
  let invalid = 0

  for (const profile of profiles) {
    try {
      validateProfile(profile, logger)
      valid++
    } catch (err) {
      logger.error({ err: err.message }, `Profile validation failed`)
      invalid++
    }
  }

  logger.info({ valid, invalid, total: profiles.length }, 'Profile validation complete')
  return { valid, invalid }
}
