"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Sparkles, Trash2, Shirt, ArrowRight, Bookmark, Search } from "lucide-react";
import Sidebar from "../../components/Sidebar";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fetchWardrobe, type Clothing } from "@/lib/wardrobe";

type Outfit = {
  id: string;
  name: string;
  style: string;
  activity: string;
  items: Clothing[]; // pakaian yang masih ada di wardrobe
  createdAt: string;
};

// Baca kolom jsonb `items` -> daftar id pakaian.
function parseItemIds(items: unknown): string[] {
  if (!Array.isArray(items)) return [];

  return items.map((entry) => (entry && typeof entry === "object" ? (entry as { id?: unknown }).id : null)).filter((id): id is string => typeof id === "string");
}

export default function SavedOutfitsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [selectedStyle, setSelectedStyle] = useState("All");
  const [search, setSearch] = useState("");
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      const { data, error } = await supabase.auth.getUser();

      if (error) {
        console.error("Gagal mengambil data user:", error);
        return;
      }

      const user = data.user;

      const name = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.user_metadata?.username || user?.email?.split("@")[0] || null;

      setUserName(name);
    }

    loadUser();
  }, [supabase]);

  // Ambil saved outfits + wardrobe, lalu gabungkan berdasarkan id pakaian.
  useEffect(() => {
    async function loadOutfits() {
      try {
        const [wardrobe, savedResult] = await Promise.all([fetchWardrobe(supabase), supabase.from("saved_outfits").select("*").order("created_at", { ascending: false })]);

        if (savedResult.error) throw savedResult.error;

        const wardrobeMap = new Map(wardrobe.map((item) => [item.id, item]));

        setOutfits(
          (savedResult.data ?? []).map((row) => ({
            id: row.id,
            name: row.name,
            style: row.style,
            activity: row.activity,
            createdAt: row.created_at,
            // Pakaian yang sudah dihapus dari wardrobe otomatis tidak ditampilkan.
            items: parseItemIds(row.items)
              .map((id) => wardrobeMap.get(id))
              .filter((item): item is Clothing => Boolean(item)),
          })),
        );
      } catch (error) {
        console.error(error);
        setMessage("Saved outfits could not be loaded. Coba refresh halaman.");
      } finally {
        setReady(true);
      }
    }

    loadOutfits();
  }, [supabase]);

  async function deleteOutfit(id: string) {
    const confirmed = window.confirm("Hapus outfit ini dari koleksi kamu?");

    if (!confirmed) return;

    const { error } = await supabase.from("saved_outfits").delete().eq("id", id);

    if (error) {
      console.error(error);
      setMessage("Unable to update your saved collection.");
      return;
    }

    setOutfits((current) => current.filter((outfit) => outfit.id !== id));
    setMessage("Outfit removed from your collection.");
  }

  const styleOptions = ["All", ...Array.from(new Set(outfits.map((outfit) => outfit.style)))];

  const filteredOutfits = outfits.filter((outfit) => {
    const matchesStyle = selectedStyle === "All" || outfit.style === selectedStyle;

    const matchesSearch = `${outfit.name} ${outfit.activity} ${outfit.style}`.toLowerCase().includes(search.toLowerCase());

    return matchesStyle && matchesSearch;
  });

  return (
    <>
      <Sidebar />

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/ Saved Outfits</span>
          </div>

          <div className="topbar-right">
            <span className="date-label">YOUR PERSONAL STYLE SPACE</span>
            <button type="button" className="avatar" aria-label="Open profile" onClick={() => router.push("/account")}>
              {userName?.charAt(0).toUpperCase() || "U"}
            </button>{" "}
          </div>
        </header>

        <section className="page-heading">
          <div>
            <div className="eyebrow">YOUR STYLE JOURNAL</div>
            <h1>Saved Outfits.</h1>
            <p>Your favorite combinations, all in one place. Keep the looks you love and revisit them whenever you need inspiration.</p>
          </div>
        </section>

        <div className="saved-toolbar">
          <label className="saved-search">
            <Search size={17} />
            <input type="search" placeholder="Search your saved looks..." value={search} onChange={(event) => setSearch(event.target.value)} />
          </label>
        </div>

        <div className="saved-tabs">
          {styleOptions.map((style) => (
            <button key={style} className={`saved-tab ${selectedStyle === style ? "selected" : ""}`} onClick={() => setSelectedStyle(style)}>
              {style}
            </button>
          ))}
        </div>

        {message && (
          <p className="saved-message" role="status">
            {message}
          </p>
        )}

        {!ready ? (
          <div className="saved-empty">
            <p>Loading your saved outfits...</p>
          </div>
        ) : filteredOutfits.length === 0 ? (
          <div className="saved-empty">
            <div className="saved-empty-icon">{outfits.length === 0 ? <Bookmark size={30} /> : <Search size={30} />}</div>

            <h2>{outfits.length === 0 ? "Your style story starts here." : "No matching outfits found."}</h2>

            <p>{outfits.length === 0 ? "Generate a look from your wardrobe and save your favorites to see them here." : "Try another search or select a different style."}</p>

            {outfits.length === 0 && (
              <Link href="/outfits" className="primary-button">
                <Sparkles size={16} />
                Create your first outfit
                <ArrowRight size={15} />
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="saved-results">
              Showing <strong>{filteredOutfits.length}</strong> {filteredOutfits.length === 1 ? "look" : "looks"}
            </div>

            <div className="saved-grid">
              {filteredOutfits.map((outfit) => (
                <article className="saved-card" key={outfit.id}>
                  <div className="saved-card-header">
                    <span className="saved-style-badge">{outfit.style}</span>
                    <button className="saved-delete" onClick={() => deleteOutfit(outfit.id)} title="Remove saved outfit" aria-label={`Delete ${outfit.name}`}>
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="saved-items-preview">
                    {outfit.items.slice(0, 4).map((item) => (
                      <div className="saved-item-thumb" key={item.id}>
                        <img src={item.image} alt={item.name} />
                      </div>
                    ))}
                  </div>

                  <div className="saved-card-body">
                    <h2>{outfit.name}</h2>
                    <p>{outfit.activity}</p>

                    <div className="saved-item-count">
                      <Shirt size={14} />
                      {outfit.items.length} clothing {outfit.items.length === 1 ? "item" : "items"}
                    </div>

                    <div className="saved-card-items">
                      {outfit.items.map((item) => (
                        <span key={item.id}>{item.name}</span>
                      ))}
                    </div>

                    <Link href="/outfits" className="saved-recreate">
                      Generate another look <ArrowRight size={15} />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}

        <section className="generator-bottom">
          <div>
            <Sparkles size={18} />
            <div>
              <strong>Feeling like something new?</strong>
              <p>Discover another combination from your wardrobe.</p>
            </div>
          </div>

          <Link href="/outfits">
            Outfit Generator <ArrowRight size={15} />
          </Link>
        </section>
      </main>
    </>
  );
}