// Mock API for Vehicles (Resident Module)
// TODO: Replace with real endpoints when available on the backend

export interface Vehicle {
  id: string;
  type: 'Car' | 'Bike';
  registrationNumber: string;
  parkingSlot: string;
}

let mockVehicles: Vehicle[] = [
  { id: '1', type: 'Car', registrationNumber: 'MH-12-AB-1234', parkingSlot: 'P-102' },
  { id: '2', type: 'Bike', registrationNumber: 'MH-12-CD-5678', parkingSlot: 'P-102B' },
];

export const vehiclesApi = {
  list: async (): Promise<Vehicle[]> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve([...mockVehicles]), 500);
    });
  },

  create: async (vehicle: Omit<Vehicle, 'id'>): Promise<Vehicle> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newVehicle = { ...vehicle, id: Math.random().toString(36).substring(2, 9) };
        mockVehicles.push(newVehicle);
        resolve(newVehicle);
      }, 500);
    });
  },

  update: async (id: string, updated: Partial<Vehicle>): Promise<Vehicle> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const index = mockVehicles.findIndex((v) => v.id === id);
        if (index === -1) {
          reject(new Error('Vehicle not found'));
          return;
        }
        mockVehicles[index] = { ...mockVehicles[index], ...updated };
        resolve(mockVehicles[index]);
      }, 500);
    });
  },

  delete: async (id: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        mockVehicles = mockVehicles.filter((v) => v.id !== id);
        resolve(true);
      }, 500);
    });
  },
};
