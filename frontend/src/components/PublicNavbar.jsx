import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { IconLogo } from "./Icons.jsx";

export default function PublicNavbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`public-navbar${scrolled ? " scrolled" : ""}`}>
      <div className="public-navbar-inner">
        <Link to="/" className="brand" aria-label="MediCare Home">
          <span className="brand-icon" aria-hidden="true"><IconLogo /></span>
          <span className="brand-text"><b>MediCare</b><span>AI Health Companion</span></span>
        </Link>
        <div className="public-nav-links">
          <NavLink to="/" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>Home</NavLink>
          <a href="/#features" className="nav-link">Features</a>
          <a href="/#how-it-works" className="nav-link">How it works</a>
        </div>
        <div className="public-nav-actions">
          <Link to="/signin" className="btn btn-secondary btn-sm">Sign In</Link>
          <Link to="/signup" className="btn btn-primary btn-sm">Get Started</Link>
        </div>
      </div>
    </header>
  );
}
