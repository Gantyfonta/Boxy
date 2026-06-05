export interface CropType {
  id: string;
  name: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  cost: number;
  gemsCost: number;
  sellBase: number;
  sellBaseGems: number;
  growthTime: number; // in seconds
  color: string;
  spriteName: string;
}

export interface FarmPlantBed {
  id: number; // 0 to 8
  unlocked: boolean;
  cost: number;
  gemsCost: number;
  plantedCropId: string | null;
  growthProgress: number; // 0.0 to 1.0
  growthSecondsRemaining: number;
  size: 'small' | 'medium' | 'large' | 'gigantic' | 'cosmic' | null;
  mutation: 'none' | 'golden' | 'spicy' | 'radioactive' | 'albino' | 'double' | 'neon' | 'quantum' | 'crying' | 'magma' | 'gigantor' | 'aurora' | 'shadow' | null;
  plantedTimestamp: number | null;
}

export interface CropInventoryStack {
  cropId: string;
  size: 'small' | 'medium' | 'large' | 'gigantic' | 'cosmic';
  mutation: 'none' | 'golden' | 'spicy' | 'radioactive' | 'albino' | 'double' | 'neon' | 'quantum' | 'crying' | 'magma' | 'gigantor' | 'aurora' | 'shadow';
  count: number;
}

export const CROP_TYPES: CropType[] = [
  { id: 'wheat', name: 'Grain of Wheat 🌾', rarity: 'common', cost: 5, gemsCost: 0, sellBase: 12, sellBaseGems: 0, growthTime: 10, color: '#ffcd75', spriteName: 'crop_wheat' },
  { id: 'potatoes', name: 'Plump Potato 🥔', rarity: 'common', cost: 10, gemsCost: 0, sellBase: 25, sellBaseGems: 0, growthTime: 20, color: '#df9c5c', spriteName: 'crop_potatoes' },
  { id: 'basil', name: 'Scented Basil 🌿', rarity: 'common', cost: 15, gemsCost: 0, sellBase: 40, sellBaseGems: 0, growthTime: 30, color: '#73ef7d', spriteName: 'crop_basil' },
  { id: 'tomatoes', name: 'Sun Tomato 🍅', rarity: 'rare', cost: 30, gemsCost: 0, sellBase: 85, sellBaseGems: 0, growthTime: 50, color: '#ef7d57', spriteName: 'crop_tomatoes' },
  { id: 'mangoes', name: 'Sweet Mango 🥭', rarity: 'rare', cost: 60, gemsCost: 0, sellBase: 180, sellBaseGems: 0, growthTime: 90, color: '#df9c5c', spriteName: 'crop_mangoes' },
  { id: 'bananas', name: 'Bright Banana 🍌', rarity: 'rare', cost: 100, gemsCost: 0, sellBase: 310, sellBaseGems: 0, growthTime: 140, color: '#ffe385', spriteName: 'crop_bananas' },
  { id: 'coconuts', name: 'Wild Coconut 🥥', rarity: 'epic', cost: 180, gemsCost: 1, sellBase: 500, sellBaseGems: 2, growthTime: 220, color: '#9fadbc', spriteName: 'crop_coconuts' },
  { id: 'gouda', name: 'Stalk of Gouda 🧀', rarity: 'epic', cost: 250, gemsCost: 2, sellBase: 720, sellBaseGems: 3, growthTime: 320, color: '#ffe385', spriteName: 'crop_gouda' },
  { id: 'melon', name: 'Cosmic Melon 🍈', rarity: 'legendary', cost: 400, gemsCost: 3, sellBase: 1200, sellBaseGems: 6, growthTime: 500, color: '#36e5f0', spriteName: 'crop_melon' },
  { id: 'golden_ravioli', name: 'Golden Ravioli 🥟', rarity: 'legendary', cost: 800, gemsCost: 5, sellBase: 2600, sellBaseGems: 12, growthTime: 800, color: '#ffcd75', spriteName: 'crop_golden_ravioli' },
];

export const CROP_SIZES = [
  { id: 'small', label: 'Small', mult: 0.8 },
  { id: 'medium', label: 'Medium', mult: 1.0 },
  { id: 'large', label: 'Large', mult: 1.4 },
  { id: 'gigantic', label: 'Gigantic', mult: 2.2 },
  { id: 'cosmic', label: 'Cosmic', mult: 4.0 },
] as const;

export const CROP_MUTATIONS = [
  { id: 'none', label: 'Normal', mult: 1.0, tint: '', color: '#ffffff' },
  { id: 'golden', label: 'Golden ✨', mult: 2.5, tint: 'rgba(255, 215, 0, 0.45)', color: '#ffd700' },
  { id: 'spicy', label: 'Spicy 🌶️', mult: 1.6, tint: 'rgba(255, 69, 0, 0.45)', color: '#ff4500' },
  { id: 'radioactive', label: 'Radioactive ☢️', mult: 2.0, tint: 'rgba(50, 205, 50, 0.45)', color: '#32cd32' },
  { id: 'albino', label: 'Albino 👻', mult: 1.5, tint: 'rgba(245, 245, 245, 0.6)', color: '#f5f5f5' },
  { id: 'double', label: 'Twin Double 👥', mult: 1.8, tint: 'rgba(238, 130, 238, 0.35)', color: '#ee82ee' },
  { id: 'neon', label: 'Cyber Neon 🛜', mult: 3.0, tint: 'rgba(0, 255, 255, 0.55)', color: '#00ffff' },
  { id: 'quantum', label: 'Quantum Glitched 🌀', mult: 5.0, tint: 'rgba(255, 0, 128, 0.45)', color: '#ff0080' },
  { id: 'crying', label: 'Crying Sadness💧', mult: 1.2, tint: 'rgba(30, 144, 255, 0.4)', color: '#1e90ff' },
  { id: 'magma', label: 'Volcanic Magma 🔥', mult: 2.2, tint: 'rgba(255, 69, 0, 0.6)', color: '#ff4500' },
  { id: 'gigantor', label: 'Colossal Gigantor 🪐', mult: 3.5, tint: 'rgba(230, 230, 250, 0.5)', color: '#e6e6fa' },
  { id: 'aurora', label: 'Celestial Aurora 🌌', mult: 4.5, tint: 'rgba(123, 104, 238, 0.5)', color: '#7b68ee' },
  { id: 'shadow', label: 'Eldritch Void 👁️‍e', mult: 6.0, tint: 'rgba(75, 0, 130, 0.65)', color: '#4b0082' },
] as const;

export function getCropSellValue(
  cropId: string,
  size: 'small' | 'medium' | 'large' | 'gigantic' | 'cosmic',
  mutation: 'none' | 'golden' | 'spicy' | 'radioactive' | 'albino' | 'double' | 'neon' | 'quantum' | 'crying' | 'magma' | 'gigantor' | 'aurora' | 'shadow'
): { coins: number; gems: number } {
  const crop = CROP_TYPES.find((c) => c.id === cropId);
  if (!crop) return { coins: 0, gems: 0 };

  const sConf = CROP_SIZES.find((s) => s.id === size);
  const mConf = CROP_MUTATIONS.find((m) => m.id === mutation);

  const sMult = sConf ? sConf.mult : 1.0;
  const mMult = mConf ? mConf.mult : 1.0;

  let baseCoins = crop.sellBase;
  let baseGems = crop.sellBaseGems;

  let extraGems = 0;
  if (mutation === 'golden') extraGems = 2;
  else if (mutation === 'radioactive') extraGems = 1;
  else if (mutation === 'quantum') extraGems = 5;
  else if (mutation === 'neon') extraGems = 3;
  else if (mutation === 'aurora') extraGems = 8;
  else if (mutation === 'shadow') { baseGems += 3; extraGems = 12; }

  return {
    coins: Math.round(baseCoins * sMult * mMult),
    gems: Math.round(baseGems * sMult) + extraGems,
  };
}

export function generateDePorcusStock(): { [cropId: string]: number } {
  const stock: { [cropId: string]: number } = {};
  for (const crop of CROP_TYPES) {
    let amt = 0;
    const roll = Math.random();
    if (crop.rarity === 'common') {
      amt = Math.floor(Math.random() * 4) + 4; // 4 to 7
    } else if (crop.rarity === 'rare') {
      amt = roll < 0.85 ? Math.floor(Math.random() * 3) + 1 : 0; // 0 to 3
    } else if (crop.rarity === 'epic') {
      amt = roll < 0.45 ? Math.floor(Math.random() * 2) + 1 : 0; // 0 to 2
    } else if (crop.rarity === 'legendary') {
      amt = roll < 0.15 ? 1 : 0; // 0 to 1
    }
    stock[crop.id] = amt;
  }
  return stock;
}

export const getFarmingBedsLayout = (): FarmPlantBed[] => [
  // Layer 2 (Top, Y=110): Bed 0 (X=140), Bed 1 (X=220), Bed 2 (X=460)
  { id: 0, unlocked: false, cost: 500, gemsCost: 0, plantedCropId: null, growthProgress: 0, growthSecondsRemaining: 0, size: null, mutation: null, plantedTimestamp: null },
  { id: 1, unlocked: false, cost: 750, gemsCost: 2, plantedCropId: null, growthProgress: 0, growthSecondsRemaining: 0, size: null, mutation: null, plantedTimestamp: null },
  { id: 2, unlocked: false, cost: 1000, gemsCost: 4, plantedCropId: null, growthProgress: 0, growthSecondsRemaining: 0, size: null, mutation: null, plantedTimestamp: null },

  // Layer 1 (Middle, Y=220): Bed 3 (X=140), Bed 4 (X=460), Bed 5 (X=540)
  { id: 3, unlocked: false, cost: 200, gemsCost: 0, plantedCropId: null, growthProgress: 0, growthSecondsRemaining: 0, size: null, mutation: null, plantedTimestamp: null },
  { id: 4, unlocked: false, cost: 300, gemsCost: 0, plantedCropId: null, growthProgress: 0, growthSecondsRemaining: 0, size: null, mutation: null, plantedTimestamp: null },
  { id: 5, unlocked: false, cost: 400, gemsCost: 1, plantedCropId: null, growthProgress: 0, growthSecondsRemaining: 0, size: null, mutation: null, plantedTimestamp: null },

  // Layer 0 (Bottom, Y=328): Bed 6 (X=140), Bed 7 (X=220), Bed 8 (X=460)
  { id: 6, unlocked: true, cost: 0, gemsCost: 0, plantedCropId: null, growthProgress: 0, growthSecondsRemaining: 0, size: null, mutation: null, plantedTimestamp: null },
  { id: 7, unlocked: false, cost: 50, gemsCost: 0, plantedCropId: null, growthProgress: 0, growthSecondsRemaining: 0, size: null, mutation: null, plantedTimestamp: null },
  { id: 8, unlocked: false, cost: 100, gemsCost: 0, plantedCropId: null, growthProgress: 0, growthSecondsRemaining: 0, size: null, mutation: null, plantedTimestamp: null },
];
