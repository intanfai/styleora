import { createClient } from "@/lib/supabase/client";

export type Clothing = {
  id: string;
  name: string;
  category: string;
  color: string;
  style: string;
  image: string; // signed URL untuk ditampilkan
  image_path: string; // path di Supabase Storage
};

type SupabaseBrowserClient = ReturnType<typeof createClient>;

// Ambil seluruh pakaian milik user yang login (RLS memastikan hanya miliknya)
// lengkap dengan signed URL foto (berlaku 1 jam).
export async function fetchWardrobe(supabase: SupabaseBrowserClient): Promise<Clothing[]> {
  const { data, error } = await supabase.from("wardrobe_items").select("*").order("created_at", { ascending: false });

  if (error) throw error;

  const rows = data ?? [];
  const paths = rows.map((row) => row.image_path).filter(Boolean) as string[];
  const urlMap: Record<string, string> = {};

  if (paths.length > 0) {
    const { data: signed } = await supabase.storage.from("wardrobe").createSignedUrls(paths, 3600);

    signed?.forEach((entry) => {
      if (entry.path && entry.signedUrl) {
        urlMap[entry.path] = entry.signedUrl;
      }
    });
  }

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    color: row.color,
    style: row.style ?? "",
    image_path: row.image_path ?? "",
    image: urlMap[row.image_path] ?? "",
  }));
}