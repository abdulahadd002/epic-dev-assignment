import { WorkflowProvider, useWorkflow } from './context/WorkflowContext'
import { AnimatePresence, motion } from 'framer-motion'
import Header from './components/layout/Header'
import ProgressStepper from './components/shared/ProgressStepper'
import Step1_EpicGeneration from './components/steps/Step1_EpicGeneration'
import Step2_EpicApproval from './components/steps/Step2_EpicApproval'
import Step3_DeveloperAnalysis from './components/steps/Step3_DeveloperAnalysis'
import Step4_Assignment from './components/steps/Step4_Assignment'
import { useTheme } from './hooks/useTheme'
import { createContext, useContext } from 'react'

const ThemeContext = createContext({ theme: 'dark', toggleTheme: () => {}, isDark: true })
export const useThemeContext = () => useContext(ThemeContext)

function App() {
  const themeState = useTheme()

  return (
    <ThemeContext.Provider value={themeState}>
      <WorkflowProvider>
        {/* Ambient background */}
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
    </ThemeContext.Provider>
  )
}

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
      <motion.div
        key={currentStep}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        {steps[currentStep]}
      </motion.div>
    </AnimatePresence>
  )
}

export default App
