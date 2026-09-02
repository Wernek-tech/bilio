// ponytail: frame id -> display name, matching Avatar.tsx's name-keyed switch. bilio identifies
// frames by id (e.g. "frame-melek-kanatlari"); Bolt's Avatar expects the Turkish display name.
// Only frames actually seen granted in bilio so far are mapped; unknown ids just render without a frame overlay.
const FRAME_NAMES: Record<string, string> = {
  'frame-melek-kanatlari': 'Melek Kanatları',
  'frame-altin': 'Altın Çerçeve',
  'frame-gumus': 'Gümüş Çerçeve',
  'frame-neon': 'Neon Çerçeve',
  'frame-alev': 'Alev Çerçevesi',
  'frame-buz': 'Buz Çerçevesi',
  'frame-cicek': 'Çiçek Çerçevesi',
  'frame-yildiz': 'Yıldız Çerçevesi',
};

export function frameNameFor(frameId: string | null | undefined): string {
  if (!frameId) return '';
  return FRAME_NAMES[frameId] || '';
}
