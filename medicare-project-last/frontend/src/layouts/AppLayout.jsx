import { useState } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import Drawer from "../components/Drawer.jsx";
import ReminderModal from "../components/ReminderModal.jsx";

export default function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="app">
      <Navbar onOpenDrawer={() => setDrawerOpen(true)} />
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <main>
        <div className="container">
          <Outlet />
        </div>
      </main>
      <footer className="site-footer">
        <div className="container">MediCare © 2026 — AI-powered healthcare companion. Not a substitute for professional medical advice.</div>
      </footer>
      <ReminderModal />
    </div>
  );
}
