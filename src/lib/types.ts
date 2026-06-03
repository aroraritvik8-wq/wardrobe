// Shared "shapes" of our data, written once and reused everywhere.
// A "type" just describes what fields an object has, so the editor can
// warn us if we mistype a field name later.

export type Item = {
  id: number;
  name: string;
  category: string;
  colour: string;
  material: string;
  season: string;
  image_url: string | null;
  cutout_url?: string | null;
  mannequin_ok?: boolean | null;
  times_worn: number;
  created_at: string;
};

export type Outfit = {
  id: number;
  name: string;
  created_at: string;
  // When we load an outfit we also attach the items that belong to it.
  items?: Item[];
};
