/** VEX Play platform hooks (stub — Phase 3) */
export const vex = {
  name: 'vex',
  async preCheck(logger) {
    logger.info('VEX Play pre-check: stub (Phase 3)')
    return true
  },
  async postStop(logger) {
    logger.info('VEX Play post-stop: stub (Phase 3)')
  },
}
