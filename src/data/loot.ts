// Loot tables: weighted entries rolled per container from the run seed (DESIGN section 8 and 10).
export interface LootEntry { id: string; w: number; n?: [number, number] }
export interface LootTable { rolls: [number, number]; empty: number; items: LootEntry[] }

export const loot: Record<string, LootTable> = {
  // Ordinary homes and shops (tier 1).
  kitchen: { rolls: [0, 3], empty: 0.25, items: [
    { id: 'noodles', w: 6, n: [1, 3] }, { id: 'zhacai', w: 4 }, { id: 'luncheon', w: 2 }, { id: 'crackers', w: 3 },
    { id: 'water', w: 5 }, { id: 'bottle', w: 3 }, { id: 'buns', w: 2 }, { id: 'teaeggs', w: 2 }, { id: 'pork', w: 1 },
    { id: 'peaches', w: 2 }, { id: 'bread', w: 2 }, { id: 'sausage', w: 2 }, { id: 'knife', w: 1 }, { id: 'alcohol', w: 1 }, { id: 'tape', w: 1 },
  ] },
  bedroom: { rolls: [0, 2], empty: 0.3, items: [
    { id: 'hairpins', w: 4 }, { id: 'cloth', w: 4 }, { id: 'painkillers', w: 2 }, { id: 'bandage', w: 2 }, { id: 'phone', w: 1 },
    { id: 'chocolate', w: 2 }, { id: 'energy', w: 2 }, { id: 'headlamp', w: 1 }, { id: 'mylar', w: 1 },
  ] },
  shop: { rolls: [1, 3], empty: 0.15, items: [
    { id: 'noodles', w: 5, n: [1, 4] }, { id: 'water', w: 5, n: [1, 2] }, { id: 'energy', w: 3 }, { id: 'chocolate', w: 3 },
    { id: 'crackers', w: 3 }, { id: 'zhacai', w: 3 }, { id: 'firecrackers', w: 1 }, { id: 'tape', w: 2 }, { id: 'tablets', w: 1, n: [2, 5] },
  ] },
  workshop: { rolls: [1, 2], empty: 0.3, items: [
    { id: 'tape', w: 4 }, { id: 'rods', w: 3 }, { id: 'crowbar', w: 1 }, { id: 'clips', w: 2 }, { id: 'cable', w: 2 },
    { id: 'scootercells', w: 2 }, { id: 'gloves', w: 1 }, { id: 'rope', w: 1 }, { id: 'carabiner', w: 2, n: [1, 2] },
  ] },
  car: { rolls: [0, 2], empty: 0.35, items: [
    { id: 'water', w: 4 }, { id: 'crackers', w: 2 }, { id: 'firstaid', w: 1 }, { id: 'tape', w: 2 }, { id: 'cable', w: 2 },
    { id: 'extinguisher', w: 1 }, { id: 'energy', w: 2 }, { id: 'cloth', w: 2 },
  ] },
  medicine: { rolls: [1, 2], empty: 0.2, items: [
    { id: 'bandage', w: 5, n: [1, 3] }, { id: 'painkillers', w: 4, n: [1, 3] }, { id: 'alcohol', w: 3 }, { id: 'tablets', w: 2, n: [2, 6] },
    { id: 'tourniquet', w: 1 }, { id: 'mylar', w: 1 },
  ] },
};
