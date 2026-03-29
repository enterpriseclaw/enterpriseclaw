import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/app/providers/AuthProvider";
import { RequireAuth } from "./RequireAuth";
import { RequireRole } from "./RequireRole";
import { AppShell } from "@/app/shell/AppShell";
import { config } from "@/lib/config";

// Lazy load pages
import { LoginPage } from "@/app/pages/LoginPage";
import { RegisterPage } from "@/app/pages/RegisterPage";
import { DashboardPage } from "@/app/pages/DashboardPage";
import { ChildProfilePage } from "@/app/pages/ChildProfilePage";
import { ChildEditPage } from "@/app/pages/ChildEditPage";
import { IEPAnalyzerPage } from "@/domain/iep/IEPAnalyzerPage.tsx";
import { IEPAnalysisPage } from "@/domain/iep/IEPAnalysisPage.tsx";
import { IEPListPage } from "@/domain/iep/IEPListPage.tsx";
import { IEPEditPage } from "@/domain/iep/IEPEditPage.tsx";
import { IEPViewPage } from "@/domain/iep/IEPViewPage.tsx";
import { GoalProgressPage } from "@/app/pages/GoalProgressPage";
import { GoalEditPage } from "@/app/pages/GoalEditPage";
import { BehaviorABCPage } from "@/app/pages/BehaviorABCPage";
import { BehaviorEditPage } from "@/app/pages/BehaviorEditPage";
import { ContactLogPage } from "@/app/pages/ContactLogPage";
import { ContactLogEditPage } from "@/app/pages/ContactLogEditPage";
import { LetterWriterPage } from "@/app/pages/LetterWriterPage";
import { LetterWriterEditPage } from "@/app/pages/LetterWriterEditPage";

import { AdvocacyLabPage  } from "@/domain/advocacy/AdvocacyLabPage.tsx";
import { AdvocacyLabEditPage } from "@/app/pages/AdvocacyLabEditPage";
import { CompliancePage } from "@/app/pages/CompliancePage";
import { ComplianceEditPage } from "@/app/pages/ComplianceEditPage";
import { LegalSupportPage } from "@/domain/legal/LegalSupportPage.tsx";
import { ResourcesPage } from "@/app/pages/ResourcesPage";
import { SettingsPage } from "@/app/pages/SettingsPage";
import { NotFoundPage } from "@/app/pages/NotFoundPage";
import AdminUsersPage from "@/app/pages/admin/AdminUsersPage";
import AdminRequestsPage from "@/app/pages/admin/AdminRequestsPage";
import AdminUserEditPage from "@/app/pages/admin/AdminUserEditPage";
import AdminUserImportPage from "@/app/pages/admin/AdminUserImportPage";

// Route configuration with titles
const routeTitles: Record<string, string> = {
  '/': 'IEP App',
  '/login': 'Login - IEP App',
  '/register': 'Register - IEP App',
  '/dashboard': 'Dashboard - IEP App',
  '/child-profile': 'Child Profile - IEP App',
  '/iep/analyse': 'IEP Analyzer - IEP App',
  '/advocacy-lab': 'Advocacy Lab - IEP App',
  '/iep/list': 'IEP Management - IEP App',
  '/iep/view/:id': 'View IEP - IEP App',
  '/goal-progress': 'Goal Progress - IEP App',
  '/behavior-abc': 'Behavior ABC - IEP App',
  '/contact-log': 'Contact Log - IEP App',
  '/letter-writer': 'Letter Writer - IEP App',
  '/compliance': 'Compliance - IEP App',
  '/legal-support': 'Legal Support - IEP App',
  '/resources': 'Resources - IEP App',
  '/settings': 'Settings - IEP App',
  '/admin/users': 'User Management - IEP App',
  '/admin/users/requests': 'User Requests - IEP App',
  '/admin/users/import': 'Import Users - IEP App'
};

const getPageTitle = (pathname: string): string => {
  // Check for exact matches first
  if (routeTitles[pathname]) return routeTitles[pathname];
  
  // Handle dynamic routes
  if (pathname.startsWith('/child-profile/')) {
    const isNew = pathname.endsWith('/new');
    return isNew ? 'New Child Profile - IEP App' : 'Edit Child Profile - IEP App';
  }
  
  if (pathname.startsWith('/iep/')) {
    if (pathname.startsWith('/iep/view/')) return 'View IEP - IEP App';
    const isNew = pathname.endsWith('/new');
    return isNew ? 'New IEP - IEP App' : 'Edit IEP - IEP App';
  }
  
  if (pathname.startsWith('/goal-progress/')) {
    const isNew = pathname.endsWith('/new');
    return isNew ? 'New Goal - IEP App' : 'Edit Goal - IEP App';
  }
  
  if (pathname.startsWith('/behavior-abc/')) {
    const isNew = pathname.endsWith('/new');
    return isNew ? 'New Behavior Entry - IEP App' : 'Edit Behavior Entry - IEP App';
  }
  
  if (pathname.startsWith('/contact-log/')) {
    const isNew = pathname.endsWith('/new');
    return isNew ? 'New Contact Log - IEP App' : 'Edit Contact Log - IEP App';
  }
  
  if (pathname.startsWith('/letter-writer/')) {
    const isNew = pathname.endsWith('/new');
    return isNew ? 'New Letter - IEP App' : 'Edit Letter - IEP App';
  }
  
  if (pathname.startsWith('/advocacy-lab/')) {
    return 'Advocacy Lab Session - IEP App';
  }
  
  if (pathname.startsWith('/compliance/')) {
    const isNew = pathname.endsWith('/new');
    return isNew ? 'New Compliance Entry - IEP App' : 'Edit Compliance Entry - IEP App';
  }
  
  if (pathname.startsWith('/admin/users/')) {
    return 'Edit User - IEP App';
  }
  
  // Default fallback
  return 'IEP App';
};

function HomeRedirect() {
  const { isAuthenticated } = useAuth();
  return <Navigate to={isAuthenticated ? config.routes.dashboard : config.routes.login} replace />;
}

export function AppRoutes() {
  const location = useLocation();
  
  // Update document title based on current route
  useEffect(() => {
    const title = getPageTitle(location.pathname);
    document.title = title;
  }, [location.pathname]);
  
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        path="/*"
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route
          path="dashboard"
          element={
            <RequireRole>
              <DashboardPage />
            </RequireRole>
          }
        />
        <Route
          path="child-profile"
          element={
            <RequireRole>
              <ChildProfilePage />
            </RequireRole>
          }
        />
        <Route
          path="child-profile/:id"
          element={
            <RequireRole>
              <ChildEditPage />
            </RequireRole>
          }
        />
        <Route
          path="iep/analyse"
          element={
            <RequireRole>
              <IEPAnalyzerPage />
            </RequireRole>
          }
        />
        <Route
          path="iep/analyse/:docId"
          element={
            <RequireRole>
              <IEPAnalysisPage />
            </RequireRole>
          }
        />
        <Route
          path="advocacy-lab"
          element={
            <RequireRole>
              <AdvocacyLabPage />
            </RequireRole>
          }
        />
        <Route
          path="iep/list"
          element={
            <RequireRole>
              <IEPListPage />
            </RequireRole>
          }
        />
        <Route
          path="iep/view/:id"
          element={
            <RequireRole>
              <IEPViewPage />
            </RequireRole>
          }
        />

        <Route
          path="goal-progress"
          element={
            <RequireRole>
              <GoalProgressPage />
            </RequireRole>
          }
        />
        <Route
          path="goal-progress/:id"
          element={
            <RequireRole>
              <GoalEditPage />
            </RequireRole>
          }
        />
        <Route
          path="behavior-abc"
          element={
            <RequireRole>
              <BehaviorABCPage />
            </RequireRole>
          }
        />
        <Route
          path="behavior-abc/:id"
          element={
            <RequireRole>
              <BehaviorEditPage />
            </RequireRole>
          }
        />
        <Route
          path="contact-log"
          element={
            <RequireRole>
              <ContactLogPage />
            </RequireRole>
          }
        />
        <Route
          path="contact-log/:id"
          element={
            <RequireRole>
              <ContactLogEditPage />
            </RequireRole>
          }
        />
        <Route
          path="letter-writer"
          element={
            <RequireRole>
              <LetterWriterPage />
            </RequireRole>
          }
        />
        <Route
          path="letter-writer/:id"
          element={
            <RequireRole>
              <LetterWriterEditPage />
            </RequireRole>
          }
        />
        <Route
          path="advocacy-lab"
          element={
            <RequireRole>
              <AdvocacyLabPage />
            </RequireRole>
          }
        />
        <Route
          path="advocacy-lab/:id"
          element={
            <RequireRole>
              <AdvocacyLabEditPage />
            </RequireRole>
          }
        />
        <Route
          path="compliance"
          element={
            <RequireRole>
              <CompliancePage />
            </RequireRole>
          }
        />
        <Route
          path="compliance/new"
          element={
            <RequireRole>
              <ComplianceEditPage />
            </RequireRole>
          }
        />
        <Route
          path="compliance/:id"
          element={
            <RequireRole>
              <ComplianceEditPage />
            </RequireRole>
          }
        />
        <Route
          path="legal-support"
          element={
            <RequireRole>
              <LegalSupportPage />
            </RequireRole>
          }
        />
        <Route
          path="resources"
          element={
            <RequireRole>
              <ResourcesPage />
            </RequireRole>
          }
        />
        <Route
          path="settings"
          element={
            <RequireRole>
              <SettingsPage />
            </RequireRole>
          }
        />
        <Route
          path="admin/users"
          element={
            <RequireRole allowedRoles={['ADMIN']}>
              <AdminUsersPage />
            </RequireRole>
          }
        />
        <Route
          path="admin/users/requests"
          element={
            <RequireRole allowedRoles={['ADMIN']}>
              <AdminRequestsPage />
            </RequireRole>
          }
        />
        <Route
          path="admin/users/import"
          element={
            <RequireRole allowedRoles={['ADMIN']}>
              <AdminUserImportPage />
            </RequireRole>
          }
        />
        <Route
          path="admin/users/:id"
          element={
            <RequireRole allowedRoles={['ADMIN']}>
              <AdminUserEditPage />
            </RequireRole>
          }
        />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
