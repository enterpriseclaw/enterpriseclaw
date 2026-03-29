import { useAuth } from "@/app/providers/AuthProvider";
import { config } from "@/lib/config";
import { logger } from "@/lib/logger";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const DEV_ACCOUNTS = [
  { email: "parent@askiep.com", label: "Parent" },
  { email: "advocate@askiep.com", label: "Advocate" },
  { email: "teacher@askiep.com", label: "Teacher" },
  { email: "admin@askiep.com", label: "Admin" },
];

export function RoleSwitcher() {
  const { user, login } = useAuth();

  if (!config.isDevelopment) return null;

  const handleRoleSwitch = async (email: string) => {
    if (email === user?.email) return;

    try {
      await login({ email, password: "Demo123" });
      logger.debug("Role switched via dev tool", { email });
    } catch (error) {
      logger.error("Role switch failed", { email, error });
    }
  };

  return (
    <Select value={user?.email || ""} onValueChange={handleRoleSwitch}>
      <SelectTrigger className="h-8 w-40 text-xs">
        <SelectValue placeholder="Switch role" />
      </SelectTrigger>
      <SelectContent>
        {DEV_ACCOUNTS.map((account) => (
          <SelectItem key={account.email} value={account.email}>
            {account.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
