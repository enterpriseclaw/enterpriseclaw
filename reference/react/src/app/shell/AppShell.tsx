import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { useAuth } from "@/app/providers/AuthProvider";
import { ConsentOverlay } from "../components/ConsentOverlay";

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { requiresSetup } = useAuth();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar setMobileOpen={setMobileOpen} />
        <main className="flex-1 overflow-y-auto bg-background">
          <div className="container mx-auto p-4 md:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
      {requiresSetup && <ConsentOverlay />}
    </div>
  );
}
