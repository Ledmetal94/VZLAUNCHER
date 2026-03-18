import { supabase } from './supabase'
import { logger } from './logger'
import type { Request } from 'express'

export interface AuditEvent {
  actorId?: string | null
  actorType: 'operator' | 'super_admin' | 'system'
  actorName?: string | null
  action: string
  targetType?: string
  targetId?: string
  targetName?: string
  details?: Record<string, unknown>
}

/** Log an audit event. Fire-and-forget — never throws. */
export async function logAudit(event: AuditEvent, req?: Request): Promise<void> {
  try {
    await supabase.from('audit_logs').insert({
      actor_id: event.actorId || null,
      actor_type: event.actorType,
      actor_name: event.actorName || null,
      action: event.action,
      target_type: event.targetType || null,
      target_id: event.targetId || null,
      target_name: event.targetName || null,
      details: event.details || null,
      ip_address: req?.ip || req?.headers['x-forwarded-for'] || null,
    })
  } catch (err) {
    logger.error({ err }, 'Failed to write audit log')
  }
}

/** Helper to extract actor info from request */
export function actorFromReq(req: Request): Pick<AuditEvent, 'actorId' | 'actorType' | 'actorName'> {
  const user = req.user
  if (!user) return { actorType: 'system' }
  return {
    actorId: user.sub,
    actorType: user.role === 'super_admin' ? 'super_admin' : 'operator',
    // sub is a UUID — callers should override actorName when they have the readable name
    actorName: user.sub,
  }
}
