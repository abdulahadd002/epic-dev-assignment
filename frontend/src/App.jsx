import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { WorkflowProvider, useWorkflow } from './context/WorkflowContext'
import { AuthProvider } from './context/AuthContext'
import { ProjectsProvider } from './hooks/useProjects'
import { JiraProvider } from './context/JiraContext'
import { AnimatePresence, motion } from 'framer-motion'
import { createContext, useContext } from 'react'
import { useTheme } from './hooks/useTheme'

// Layout & guard
import Header from './components/layout/Header'
import AuthGuard from './components/layout/AuthGuard'
import Sidebar from './components/layout/Sidebar'

// Workflow steps (unchanged)
import ProgressStepper from './components/shared/ProgressStepper'
import Step1_EpicGeneration from './components/steps/Step1_EpicGeneration'
import Step2_EpicApproval from './components/steps/Step2_EpicApproval'
import Step3_DeveloperAnalysis from './components/steps/Step3_DeveloperAnalysis'
import Step4_Assignment from './components/steps/Step4_Assignment'

// Pages
import Login from './pages/Login'
import ProjectsPage from './pages/projects/ProjectsPage'
import ProjectWizardPage from './pages/projects/ProjectWizardPage'
import ProjectDetailPage from './pages/projects/ProjectDetailPage'
import ProjectKanbanPage from './pages/projects/ProjectKanbanPage'
import VerifyPage from './pages/projects/VerifyPage'
import AssignPage from './pages/projects/AssignPage'
import DevelopersPage from './pages/DevelopersPage'
import Dashboard from './pages/jira/Dashboard'
import Kanban from './pages/jira/Kanban'
import Reports from './pages/jira/Reports'
import Settings from './pages/jira/Settings'

// Theme context (kept for existing workflow compatibility)
const ThemeContext = createContext({ theme: 'light', toggleTheme: () => {}, isDark: false })
export const useThemeContext = () => useContext(ThemeContext)

// ─── Existing 4-step workflow (unchanged) ──────────────────────────────────
const pageVariants = {
  initial: { opacity: 0, y: 16, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, y: -12, filter: 'blur(4px)', transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } }
}

function StepContent() {
  const { currentStep } = useWorkflow()
  const steps = {
    1: <Step1_EpicGeneration />,
    2: <Step2_EpicApproval />,
    3: <Step3_DeveloperAnalysis />,
    4: <Step4_Assignment />
  }
  return (
    <AnimatePresence mode="wait">
      <motion.div key={currentStep} variants={pageVariants} initial="initial" animate="animate" exit="exit">
        {steps[currentStep]}
      </motion.div>
    </AnimatePresence>
  )
}

function WorkflowApp() {
  return (
    <WorkflowProvider>
      <div className="ambient-bg">
        <div className="ambient-orb ambient-orb-1" />
        <div className="ambient-orb ambient-orb-2" />
        <div className="ambient-orb ambient-orb-3" />
      </div>
      <div className="noise-overlay" />
      <div className="grid-overlay" />
      <div className="relative z-10 min-h-screen">
        <Header />
        <main className="max-w-7xl mx-auto px-6 py-8">
          <ProgressStepper />
          <div className="mt-10">
            <StepContent />
          </div>
        </main>
      </div>
    </WorkflowProvider>
  )
}

// ─── Sidebar layout for new pages ──────────────────────────────────────────
function SidebarLayout({ children }) {
  return (
    <JiraProvider>
      <div className="flex h-screen overflow-hidden" style={{ background: '#f9fafb' }}>
        <Sidebar />
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </JiraProvider>
  )
}

// ─── Root App ──────────────────────────────────────────────────────────────
function App() {
  const themeState = useTheme()

  return (
    <ThemeContext.Provider value={themeState}>
      <AuthProvider>
        <ProjectsProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<Login />} />

            {/* Default: redirect to projects */}
            <Route path="/" element={<Navigate to="/projects" replace />} />

            {/* Existing 4-step wizard — completely unchanged */}
            <Route path="/wizard" element={
              <AuthGuard>
                <WorkflowApp />
              </AuthGuard>
            } />

            {/* Project management */}
            <Route path="/projects" element={
              <AuthGuard><SidebarLayout><ProjectsPage /></SidebarLayout></AuthGuard>
            } />
            <Route path="/projects/new" element={
              <AuthGuard><SidebarLayout><ProjectWizardPage /></SidebarLayout></AuthGuard>
            } />
            <Route path="/projects/:projectId" element={
              <AuthGuard><SidebarLayout><ProjectDetailPage /></SidebarLayout></AuthGuard>
            } />
            <Route path="/projects/:projectId/verify" element={
              <AuthGuard><SidebarLayout><VerifyPage /></SidebarLayout></AuthGuard>
            } />
            <Route path="/projects/:projectId/assign" element={
              <AuthGuard><SidebarLayout><AssignPage /></SidebarLayout></AuthGuard>
            } />
            <Route path="/projects/:projectId/kanban" element={
              <AuthGuard><SidebarLayout><ProjectKanbanPage /></SidebarLayout></AuthGuard>
            } />

            {/* Developers */}
            <Route path="/developers" element={
              <AuthGuard><SidebarLayout><DevelopersPage /></SidebarLayout></AuthGuard>
            } />

            {/* Jira monitoring */}
            <Route path="/dashboard" element={
              <AuthGuard><SidebarLayout><Dashboard /></SidebarLayout></AuthGuard>
            } />
            <Route path="/kanban" element={
              <AuthGuard><SidebarLayout><Kanban /></SidebarLayout></AuthGuard>
            } />
            <Route path="/reports" element={
              <AuthGuard><SidebarLayout><Reports /></SidebarLayout></AuthGuard>
            } />
            <Route path="/settings" element={
              <AuthGuard><SidebarLayout><Settings /></SidebarLayout></AuthGuard>
            } />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/projects" replace />} />
          </Routes>
        </BrowserRouter>
        </ProjectsProvider>
      </AuthProvider>
    </ThemeContext.Provider>
  )
}

export default App
