// ============================================================================
// PATH OF FAITH — shared gameplay constants
// ============================================================================

export const LANES = [-2.3, 0, 2.3];
export const LANE_WIDTH = 2.3;

export const PLAYER_Z = 0;
export const CAMERA_Z = 8.6;
export const CAMERA_Y = 4.4;
export const CAMERA_LOOK_Y = 1.1;
export const CAMERA_LOOK_Z = -12;

export const SPAWN_Z = -240;     // where obstacles/collectibles spawn (far ahead)
export const RECYCLE_Z = 14;     // objects behind this z get recycled

export const GRAVITY = 32;
export const JUMP_VELOCITY = 10.6;
export const SLIDE_DURATION = 0.85;

export const BASE_SPEED = 11;    // meters / second
export const MAX_SPEED = 34;
export const SPEED_RAMP = 0.22;  // speed gained per meter (capped)

// Player hitbox (half extents), in meters.
export const PLAYER_HALF = { w: 0.42, h: 0.82, d: 0.4 };
export const PLAYER_SLIDE_HALF = { w: 0.42, h: 0.38, d: 0.55 };

export const COIN_VALUE = 10;
export const SCROLL_VALUE = 1;
export const FAITH_VALUE = 1;
export const STAR_VALUE = 1;

// Collision depth window (how far in z an obstacle overlaps the player).
export const HIT_Z = 1.15;
