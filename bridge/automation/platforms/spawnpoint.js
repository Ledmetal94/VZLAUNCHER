/** SpawnPoint platform hooks (stub — Phase 3) */
export const spawnpoint = {
  name: 'spawnpoint',
  async preCheck(logger) {
    logger.info('SpawnPoint pre-check: stub (Phase 3)')
    return true
  },
  async postStop(logger) {
    logger.info('SpawnPoint post-stop: stub (Phase 3)')
  },
}
