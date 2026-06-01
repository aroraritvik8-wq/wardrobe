// The "Add item" page at /add. It just shows the shared form in "add" mode.
import Link from "next/link";
import ItemForm from "@/components/ItemForm";

export default function AddItemPage() {
  return (
    <div>
      <Link href="/" className="text-sm text-muted hover:text-foreground transition">
        ← Back to wardrobe
      </Link>
      <h1 className="text-3xl font-bold tracking-tight mt-2 mb-6">Add an item</h1>
      <ItemForm />
    </div>
  );
}
