// The fixed lists of choices used in the dropdown menus.
// Keeping them in one place means every form and filter stays consistent.

export const CATEGORIES = [
  "top",
  "bottom",
  "shoes",
  "outerwear",
  "dress",
  "accessory",
] as const;

export const SEASONS = ["spring", "summer", "autumn", "winter", "all"] as const;

// The storage bucket name in Supabase where photos are kept.
export const BUCKET = "wardrobe";
