// Mock API for Notices (Resident and Admin Notice Management)
// TODO: Replace with real endpoints when available on the backend

export interface Notice {
  id: string;
  title: string;
  body: string;
  date: string;
  status: 'Draft' | 'Published' | 'Archived';
  targetAudience: 'All Residents' | 'Wing A' | 'Wing B';
  author: string;
}

let mockNotices: Notice[] = [
  {
    id: '1',
    title: 'Water Supply Outage',
    body: 'Please note there will be a scheduled water supply outage on Friday, July 10th from 10:00 AM to 2:00 PM due to overhead tank maintenance. We regret the inconvenience caused.',
    date: '2026-07-08',
    status: 'Published',
    targetAudience: 'All Residents',
    author: 'Society Committee',
  },
  {
    id: '2',
    title: 'Elevator Maintenance Wing B',
    body: 'The passenger elevator in Wing B will be shut down for routine cable lubrication on Monday morning. Please use the service lift during this period.',
    date: '2026-07-07',
    status: 'Published',
    targetAudience: 'Wing B',
    author: 'Society Committee',
  },
  {
    id: '3',
    title: 'Annual General Meeting Agenda',
    body: 'Draft notice containing points for the upcoming AGM discussion. Please prepare your suggestions.',
    date: '2026-07-05',
    status: 'Draft',
    targetAudience: 'All Residents',
    author: 'Secretary',
  },
];

export const noticesApi = {
  list: async (role: 'Resident' | 'Admin'): Promise<Notice[]> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (role === 'Resident') {
          // Residents only see published notices
          resolve(mockNotices.filter((n) => n.status === 'Published'));
        } else {
          // Admins see all notices
          resolve([...mockNotices]);
        }
      }, 500);
    });
  },

  get: async (id: string): Promise<Notice> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const notice = mockNotices.find((n) => n.id === id);
        if (!notice) {
          reject(new Error('Notice not found'));
          return;
        }
        resolve({ ...notice });
      }, 500);
    });
  },

  create: async (notice: Omit<Notice, 'id' | 'date'>): Promise<Notice> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newNotice: Notice = {
          ...notice,
          id: Math.random().toString(36).substring(2, 9),
          date: new Date().toISOString().split('T')[0],
        };
        mockNotices.push(newNotice);
        resolve(newNotice);
      }, 500);
    });
  },

  update: async (id: string, updated: Partial<Notice>): Promise<Notice> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const index = mockNotices.findIndex((n) => n.id === id);
        if (index === -1) {
          reject(new Error('Notice not found'));
          return;
        }
        mockNotices[index] = { ...mockNotices[index], ...updated };
        resolve(mockNotices[index]);
      }, 500);
    });
  },

  delete: async (id: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        mockNotices = mockNotices.filter((n) => n.id !== id);
        resolve(true);
      }, 500);
    });
  },
};
