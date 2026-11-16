"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Search, Shirt, Upload, X, Trash2, Sparkles, ImagePlus, PackageOpen, SlidersHorizontal, ArrowLeft } from "lucide-react";
import Sidebar from "../../components/Sidebar";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Clothing = {
  id: string;
  name: string;
  category: string;
  color: string;
  style: string;
  image: string; // URL untuk ditampilkan (signed URL / preview)
  image_path: string; // path file di Supabase Storage
};

const categories = ["All Items", "Tops", "Bottoms", "Outerwear", "Shoes", "Accessories"];

const clothingCategories = categories.filter((category) => category !== "All Items");

const colorOptions = ["Neutral", "Black", "White", "Brown", "Beige", "Grey", "Blue", "Green", "Pink", "Red", "Purple", "Yellow", "Multicolor"];

const styleOptions = ["Casual", "Formal", "Smart Casual", "Streetwear", "Minimalist", "Sporty", "Vintage"];

const sortOptions = [
  { value: "newest", label: "Recently added" },
  { value: "oldest", label: "Oldest first" },
  { value: "name", label: "Name A–Z" },
];

const initialForm = {
  name: "",
  category: "Tops",
  color: "Neutral",
  style: "Casual",
};

export default function WardrobePage() {
  const supabase = useMemo(() => createClient(), []);

  const [items, setItems] = useState<Clothing[]>([]);
  const [activeCategory, setActiveCategory] = useState("All Items");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [image, setImage] = useState("");
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [storageReady, setStorageReady] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const router = useRouter();
  const [userName, setUserName] = useState<string | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  const [filterColor, setFilterColor] = useState("All");
  const [filterStyle, setFilterStyle] = useState("All");
  const [sortBy, setSortBy] = useState("newest");
  const filterRef = useRef<HTMLDivElement>(null);

  // Tutup panel filter saat klik di luar.
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilter(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Ambil info user dari Supabase Auth.
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

  // Ambil data wardrobe dari database Supabase.
  useEffect(() => {
    async function loadItems() {
      const { data, error } = await supabase.from("wardrobe_items").select("*").order("created_at", { ascending: false });

      if (error) {
        console.error("Gagal memuat wardrobe:", error);
        setLoadError("Gagal memuat wardrobe. Coba refresh halaman.");
        setStorageReady(true);
        return;
      }

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

      setItems(
        rows.map((row) => ({
          id: row.id,
          name: row.name,
          category: row.category,
          color: row.color,
          style: row.style ?? "",
          image_path: row.image_path ?? "",
          image: urlMap[row.image_path] ?? "",
        })),
      );

      setLoadError("");
      setStorageReady(true);
    }

    loadItems();
  }, [supabase]);

  const filteredItems = items.filter((item) => {
    const query = search.toLowerCase();

    const matchesCategory = activeCategory === "All Items" || item.category === activeCategory;
    const matchesSearch = item.name.toLowerCase().includes(query) || item.color.toLowerCase().includes(query) || item.style.toLowerCase().includes(query);
    const matchesColor = filterColor === "All" || item.color === filterColor;
    const matchesStyle = filterStyle === "All" || item.style === filterStyle;

    return matchesCategory && matchesSearch && matchesColor && matchesStyle;
  });

  // Data dari database sudah urut terbaru (created_at desc), item baru ditambahkan di depan.
  const visibleItems = sortBy === "oldest" ? [...filteredItems].reverse() : sortBy === "name" ? [...filteredItems].sort((a, b) => a.name.localeCompare(b.name)) : filteredItems;

  const activeFilterCount = (filterColor !== "All" ? 1 : 0) + (filterStyle !== "All" ? 1 : 0);

  function resetFilters() {
    setSearch("");
    setActiveCategory("All Items");
    setFilterColor("All");
    setFilterStyle("All");
    setSortBy("newest");
  }

  function openModal() {
    setForm(initialForm);
    setImage("");
    setError("");
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setImage("");
    setError("");
  }

  async function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Pilih file gambar, ya.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Ukuran foto maksimal 10 MB.");
      return;
    }

    try {
      const compressedImage = await compressImage(file);
      setImage(compressedImage);
      setError("");
    } catch {
      setError("Foto gagal dibaca. Coba pilih gambar lain.");
    }

    event.target.value = "";
  }

  async function analyzeClothing() {
    if (!image) {
      setError("Upload foto pakaian terlebih dahulu.");
      return;
    }

    setIsAnalyzing(true);
    setError("");

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Analisis foto gagal.");
      }

      setForm((current) => ({
        ...current,
        name: data.name,
        category: data.category,
        color: data.color,
        style: data.style,
      }));
    } catch (error) {
      setError(error instanceof Error ? error.message : "Terjadi kesalahan saat menganalisis foto.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function addClothing(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!image) {
      setError("Upload foto pakaian terlebih dahulu.");
      return;
    }

    if (!form.name.trim()) {
      setError("Masukkan nama pakaian terlebih dahulu.");
      return;
    }

    setIsSaving(true);

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData.user) {
        throw new Error("Kamu harus login dulu.");
      }

      // Base64 -> Blob, baru di-upload ke Storage.
      const blob = await (await fetch(image)).blob();
      const path = `${userData.user.id}/${crypto.randomUUID()}.jpg`;

      const { error: uploadError } = await supabase.storage.from("wardrobe").upload(path, blob, { contentType: "image/jpeg" });

      if (uploadError) throw uploadError;

      const { data: row, error: insertError } = await supabase
        .from("wardrobe_items")
        .insert({
          name: form.name.trim(),
          category: form.category,
          color: form.color,
          style: form.style,
          image_path: path,
        })
        .select()
        .single();

      if (insertError) {
        // Rollback: hapus foto yang sudah ter-upload.
        await supabase.storage.from("wardrobe").remove([path]);
        throw insertError;
      }

      setItems((current) => [
        {
          id: row.id,
          name: row.name,
          category: row.category,
          color: row.color,
          style: row.style ?? "",
          image_path: path,
          image, // pakai preview yang sudah ada
        },
        ...current,
      ]);

      closeModal();
    } catch (e) {
      const message = (e as { message?: string })?.message;
      setError(message || "Gagal menyimpan pakaian. Coba lagi.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteClothing(item: Clothing) {
    const confirmed = window.confirm("Hapus pakaian ini dari koleksi kamu?");

    if (!confirmed) return;

    const { error } = await supabase.from("wardrobe_items").delete().eq("id", item.id);

    if (error) {
      console.error(error);
      window.alert("Gagal menghapus pakaian. Coba lagi.");
      return;
    }

    if (item.image_path) {
      await supabase.storage.from("wardrobe").remove([item.image_path]);
    }

    setItems((current) => current.filter((i) => i.id !== item.id));
  }

  return (
    <>
      <Sidebar />

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/ My Wardrobe</span>
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
            <div className="eyebrow">YOUR PERSONAL COLLECTION</div>
            <h1>My Wardrobe.</h1>
            <p>Every piece tells a story. Organize what you own and discover new ways to wear it.</p>
          </div>

          <button className="primary-button" onClick={openModal}>
            <Plus size={17} />
            Add clothing
          </button>
        </section>

        <section className="wardrobe-summary">
          <div className="wardrobe-summary-icon">
            <Shirt size={23} />
          </div>

          <div>
            <strong>{items.length} pieces in your wardrobe</strong>
            <p>{items.length === 0 ? "Start with a favorite piece from your closet." : "Your collection is ready to be styled."}</p>
          </div>

          <div className="wardrobe-summary-sparkle">
            <Sparkles size={22} />
          </div>
        </section>

        <section className="wardrobe-toolbar">
          <div className="wardrobe-search">
            <Search size={18} />

            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search your clothes..." aria-label="Search clothes" />

            {search && (
              <button className="icon-plain" onClick={() => setSearch("")} aria-label="Clear search">
                <X size={16} />
              </button>
            )}
          </div>

          <div className="filter-wrapper" ref={filterRef}>
            <button type="button" className={`filter-button ${showFilter || activeFilterCount > 0 ? "active" : ""}`} onClick={() => setShowFilter((open) => !open)} aria-expanded={showFilter} aria-haspopup="true">
              <SlidersHorizontal size={16} />
              <span>Filter</span>
              {activeFilterCount > 0 && <b className="filter-badge">{activeFilterCount}</b>}
            </button>

            {showFilter && (
              <div className="filter-panel">
                <div className="form-field">
                  <label htmlFor="filter-color">Color</label>
                  <select id="filter-color" value={filterColor} onChange={(event) => setFilterColor(event.target.value)}>
                    <option value="All">All colors</option>
                    {colorOptions.map((color) => (
                      <option key={color} value={color}>
                        {color}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="filter-style">Style</label>
                  <select id="filter-style" value={filterStyle} onChange={(event) => setFilterStyle(event.target.value)}>
                    <option value="All">All styles</option>
                    {styleOptions.map((style) => (
                      <option key={style} value={style}>
                        {style}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="filter-sort">Sort by</label>
                  <select id="filter-sort" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                    {sortOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="filter-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => {
                      setFilterColor("All");
                      setFilterStyle("All");
                      setSortBy("newest");
                    }}
                  >
                    Reset
                  </button>

                  <button type="button" className="primary-button" onClick={() => setShowFilter(false)}>
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        <nav className="category-tabs" aria-label="Clothing categories">
          {categories.map((category) => {
            const count = category === "All Items" ? items.length : items.filter((item) => item.category === category).length;

            return (
              <button key={category} className={`category-tab ${activeCategory === category ? "selected" : ""}`} onClick={() => setActiveCategory(category)}>
                {category}
                <span>{count}</span>
              </button>
            );
          })}
        </nav>

        {loadError && <p className="form-error">{loadError}</p>}

        <div className="wardrobe-results">
          <span>
            Showing <strong>{visibleItems.length}</strong> pieces
          </span>
          <span>{sortOptions.find((option) => option.value === sortBy)?.label}</span>
        </div>

        {!storageReady ? (
          <section className="wardrobe-empty">
            <p>Loading your wardrobe...</p>
          </section>
        ) : visibleItems.length > 0 ? (
          <section className="clothing-grid">
            {visibleItems.map((item) => (
              <article className="clothing-card" key={item.id}>
                <div className="clothing-image">
                  <img src={item.image} alt={item.name} />

                  <button className="delete-clothing" onClick={() => deleteClothing(item)} aria-label={`Delete ${item.name}`} title="Delete clothing">
                    <Trash2 size={16} />
                  </button>

                  <span className="clothing-category">{item.category}</span>
                </div>

                <div className="clothing-details">
                  <div>
                    <h3>{item.name}</h3>
                    <p>
                      {item.color} · {item.style}
                    </p>
                  </div>

                  <div className="clothing-color-dot" title={item.color} />
                </div>
              </article>
            ))}
          </section>
        ) : (
          <section className="wardrobe-empty">
            <div className="empty-icon">{search || activeCategory !== "All Items" ? <Search size={29} /> : <PackageOpen size={32} />}</div>

            <h2>{search || activeCategory !== "All Items" ? "No pieces found" : "Your wardrobe starts here"}</h2>

            <p>{search || activeCategory !== "All Items" ? "Try another search or choose a different category." : "Add your first clothing item and start building your digital wardrobe."}</p>

            {search || activeCategory !== "All Items" ? (
              <button className="primary-button" onClick={resetFilters}>
                Clear filters
              </button>
            ) : (
              <button className="primary-button" onClick={openModal}>
                <Plus size={17} />
                Add your first item
              </button>
            )}
          </section>
        )}

        <footer className="wardrobe-footer">
          <Sparkles size={15} />
          <span>Your wardrobe, your style. AI outfit recommendations are coming next.</span>
        </footer>
      </main>

      {showModal && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <section className="clothing-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className="modal-heading">
              <div>
                <div className="eyebrow">GROW YOUR COLLECTION</div>
                <h2 id="modal-title">Add a clothing piece</h2>
                <p>Save a piece you love to your digital wardrobe.</p>
              </div>

              <button className="circle-button" onClick={closeModal} aria-label="Close modal">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={addClothing}>
              <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageChange} hidden />

              <button type="button" className={`upload-zone ${image ? "has-image" : ""}`} onClick={() => fileInput.current?.click()}>
                {image ? (
                  <img src={image} alt="Clothing preview" />
                ) : (
                  <>
                    <div className="upload-icon">
                      <ImagePlus size={26} />
                    </div>

                    <strong>Upload clothing photo</strong>
                    <span>JPG, PNG or WebP · Max 10 MB</span>

                    <span className="upload-cta">
                      <Upload size={14} />
                      Choose image
                    </span>
                  </>
                )}
              </button>

              {image && (
                <>
                  <button type="button" className="change-image-button" onClick={() => fileInput.current?.click()}>
                    <ArrowLeft size={14} />
                    Change photo
                  </button>

                  <button type="button" className="primary-button" onClick={analyzeClothing} disabled={isAnalyzing}>
                    <Sparkles size={16} />
                    {isAnalyzing ? "Analyzing photo..." : "Analyze with AI"}
                  </button>
                </>
              )}

              <div className="form-field">
                <label htmlFor="clothing-name">Item name</label>
                <input id="clothing-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Cream knit sweater" maxLength={60} required />
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label htmlFor="clothing-category">Category</label>
                  <select
                    id="clothing-category"
                    value={form.category}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        category: event.target.value,
                      })
                    }
                  >
                    {clothingCategories.map((category) => (
                      <option key={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="clothing-color">Color</label>
                  <select
                    id="clothing-color"
                    value={form.color}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        color: event.target.value,
                      })
                    }
                  >
                    {colorOptions.map((color) => (
                      <option key={color}>{color}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="clothing-style">Style</label>
                <select
                  id="clothing-style"
                  value={form.style}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      style: event.target.value,
                    })
                  }
                >
                  {styleOptions.map((style) => (
                    <option key={style}>{style}</option>
                  ))}
                </select>
              </div>

              {error && <p className="form-error">{error}</p>}

              <button type="submit" className="primary-button submit-button" disabled={isSaving}>
                <Plus size={17} />
                {isSaving ? "Saving..." : "Save to wardrobe"}
              </button>
            </form>
          </section>
        </div>
      )}
    </>
  );
}

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error("Unable to read image"));

    reader.onload = () => {
      const source = new Image();

      source.onerror = () => reject(new Error("Invalid image"));

      source.onload = () => {
        const maxDimension = 900;

        const ratio = Math.min(1, maxDimension / Math.max(source.width, source.height));

        const canvas = document.createElement("canvas");

        canvas.width = Math.round(source.width * ratio);
        canvas.height = Math.round(source.height * ratio);

        const context = canvas.getContext("2d");

        if (!context) {
          reject(new Error("Canvas is unavailable"));
          return;
        }

        context.drawImage(source, 0, 0, canvas.width, canvas.height);

        resolve(canvas.toDataURL("image/jpeg", 0.75));
      };

      source.src = reader.result as string;
    };

    reader.readAsDataURL(file);
  });
}