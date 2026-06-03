// A clean, professional "outfit stack": the garments composed top-to-bottom
// (jacket/top → bottom → shoes) with no gaps, like a lookbook. Optionally
// lists the items underneath. Uses the background-removed cut-out when
// available, else the original photo.

type MItem = {
  id?: number;
  category: string;
  name?: string;
  image_url: string | null;
  cutout_url?: string | null;
};

// Vertical order down the body, and a display height (px) per category.
const ORDER: Record<string, number> = {
  hat: 0, headwear: 0, outerwear: 1, top: 2, dress: 2, bottom: 3, shoes: 4, accessory: 5, bag: 5,
};
const HEIGHT: Record<string, number> = {
  hat: 38, headwear: 38, outerwear: 92, top: 88, dress: 148, bottom: 100, shoes: 60, accessory: 56, bag: 56,
};
const TOUCH = 6; // px pulled together so garments touch (no gap)
const PANEL_H = 320; // fixed height -> every outfit takes the same space

// Caps/hats are stored as "accessory" but belong at the very top of the stack.
const HEADWEAR = /\b(cap|hat|beanie|bucket)\b/i;
const rankOf = (it: MItem) => (HEADWEAR.test(it.name ?? "") ? -1 : ORDER[it.category] ?? 9);
const heightOf = (it: MItem) => (HEADWEAR.test(it.name ?? "") ? 42 : HEIGHT[it.category] ?? 88);

export default function OutfitStack({
  items,
  label,
  showList = true,
}: {
  items: MItem[];
  gender?: "men" | "women"; // kept for callers; not used visually
  label?: string;
  showList?: boolean;
}) {
  const visible = items
    .map((it) => ({ ...it, src: it.cutout_url || it.image_url }))
    .filter((it) => it.src)
    .sort((a, b) => rankOf(a) - rankOf(b));

  return (
    <div className="w-full max-w-[230px] mx-auto">
      {label && <p className="text-center text-sm font-semibold mb-2">{label}</p>}

      {/* The stacked garments — fixed height so all outfits are equal size */}
      <div
        className="rounded-2xl border border-border bg-gradient-to-b from-surface to-surface-2 px-4 flex flex-col items-center justify-center overflow-hidden"
        style={{ height: PANEL_H }}
      >
        {visible.length === 0 ? (
          <span className="text-xs text-muted">No items</span>
        ) : (
          visible.map((it, i) => {
            const prev = i > 0 ? visible[i - 1] : null;
            // A jacket should sit OVER the shirt/dress: overlap them a lot.
            const layered =
              prev &&
              prev.category === "outerwear" &&
              (it.category === "top" || it.category === "dress");
            const overlap = i === 0 ? 0 : layered ? Math.round(heightOf(it) * 0.5) : TOUCH;
            return (
              <div
                key={it.id ?? i}
                className="w-full flex justify-center"
                style={{
                  height: heightOf(it),
                  marginTop: -overlap,
                  // Upper garments paint in front, so the jacket sits ON TOP of the shirt.
                  zIndex: visible.length - i,
                }}
                title={it.name}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={it.src!}
                  alt={it.name ?? ""}
                  className="h-full w-auto max-w-full object-contain drop-shadow-[0_6px_10px_rgba(0,0,0,0.10)]"
                />
              </div>
            );
          })
        )}
      </div>

      {/* The item list */}
      {showList && visible.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {visible.map((it, i) => (
            <li key={it.id ?? i} className="flex items-center gap-2 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-accent/60 shrink-0" />
              <span className="font-medium truncate">{it.name ?? "Item"}</span>
              <span className="text-muted capitalize ml-auto shrink-0">{it.category}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
