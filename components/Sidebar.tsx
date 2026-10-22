"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Shirt, Sparkles, Heart, Plus, Leaf, LogOut, UserRound, Settings2, ChevronUp, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const menuItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "My Wardrobe", href: "/wardrobe", icon: Shirt },
  { label: "Outfit Generator", href: "/outfits", icon: Sparkles },
  { label: "Saved Outfits", href: "/saved-outfits", icon: Heart },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const profileRef = useRef<HTMLDivElement>(null);

  const [email, setEmail] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();

    async function loadUser() {
      try {
        const { data, error } = await supabase.auth.getUser();

        if (!mounted) return;

        if (error) {
          console.error("Gagal mengambil data user:", error);
          setEmail(null);
          return;
        }

        setEmail(data.user?.email ?? null);
      } catch (error) {
        console.error("Error saat memuat user:", error);

        if (mounted) {
          setEmail(null);
        }
      }
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setEmail(session?.user?.email ?? null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);

        if (!loggingOut) {
          setShowLogoutConfirm(false);
        }
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [loggingOut]);

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Logout failed:", error.message);
        window.alert("Logout gagal. Silakan coba lagi.");
        return;
      }

      setShowLogoutConfirm(false);
      setMenuOpen(false);
      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
      window.alert("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <>
      <aside className="sidebar">
        <Link href="/" className="brand">
          <span className="brand-icon">
            <Leaf size={21} />
          </span>
          <span>
            <strong>styleora</strong>
            <small>YOUR PERSONAL STYLIST</small>
          </span>
        </Link>

        <div className="sidebar-label">MENU</div>

        <nav className="sidebar-nav">
          {menuItems.map(({ label, href, icon: Icon }) => {
            const active = pathname === href;

            return (
              <Link key={href} href={href} className={`nav-link ${active ? "active" : ""}`}>
                <Icon size={19} strokeWidth={1.8} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="closet-tip">
            <div className="tip-icon">
              <Sparkles size={18} />
            </div>
            <strong>Style something new</strong>
            <p>Your next favorite outfit is already in your closet.</p>
            <Link href="/outfits" className="tip-button">
              Generate outfit <Plus size={15} />
            </Link>
          </div>

          <div className="profile-wrapper" ref={profileRef}>
            {menuOpen && (
              <div className="profile-dropdown">
                <div className="dropdown-heading">
                  <span className="dropdown-avatar">{email ? email.charAt(0).toUpperCase() : "S"}</span>
                  <div className="dropdown-user">
                    <strong>{email ? email.split("@")[0] : "Styleora User"}</strong>
                    <small>{email ?? "Personal wardrobe"}</small>
                  </div>
                </div>

                <div className="dropdown-divider" />

                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    setMenuOpen(false);
                    router.push("/account");
                  }}
                >
                  <UserRound size={17} />
                  <span>My Account</span>
                </button>

                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    setMenuOpen(false);
                    router.push("/settings");
                  }}
                >
                  <Settings2 size={17} />
                  <span>Settings</span>
                </button>

                <div className="dropdown-divider" />

                <button
                  type="button"
                  className="dropdown-item logout-item"
                  onClick={() => {
                    setMenuOpen(false);
                    setShowLogoutConfirm(true);
                  }}
                  disabled={loggingOut}
                >
                  <LogOut size={17} />
                  <span>Logout</span>
                </button>
              </div>
            )}

            <button type="button" className={`profile-trigger ${menuOpen ? "profile-trigger-active" : ""}`} onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-haspopup="menu" aria-label="Open account menu">
              <span className="avatar">{email ? email.charAt(0).toUpperCase() : "S"}</span>

              <span className="profile-info">
                <strong>{email ? email.split("@")[0] : "Styleora User"}</strong>
                <small>{email ?? "Personal wardrobe"}</small>
              </span>

              <ChevronUp size={16} className={`profile-chevron ${menuOpen ? "" : "profile-chevron-closed"}`} />
            </button>
          </div>
        </div>
      </aside>

      {showLogoutConfirm && (
        <div
          className="logout-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !loggingOut) {
              setShowLogoutConfirm(false);
            }
          }}
        >
          <div className="logout-modal" role="dialog" aria-modal="true" aria-labelledby="logout-modal-title">
            <h2 id="logout-modal-title">Leaving Styleora?</h2>

            <p>Are you sure you want to log out of your account? You can always come back anytime.</p>

            <div className="logout-modal-actions">
              <button type="button" className="logout-cancel-button" disabled={loggingOut} onClick={() => setShowLogoutConfirm(false)}>
                Cancel
              </button>

              <button type="button" className="logout-confirm-button" disabled={loggingOut} onClick={handleLogout}>
                {loggingOut ? "Logging out..." : "Yes, log out"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
