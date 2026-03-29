import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import { config } from "@/lib/config";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { NAV_ITEMS } from "./navConfig";
import { cn } from "@/lib/utils";
import logo from "@/logo.png";

interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export function Sidebar({ mobileOpen, setMobileOpen }: SidebarProps) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return null;

  // Filter nav items based on user role
  const navItems = NAV_ITEMS.filter((item) => item.rolesAllowed.includes(user.role));

  const NavContent = () => (
    <nav className="flex-1 space-y-1 overflow-y-auto p-2">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;

        return (
          <Link
            key={item.key}
            to={item.path}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50"
            )}
          >
            <Icon className="h-5 w-5 flex-shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Mobile Sidebar (Sheet) */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 bg-sidebar p-0">
          <div className="flex h-full flex-col">
            <div className="p-4">
              <div className="flex items-center gap-2">
                <img src={logo} alt="" className="h-10 w-10 object-contain" />
                <span className="text-2xl font-bold" style={{ color: '#7FB89E' }}>AskIEP</span>
              </div>
            </div>
            <NavContent />
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col bg-sidebar">
        <div className="p-4">
          <div className="flex items-center gap-2">
            <img src={logo} alt="" className="h-10 w-10 object-contain" />
            <span className="text-2xl font-bold" style={{ color: '#7FB89E' }}>AskIEP</span>
          </div>
        </div>
        <NavContent />
      </aside>
    </>
  );
}
