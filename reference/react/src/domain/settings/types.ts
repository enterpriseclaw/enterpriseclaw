export interface UserPreferences {
  userId: string;
  theme?: "light" | "dark" | "auto";
  notifications: boolean;
  emailUpdates: boolean;
}

export type UpdatePreferencesData = Partial<Omit<UserPreferences, "userId">>;
