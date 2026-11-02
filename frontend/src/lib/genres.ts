// Display names and generated cover art (CSS gradients) for the ten GTZAN genres.
const ART: Record<string, [string, string]> = {
  blues: ["#1d3a8a", "#0b1430"],
  classical: ["#8a6a30", "#2a2010"],
  country: ["#a0522d", "#2b1508"],
  disco: ["#c026d3", "#2e0a3a"],
  hiphop: ["#f59e0b", "#2e1c02"],
  jazz: ["#0f766e", "#05201e"],
  metal: ["#52525b", "#0a0a0a"],
  pop: ["#ec4899", "#330a1f"],
  reggae: ["#16a34a", "#06240f"],
  rock: ["#dc2626", "#2b0606"],
};

export const GENRES = Object.keys(ART);

export function genreLabel(genre: string): string {
  return genre === "hiphop" ? "Hip-hop" : genre.charAt(0).toUpperCase() + genre.slice(1);
}

export function genreArt(genre: string): string {
  const [from, to] = ART[genre] ?? ["#6a8a30", "#111111"];
  return `radial-gradient(120% 120% at 0% 0%, ${from} 0%, ${to} 60%, #0a0a0a 100%)`;
}

export function percent(x: number): string {
  return `${Math.round(x * 100)}%`;
}
