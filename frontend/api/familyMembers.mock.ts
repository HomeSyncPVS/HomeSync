// Mock API for Family Members (Resident Module)
// TODO: Replace with real endpoints when available on the backend

export interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
  age: number;
  contact: string;
}

let mockFamilyMembers: FamilyMember[] = [
  { id: '1', name: 'Emma Watson', relationship: 'Spouse', age: 34, contact: '+1 (555) 019-2834' },
  { id: '2', name: 'Leo Watson', relationship: 'Son', age: 8, contact: '' },
];

export const familyMembersApi = {
  list: async (): Promise<FamilyMember[]> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve([...mockFamilyMembers]), 500);
    });
  },

  create: async (member: Omit<FamilyMember, 'id'>): Promise<FamilyMember> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newMember = { ...member, id: Math.random().toString(36).substring(2, 9) };
        mockFamilyMembers.push(newMember);
        resolve(newMember);
      }, 500);
    });
  },

  update: async (id: string, updated: Partial<FamilyMember>): Promise<FamilyMember> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const index = mockFamilyMembers.findIndex((m) => m.id === id);
        if (index === -1) {
          reject(new Error('Family member not found'));
          return;
        }
        mockFamilyMembers[index] = { ...mockFamilyMembers[index], ...updated };
        resolve(mockFamilyMembers[index]);
      }, 500);
    });
  },

  delete: async (id: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        mockFamilyMembers = mockFamilyMembers.filter((m) => m.id !== id);
        resolve(true);
      }, 500);
    });
  },
};
