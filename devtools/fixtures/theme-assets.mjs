// Non-pet art referenced by index/manifest/CSS. Artifact tests use byte stand-ins.
export const THEME_ASSET_FIXTURES = [
  'assets/brand/questnote-icon-32.png', 'assets/brand/questnote-icon-180.png',
  'assets/brand/questnote-icon-192.png', 'assets/brand/questnote-icon-512.png',
  'assets/brand/questnote-icon-maskable-512.png',
  'assets/scenes/night-graywolf.webp', 'assets/scenes/garden-graywolf.webp', 'assets/scenes/twilight-graywolf.webp',
  ...['mist_forest', 'lava_rift', 'machine_ruins', 'astral_rift', 'polar_shore', 'harvest_fields',
    'cloudrest_trail', 'lionheart_city'].map((id) => `assets/expeditions/${id}.webp`),
];
