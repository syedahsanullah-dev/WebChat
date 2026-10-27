export function formatAuditLogsCsv(records: any[]): string {
  const headers = [
    'Timestamp (UTC)',
    'Actor Username',
    'Actor Name',
    'Action',
    'Resource',
    'Entity ID',
    'IP Address',
    'Details',
  ];

  const escapeCsv = (val: any): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = records.map((r) => [
    escapeCsv(r.createdAt ? new Date(r.createdAt).toISOString() : ''),
    escapeCsv(r.user?.username ? `@${r.user.username}` : 'SYSTEM'),
    escapeCsv(r.user?.displayName || 'System'),
    escapeCsv(r.action || ''),
    escapeCsv(r.resource || ''),
    escapeCsv(r.entityId || ''),
    escapeCsv(r.ipAddress || ''),
    escapeCsv(r.metadata || ''),
  ]);

  return [headers.map((h) => `"${h}"`).join(','), ...rows.map((row) => row.join(','))].join('\r\n');
}
