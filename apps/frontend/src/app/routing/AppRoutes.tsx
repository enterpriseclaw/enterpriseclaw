import { Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from '@/app/shell/AppShell'
import { ChatPage }      from '@/domain/chat/ChatPage'
import { SkillsPage }    from '@/domain/skills/SkillsPage'
import { CronJobsPage }  from '@/domain/cronjobs/CronJobsPage'
import { DashboardPage } from '@/domain/dashboard/DashboardPage'
import { AuditLogPage }  from '@/domain/audit/AuditLogPage'
import { SettingsPage }  from '@/domain/settings/SettingsPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/chat" replace />} />
        <Route path="/chat"        element={<ChatPage />} />
        <Route path="/chat/:sessionId" element={<ChatPage />} />
        <Route path="/skills"      element={<SkillsPage />} />
        <Route path="/cronjobs"    element={<CronJobsPage />} />
        <Route path="/dashboard"   element={<DashboardPage />} />
        <Route path="/audit-log"   element={<AuditLogPage />} />
        <Route path="/settings"    element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}
