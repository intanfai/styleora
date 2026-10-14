"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Shirt,
  Sparkles,
  Heart,
  Settings,
  Plus,
  Leaf,
} from "lucide-react";

const menuItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "My Wardrobe", href: "/wardrobe", icon: Shirt },
  { label: "Outfit Generator", href: "/outfits", icon: Sparkles },
  { label: "Saved Outfits", href: "/saved-outfits", icon: Heart },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
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
            <Link
              key={href}
              href={href}
              className={`nav-link ${active ? "active" : ""}`}
            >
              <Icon size={19} strokeWidth={1.8} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-bottom">
        <div className="closet-tip">
          <div className="tip-icon"><Sparkles size={18} /></div>
          <strong>Style something new</strong>
          <p>Your next favorite outfit is already in your closet.</p>
          <Link href="/outfits" className="tip-button">
            Generate outfit <Plus size={15} />
          </Link>
        </div>

        <div className="profile">
          <div className="avatar">S</div>
          <div className="profile-info">
            <strong>Styleora User</strong>
            <small>Personal wardrobe</small>
          </div>
          <Settings size={18} className="settings-icon" />
        </div>
      </div>
    </aside>
  );
}