/**
 * Centralized configuration
 * Single source of truth for environment variables and app settings
 * SAFE for Vite, SSR, HMR, tests
 */

const env =
  (typeof import.meta !== "undefined" &&
    (import.meta as any).env) ||
  {};

const normalizeBaseUrl = (value: string): string => {
  if (!value) return value;
  return value.replace(/\/+$/, "");
};

const apiBaseUrl = normalizeBaseUrl(env.VITE_BASE_API_URL || "http://localhost:3000");

/**
 * Helpers
 */
const isDev =
  env.MODE === "development" ||
  env.DEV === true ||
  env.DEV === "true";

export const config = {
  // =========================
  // Environment
  // =========================
  isDevelopment: isDev,

  // =========================
  // App Info
  // =========================
  appName: "AskIEP",

  // =========================
  // API Configuration
  // =========================
  api: {
    /**
     * Frontend-safe (VITE-prefixed) base URL
     */
    baseUrl: apiBaseUrl,
    /**
     * Helper to build full API URLs (guards leading slash)
     */
    resolveUrl: (path: string) => `${apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`,
    timeout: 30000,

    endpoints: {
      auth: {
        login: "/api/v1/auth/login",
        register: "/api/v1/auth/register",
        registerParent: "/api/v1/auth/register/parent",
        registerAdvocate: "/api/v1/auth/register/advocate",
        registerTeacher: "/api/v1/auth/register/teacher",
        refresh: "/api/v1/auth/refresh",
        profile: "/api/v1/auth/me",
        changePassword: "/api/v1/auth/change-password",
        logout: "/api/v1/auth/logout",
        exchangeToken: "/api/v1/auth/exchange-token",
      },
      consents: "/api/v1/consents",

      children: {
        list: "/api/v1/children",
        get: "/api/v1/children/:id",
        create: "/api/v1/children",
        update: "/api/v1/children/:id",
        delete: "/api/v1/children/:id",
      },

      goals: {
        list: "/api/v1/goals",
        get: "/api/v1/goals/:id",
        create: "/api/v1/goals",
        update: "/api/v1/goals/:id",
        delete: "/api/v1/goals/:id",
        progress: "/api/v1/goals/:id/progress",
      },

      behavior: {
        list: "/api/v1/behaviors",
        get: "/api/v1/behaviors/:id",
        create: "/api/v1/behaviors",
        update: "/api/v1/behaviors/:id",
        delete: "/api/v1/behaviors/:id",
      },

      contact: {
        list: "/api/v1/communications",
        get: "/api/v1/communications/:id",
        create: "/api/v1/communications",
        update: "/api/v1/communications/:id",
        delete: "/api/v1/communications/:id",
      },

      letters: {
        list: "/api/v1/letters",
        generate: "/api/v1/letters",
        get: "/api/v1/letters/:id",
        update: "/api/v1/letters/:id",
        delete: "/api/v1/letters/:id",
        templates: "/api/v1/letters/templates",
      },

      advocacy: {
        resources: "/api/v1/advocacy",
        templates: "/api/v1/advocacy/templates",
      },

      compliance: {
        check: "/api/v1/compliance",
        timeline: "/api/v1/compliance/timeline",
        get: "/api/v1/compliance/:id",
        create: "/api/v1/compliance",
        update: "/api/v1/compliance/:id",
        delete: "/api/v1/compliance/:id",
      },

      legal: {
        // Reuse the generic resources endpoints on the API
        resources: "/api/v1/resources",
        support: "/api/v1/resources",
        supportSessions: "/api/v1/agent/legal-support/sessions",
      },

      resources: {
        list: "/api/v1/resources",
        search: "/api/v1/resources/search",
      },

      iep: {
        list: "/api/v1/iep",
        get: "/api/v1/iep/:id",
        create: "/api/v1/iep",
        update: "/api/v1/iep/:id",
        delete: "/api/v1/iep/:id",
        analyze: "/api/v1/iep/:id/analyze",
      },

      dashboard: {
        stats: "/api/v1/dashboard",
      },

      preferences: {
        get: "/api/v1/settings/preferences",
        update: "/api/v1/settings/preferences",
      },

      config: {
        public: "/api/v1/config",
        admin: "/api/v1/admin/config",
      },

      leads: {
        create: "/api/v1/leads",
        list: "/api/v1/leads",
        stats: "/api/v1/leads/stats",
      },

      admin: {
        users: "/api/v1/admin/user-management/users",
        userStats: "/api/v1/admin/user-management/users/stats",
        userById: (id: string) => `/api/v1/admin/user-management/users/${id}`,
        createUser: "/api/v1/admin/user-management/users",
        updateUser: (id: string) => `/api/v1/admin/user-management/users/${id}`,
        deleteUser: (id: string) => `/api/v1/admin/user-management/users/${id}`,
        pendingRequests: "/api/v1/admin/user-management/requests/pending",
        approveRequests: "/api/v1/admin/user-management/requests/approve",
        rejectRequests: "/api/v1/admin/user-management/requests/reject",
        importTemplate: "/api/v1/admin/user-management/users/import/template",
        importCsv: "/api/v1/admin/user-management/users/import/csv",
      },
    },
  },

  // =========================
  // Database
  // =========================
  dbName: "askiep-db",
  dbVersion: 4,

  // =========================
  // Routes
  // =========================
    routes: {
      // Public routes
      login: "/login",
      register: "/register",

      // Protected routes
      dashboard: "/dashboard",
      childProfile: "/child-profile",
      childProfileNew: "/child-profile/new",
      childProfileEdit: (id: string) => `/child-profile/${id}`,
      iepAnalyzer: "/iep/analyse",
      iepList: "/iep/list",
      iepNew: "/iep/new",
      iepEdit: (id: string) => `/iep/${id}`,
      goalProgress: "/goal-progress",
      goalProgressNew: "/goal-progress/new",
      goalProgressEdit: (id: string) => `/goal-progress/${id}`,
    behaviorAbc: "/behavior-abc",
    behaviorAbcNew: "/behavior-abc/new",
    behaviorAbcEdit: (id: string) => `/behavior-abc/${id}`,
    contactLog: "/contact-log",
    contactLogNew: "/contact-log/new",
    contactLogEdit: (id: string) => `/contact-log/${id}`,
    letterWriter: "/letter-writer",
    letterWriterNew: "/letter-writer/new",
    letterWriterEdit: (id: string) => `/letter-writer/${id}`,
    advocacyLab: "/advocacy-lab",
    advocacyLabNew: "/advocacy-lab/new",
    advocacyLabEdit: (id: string) => `/advocacy-lab/${id}`,
    compliance: "/compliance",
    complianceNew: "/compliance/new",
    complianceEdit: (id: string) => `/compliance/${id}`,
    legalSupport: "/legal-support",
    resources: "/resources",
    settings: "/settings",

    // Admin routes
    adminUsers: "/admin/users",
    adminUsersNew: "/admin/users/new",
    adminUsersEdit: (id: string) => `/admin/users/${id}`,
    adminUsersRequests: "/admin/users/requests",
    adminUsersImport: "/admin/users/import",
  },

  // =========================
  // Session
  // =========================
  sessionKey: "askiep.session",
  sessionDuration: 2 * 60 * 60 * 1000,

  // =========================
  // Theme
  // =========================
  themeKey: "askiep.theme",

  // =========================
  // Logging
  // =========================
  logLevel: isDev ? "debug" : "info",

  // =========================
  // Feature Flags
  // =========================
  features: {
    useAPI: true,
    offlineMode: true,
  },
} as const;
