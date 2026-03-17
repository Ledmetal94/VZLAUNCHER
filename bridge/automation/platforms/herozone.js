/** HeroZone platform hooks (stub — Phase 3) */
export const herozone = {
  name: 'herozone',
  async preCheck(logger) {
    logger.info('HeroZone pre-check: stub (Phase 3)')
    return true
  },
  async postStop(logger) {
    logger.info('HeroZone post-stop: stub (Phase 3)')
  },
}
