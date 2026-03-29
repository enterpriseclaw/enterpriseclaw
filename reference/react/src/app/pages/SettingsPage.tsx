import { useState, useEffect } from "react";
import { useAuth } from "@/app/providers/AuthProvider";
import { useTheme } from "@/app/providers/ThemeProvider";
import { useNotification } from "@/hooks/useNotification";
import { getSettingsService } from "@/domain/settings/settings.service";
import type { UserPreferences } from "@/domain/settings/types";
import { PageHeader } from "@/app/ui/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { User, AlertTriangle, Bell, Mail, Sun, Moon, Monitor, Edit, Lock, Eye, EyeOff } from "lucide-react";
import { logger } from "@/lib/logger";
import { isPasswordValid, PASSWORD_POLICY_MESSAGE } from "@/lib/passwordPolicy";

export function SettingsPage() {
  const { user, accessToken, updateProfile, changePassword } = useAuth();
  const { theme, setTheme } = useTheme();
  const { showSuccess, showError } = useNotification();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isLoadingPrefs, setIsLoadingPrefs] = useState(true);

  // Profile edit state
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Password change state
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (!user || !accessToken) return;

    const loadPreferences = async () => {
      try {
        const service = getSettingsService();
        const prefs = await service.getPreferences(accessToken);
        setPreferences(prefs);
        logger.debug("User preferences loaded");
      } catch (error) {
        logger.error("Error loading preferences", { error });
      } finally {
        setIsLoadingPrefs(false);
      }
    };

    loadPreferences();
  }, [user]);

  const openEditProfile = () => {
    if (user) {
      setEditDisplayName(user.displayName);
      setEditEmail(user.email);
      setIsEditProfileOpen(true);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;

    setIsUpdatingProfile(true);
    try {
      const updates: { displayName?: string; email?: string } = {};
      
      if (editDisplayName !== user.displayName) {
        updates.displayName = editDisplayName;
      }
      
      if (editEmail !== user.email) {
        updates.email = editEmail;
      }

      if (Object.keys(updates).length === 0) {
        showError("No changes", "No changes were made to your profile");
        setIsEditProfileOpen(false);
        return;
      }

      await updateProfile(updates);
      setIsEditProfileOpen(false);
    } catch (error) {
      // Error is handled in AuthProvider
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      showError("Passwords don't match", "New password and confirmation must match");
      return;
    }

    if (!isPasswordValid(newPassword)) {
      showError('Weak password', PASSWORD_POLICY_MESSAGE);
      return;
    }

    setIsChangingPassword(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setIsChangePasswordOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      // Error is handled in AuthProvider
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleToggleNotifications = async () => {
    if (!user || !accessToken || !preferences) return;

    try {
      const service = getSettingsService();
      const updated = await service.updatePreferences(accessToken, {
        notifications: !preferences.notifications,
      });
      setPreferences(updated);
      showSuccess("Preferences Updated", "Notification settings have been saved");
      logger.info("Notifications toggled", { enabled: updated.notifications });
    } catch (error) {
      logger.error("Error updating preferences", { error });
    }
  };

  const handleToggleEmailUpdates = async () => {
    if (!user || !accessToken || !preferences) return;

    try {
      const service = getSettingsService();
      const updated = await service.updatePreferences(accessToken, {
        emailUpdates: !preferences.emailUpdates,
      });
      setPreferences(updated);
      showSuccess("Preferences Updated", "Email settings have been saved");
      logger.info("Email updates toggled", { enabled: updated.emailUpdates });
    } catch (error) {
      logger.error("Error updating preferences", { error });
    }
  };

  // Removed IndexedDB reset: no longer applicable with API-backed data

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="Settings"
        description="Manage your account and preferences"
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
              <CardDescription>Your account details</CardDescription>
            </div>
            <Dialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" onClick={openEditProfile}>
                  <Edit className="h-4 w-4 mr-0.5" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Profile</DialogTitle>
                  <DialogDescription>Update your name and email address</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Display Name</Label>
                    <Input
                      id="edit-name"
                      value={editDisplayName}
                      onChange={(e) => setEditDisplayName(e.target.value)}
                      placeholder="Enter your name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-email">Email Address</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      placeholder="Enter your email"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsEditProfileOpen(false)} disabled={isUpdatingProfile}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateProfile} disabled={isUpdatingProfile}>
                    {isUpdatingProfile ? "Saving..." : "Save Changes"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Name</Label>
              <p className="text-sm font-medium">{user?.displayName}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Email</Label>
              <p className="text-sm font-medium">{user?.email}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Role</Label>
              <p className="text-sm font-medium">{user?.role.replace("_", " ")}</p>
            </div>
          </div>
          <div className="pt-4">
            <Dialog open={isChangePasswordOpen} onOpenChange={setIsChangePasswordOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <Lock className="h-4 w-4 mr-2" />
                  Change Password
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Change Password</DialogTitle>
                  <DialogDescription>Update your account password</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Current Password</Label>
                    <div className="relative">
                      <Input
                        id="current-password"
                        type={showCurrentPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password"
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <div className="relative">
                      <Input
                        id="confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsChangePasswordOpen(false);
                      setCurrentPassword("");
                      setNewPassword("");
                      setConfirmPassword("");
                    }}
                    disabled={isChangingPassword}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleChangePassword} disabled={isChangingPassword}>
                    {isChangingPassword ? "Changing..." : "Change Password"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
          <CardDescription>Customize your experience</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingPrefs ? (
            <p className="text-sm text-muted-foreground">Loading preferences...</p>
          ) : (
            <>
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5 flex-1">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Notifications
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {preferences?.notifications ? "Enabled" : "Disabled"}
                  </p>
                </div>
                <Button
                  variant={preferences?.notifications ? "default" : "outline"}
                  size="sm"
                  onClick={handleToggleNotifications}
                >
                  {preferences?.notifications ? "Enabled" : "Disabled"}
                </Button>
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5 flex-1">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email Updates
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {preferences?.emailUpdates ? "Enabled" : "Disabled"}
                  </p>
                </div>
                <Button
                  variant={preferences?.emailUpdates ? "default" : "outline"}
                  size="sm"
                  onClick={handleToggleEmailUpdates}
                >
                  {preferences?.emailUpdates ? "Enabled" : "Disabled"}
                </Button>
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5 flex-1">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    Theme
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {theme === "auto"
                      ? "Following system preference"
                      : `Using ${theme} mode`}
                  </p>
                </div>

                <div className="flex items-center gap-1 rounded-lg border bg-muted p-1">
                  <Button
                    variant={theme === "light" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setTheme("light")}
                    className="px-3"
                  >
                    <Sun className="h-4 w-4" />
                  </Button>

                  <Button
                    variant={theme === "dark" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setTheme("dark")}
                    className="px-3"
                  >
                    <Moon className="h-4 w-4" />
                  </Button>

                  <Button
                    variant={theme === "auto" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setTheme("auto")}
                    className="px-3"
                  >
                    <Monitor className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
