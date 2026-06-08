export interface FishType {
  id: string;
  name: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
  sellBase: number;
  sellBaseGems: number;
  behavior: {
    speed: number;          // Swim oscillation speed
    erraticness: number;    // Probability of sudden direction change (0-1)
    barWidth: number;       // How large is the fish hitbox itself (0-100)
  };
  color: string;
  description: string;
  iconChar: string;        // Emoji representing the fish
}

export interface FishInventoryStack {
  fishId: string;
  size: 'small' | 'medium' | 'large' | 'gigantic' | 'cosmic';
  mutation: 'none' | 'golden' | 'spicy' | 'radioactive' | 'albino' | 'double' | 'neon' | 'quantum' | 'crying' | 'magma' | 'gigantor' | 'aurora' | 'shadow';
  count: number;
}

export interface FishingRod {
  id: string;
  name: string;
  cost: number;
  gemsCost: number;
  barMultiplier: number;    // Multiplier for the catch bar width (easier catches)
  reelingMultiplier: number; // Multiplier for fill rate (faster catches)
  payoutMultiplier: number;  // Multiplier for coins from selling
  luckMultiplier: number;    // Golden factor luck booster!
  color: string;             // Theme color for bobber and pole
  description: string;
}

export const FISH_TYPES: FishType[] = [
  // Common Fish (5)
  { id: 'minnow', name: 'Sand Minnow', rarity: 'common', sellBase: 10, sellBaseGems: 0, behavior: { speed: 1.2, erraticness: 0.15, barWidth: 24 }, color: '#b5c0d0', description: 'A tiny, translucent river minnow that travels in sparkling schools.', iconChar: '🐟' },
  { id: 'goldfish', name: 'Bubble Goldfish', rarity: 'common', sellBase: 18, sellBaseGems: 0, behavior: { speed: 1.0, erraticness: 0.10, barWidth: 26 }, color: '#ffa257', description: 'A glistening goldfish with beautiful fanning diaphanous fins.', iconChar: '🐠' },
  { id: 'guppy', name: 'Cobalt Guppy', rarity: 'common', sellBase: 15, sellBaseGems: 0, behavior: { speed: 1.4, erraticness: 0.20, barWidth: 22 }, color: '#4da6ff', description: 'Small, agile, and flashing neon-blue underneath sunlit waves.', iconChar: '🐟' },
  { id: 'carp', name: 'Gravel Carp', rarity: 'common', sellBase: 25, sellBaseGems: 0, behavior: { speed: 0.8, erraticness: 0.08, barWidth: 28 }, color: '#a38f75', description: 'A hefty, bottom-feeding carp that feeds on mud and sunken roots.', iconChar: '🐟' },
  { id: 'herring', name: 'Silver Herring', rarity: 'common', sellBase: 30, sellBaseGems: 0, behavior: { speed: 1.6, erraticness: 0.18, barWidth: 25 }, color: '#dcedf5', description: 'An iridescent coastal fish with bright reflective silver scales.', iconChar: '🐟' },
  
  // Rare Fish (5)
  { id: 'bass', name: 'Bronze-back Bass', rarity: 'rare', sellBase: 55, sellBaseGems: 0, behavior: { speed: 1.8, erraticness: 0.35, barWidth: 20 }, color: '#97c98f', description: 'A powerful sports fish known for leaping clean out of water streams.', iconChar: '🐟' },
  { id: 'salmon', name: 'Sockeye Salmon', rarity: 'rare', sellBase: 70, sellBaseGems: 0, behavior: { speed: 2.0, erraticness: 0.25, barWidth: 22 }, color: '#ff6b6b', description: 'An athletic cold-water fish that swims furiously up rapid waterfalls.', iconChar: '🐟' },
  { id: 'catfish', name: 'Whisker Catfish', rarity: 'rare', sellBase: 85, sellBaseGems: 0, behavior: { speed: 1.3, erraticness: 0.12, barWidth: 25 }, color: '#778291', description: 'A nocturnal muddy wanderer with long, highly sensitive sensory barbs.', iconChar: '🐟' },
  { id: 'trout', name: 'Prism Rainbow Trout', rarity: 'rare', sellBase: 105, sellBaseGems: 1, behavior: { speed: 1.7, erraticness: 0.30, barWidth: 21 }, color: '#fca3ef', description: 'A visually striking trout carrying the entire rainbow spectrum on its sides.', iconChar: '🐟' },
  { id: 'tuna', name: 'Bluefin Titan Tuna', rarity: 'rare', sellBase: 140, sellBaseGems: 1, behavior: { speed: 2.2, erraticness: 0.28, barWidth: 19 }, color: '#4f729f', description: 'A torpedo-shaped high-speed cruiser engineered for deep open oceans.', iconChar: '🐟' },
  
  // Epic Fish (4)
  { id: 'clownfish', name: 'Anemone Clownfish', rarity: 'epic', sellBase: 210, sellBaseGems: 2, behavior: { speed: 2.4, erraticness: 0.50, barWidth: 16 }, color: '#ff8a3d', description: 'A bright orange comic fish living among protective stinging sea anemones.', iconChar: '🐠' },
  { id: 'pufferfish', name: 'Spiked Balloon Puffer', rarity: 'epic', sellBase: 260, sellBaseGems: 2, behavior: { speed: 1.5, erraticness: 0.40, barWidth: 18 }, color: '#e5ee44', description: 'Defensively inflates its spiked round body when feeling slightly threatened.', iconChar: '🐡' },
  { id: 'anglerfish', name: 'Abyssal Gazer Angler', rarity: 'epic', sellBase: 340, sellBaseGems: 3, behavior: { speed: 1.9, erraticness: 0.32, barWidth: 17 }, color: '#6a36f0', description: 'Uses a glowing bioluminescent lure to attract prey in total pitch black voids.', iconChar: '🐟' },
  { id: 'swordfish', name: 'Gladius Swordfish', rarity: 'epic', sellBase: 420, sellBaseGems: 4, behavior: { speed: 2.8, erraticness: 0.45, barWidth: 15 }, color: '#44dcee', description: 'Pierces through water at breakneck speeds with a sharp, lethal bill sword.', iconChar: '⚔️' },
  
  // Legendary / Mythic Fish (3)
  { id: 'shark', name: 'Golden Nebula Shark', rarity: 'legendary', sellBase: 800, sellBaseGems: 8, behavior: { speed: 3.2, erraticness: 0.60, barWidth: 12 }, color: '#ffe385', description: 'A celestial apex predator with starry cosmic patterns along its golden hide.', iconChar: '🦈' },
  { id: 'kraken_hatch', name: 'Kraken Hatchlim', rarity: 'legendary', sellBase: 1100, sellBaseGems: 12, behavior: { speed: 3.0, erraticness: 0.55, barWidth: 14 }, color: '#ff2567', description: 'A curious newborn deep-sea titan covered in glowing elder runes.', iconChar: '🐙' },
  { id: 'leviathan', name: 'Eldritch Leviathan', rarity: 'legendary', sellBase: 1700, sellBaseGems: 20, behavior: { speed: 3.5, erraticness: 0.70, barWidth: 10 }, color: '#3ddebd', description: 'A mythical leviathan scale-lord that ruled ancient volcanic marine valleys.', iconChar: '🐉' },
  { id: 'phoenix_fish', name: 'Solar Phoenix Fish', rarity: 'mythic', sellBase: 3500, sellBaseGems: 45, behavior: { speed: 4.2, erraticness: 0.80, barWidth: 8 }, color: '#ff3e11', description: 'Born from molten undersea hydrothermal vents, it burns with stellar solar flares.', iconChar: '🐦‍🔥' }
];

export const RODS_LIST: FishingRod[] = [
  {
    id: 'rod_wooden',
    name: 'Bamboo Recruit Rod 🎋',
    cost: 0,
    gemsCost: 0,
    barMultiplier: 1.0,
    reelingMultiplier: 1.0,
    payoutMultiplier: 1.0,
    luckMultiplier: 1.0,
    color: '#8d5b4c',
    description: 'A basic starter rod crafted from hollowed-out lobby bamboo.'
  },
  {
    id: 'rod_reinforced',
    name: 'Carbon-Mesh Harvester Rod 🎣',
    cost: 350,
    gemsCost: 2,
    barMultiplier: 1.25,
    reelingMultiplier: 1.15,
    payoutMultiplier: 1.25,
    luckMultiplier: 1.5,
    color: '#2f3e46',
    description: 'Weaved with high-tension carbon wires for sturdy reel control.'
  },
  {
    id: 'rod_golden',
    name: 'Executive Golden Rod ✨',
    cost: 750,
    gemsCost: 5,
    barMultiplier: 1.0,
    reelingMultiplier: 1.0,
    payoutMultiplier: 2.2,
    luckMultiplier: 1.25,
    color: '#ffd700',
    description: 'A luxurious solid gold rod. Earns double coins and extra gems!'
  },
  {
    id: 'rod_quantum',
    name: 'Quantum Cosmic Rod 🌀',
    cost: 1500,
    gemsCost: 15,
    barMultiplier: 1.6,
    reelingMultiplier: 1.4,
    payoutMultiplier: 1.5,
    luckMultiplier: 2.5,
    color: '#9b5de5',
    description: 'Utilizes quantum gravity anchors to automatically help lock-on to fish!'
  }
];

export const FISH_SIZES = [
  { id: 'small', label: 'Small', mult: 0.8 },
  { id: 'medium', label: 'Medium', mult: 1.0 },
  { id: 'large', label: 'Large', mult: 1.4 },
  { id: 'gigantic', label: 'Gigantic', mult: 2.2 },
  { id: 'cosmic', label: 'Cosmic', mult: 4.0 },
] as const;

export const FISH_MUTATIONS = [
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

export function getFishSellValue(
  fishId: string,
  size: 'small' | 'medium' | 'large' | 'gigantic' | 'cosmic',
  mutation: 'none' | 'golden' | 'spicy' | 'radioactive' | 'albino' | 'double' | 'neon' | 'quantum' | 'crying' | 'magma' | 'gigantor' | 'aurora' | 'shadow',
  rodPayoutMultiplier: number = 1.0
): { coins: number; gems: number } {
  const fish = FISH_TYPES.find((f) => f.id === fishId);
  if (!fish) return { coins: 0, gems: 0 };

  const sConf = FISH_SIZES.find((s) => s.id === size);
  const mConf = FISH_MUTATIONS.find((m) => m.id === mutation);

  const sMult = sConf ? sConf.mult : 1.0;
  const mMult = mConf ? mConf.mult : 1.0;

  let baseCoins = fish.sellBase;
  let baseGems = fish.sellBaseGems;

  let extraGems = 0;
  if (mutation === 'golden') extraGems = 2;
  else if (mutation === 'radioactive') extraGems = 1;
  else if (mutation === 'quantum') extraGems = 5;
  else if (mutation === 'neon') extraGems = 3;
  else if (mutation === 'aurora') extraGems = 8;
  else if (mutation === 'shadow') { baseGems += 3; extraGems = 12; }

  return {
    coins: Math.round(baseCoins * sMult * mMult * rodPayoutMultiplier),
    gems: Math.round(baseGems * sMult) + extraGems,
  };
}
