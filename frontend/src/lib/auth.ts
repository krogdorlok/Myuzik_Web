export const getInitials = (name: string): string => {
  const parts = name.trim().split(" ");
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
};

export const getGenreImage = (genre: string): string => {
  return `/genre-images/${genre.toLowerCase()}.jpg`;
};
