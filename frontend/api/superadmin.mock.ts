// Mock API for Super Admin operations, Platform settings, and Audit Logs
// TODO: Replace with real endpoints when available on the backend

export interface PlatformStats {
  totalSocieties: number;
  totalResidents: number;
  totalRevenue: number;
  activeSubscriptions: number;
}

export interface SocietySubscription {
  societyId: string;
  name: string;
  plan: 'Basic' | 'Premium' | 'Enterprise';
  status: 'Active' | 'Expired' | 'Pending';
  renewalDate: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  entity: string;
}

export interface RolePermissions {
  role: string;
  permissions: { [key: string]: boolean };
}

let mockSubscriptions: SocietySubscription[] = [
  { societyId: 's1', name: 'Green Meadows', plan: 'Premium', status: 'Active', renewalDate: '2027-01-15' },
  { societyId: 's2', name: 'Royal Residency', plan: 'Basic', status: 'Active', renewalDate: '2026-12-10' },
  { societyId: 's3', name: 'Skyline Heights', plan: 'Enterprise', status: 'Active', renewalDate: '2027-06-01' },
];

let mockAuditLogs: AuditLog[] = [
  { id: '1', timestamp: '2026-07-08 14:32:10', actor: 'Super Admin', action: 'Approved Society subscription', entity: 'Green Meadows' },
  { id: '2', timestamp: '2026-07-08 11:15:02', actor: 'Admin (Green Meadows)', action: 'Approved Resident Profile', entity: 'John Watson' },
  { id: '3', timestamp: '2026-07-07 18:22:45', actor: 'Resident (Royal Residency)', action: 'Raised Maintenance Complaint', entity: 'Leakage in pipes' },
];

let mockPermissions: RolePermissions[] = [
  { role: 'Super Admin', permissions: { 'Manage Societies': true, 'Manage Payments': true, 'Configure Rules': true } },
  { role: 'Society Admin', permissions: { 'Manage Societies': false, 'Manage Payments': true, 'Configure Rules': true } },
  { role: 'Committee Member', permissions: { 'Manage Societies': false, 'Manage Payments': false, 'Configure Rules': true } },
  { role: 'Resident', permissions: { 'Manage Societies': false, 'Manage Payments': false, 'Configure Rules': false } },
];

export const superadminApi = {
  getStats: async (): Promise<PlatformStats> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          totalSocieties: 12,
          totalResidents: 450,
          totalRevenue: 245000,
          activeSubscriptions: 10,
        });
      }, 500);
    });
  },

  listSubscriptions: async (): Promise<SocietySubscription[]> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve([...mockSubscriptions]), 500);
    });
  },

  updateSubscription: async (societyId: string, updated: Partial<SocietySubscription>): Promise<SocietySubscription> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const index = mockSubscriptions.findIndex((s) => s.societyId === societyId);
        if (index === -1) {
          reject(new Error('Society not found'));
          return;
        }
        mockSubscriptions[index] = { ...mockSubscriptions[index], ...updated };
        resolve(mockSubscriptions[index]);
      }, 500);
    });
  },

  listAuditLogs: async (): Promise<AuditLog[]> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve([...mockAuditLogs]), 500);
    });
  },

  getPermissionsMatrix: async (): Promise<RolePermissions[]> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve([...mockPermissions]), 500);
    });
  },

  updatePermissions: async (role: string, permissionName: string, value: boolean): Promise<RolePermissions> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const index = mockPermissions.findIndex((p) => p.role === role);
        if (index === -1) {
          reject(new Error('Role not found'));
          return;
        }
        mockPermissions[index].permissions[permissionName] = value;
        resolve(mockPermissions[index]);
      }, 500);
    });
  },
};
