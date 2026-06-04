export type BoxType = 'wood' | 'metal' | 'present' | 'tnt' | 'hover';

export interface Box {
  id: string;
  type: BoxType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  mass: number;
  onGround: boolean;
  grabbed: boolean;
  isOpened: boolean;
  fuseTimer: number | null; // TNT fuse remaining frames (null if not ignited)
  health: number; // For breakable wood crates
  angle: number; // Visual rotation angle
  angularVelocity: number; // Rotational velocity
  squishX: number; // Visual stretching factors (1.0 = normal)
  squishY: number; // Visual stretching factors (1.0 = normal)
  customColor?: string;
  sparkleTimer?: number;
}

export interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  facing: 'left' | 'right';
  onGround: boolean;
  grabbingBox: Box | null;
  state: 'idle' | 'walk' | 'jump' | 'grab_idle' | 'grab_walk';
  animFrame: number;
  animTimer: number;
}

export interface LootItem {
  id: string;
  type: 'gem_red' | 'gem_blue' | 'gem_green' | 'coin' | 'key' | 'crown';
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  angle: number;
  angularVelocity: number;
  onGround: boolean;
  bounceCount: number;
  shineTimer: number;
}

export interface Particle {
  id: string;
  type: 'wood_splinter' | 'smoke' | 'fire' | 'sparkle' | 'shockwave' | 'debris' | 'star';
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number; // 0 to 1
  decay: number;
  angle: number;
  angularVelocity: number;
  gravityAffect?: boolean;
}

export interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  life: number; // remaining frames
  maxLife: number;
}

export interface PhysicsWorld {
  gravity: number;
  friction: number;
  airResistance: number;
  width: number;
  height: number;
}
