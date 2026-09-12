export interface AuditParams {
  userId?: any;
  action?: string;
  entityType?: string;
  entityId?: any;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string;
}

export async function logAudit(_params?: AuditParams): Promise<void> {
  // Audit logging decommissioned
}
