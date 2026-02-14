import { WorkflowProvider, useWorkflow } from './context/WorkflowContext'
import Header from './components/layout/Header'
import ProgressStepper from './components/shared/ProgressStepper'
import Step1_EpicGeneration from './components/steps/Step1_EpicGeneration'
import Step2_EpicApproval from './components/steps/Step2_EpicApproval'
import Step3_DeveloperAnalysis from './components/steps/Step3_DeveloperAnalysis'
import Step4_Assignment from './components/steps/Step4_Assignment'

function App() {
  return (
    <WorkflowProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <ProgressStepper />
          <div className="mt-8">
            <StepContent />
          </div>
        </main>
      </div>
    </WorkflowProvider>
  )
}

function StepContent() {
  const { currentStep } = useWorkflow()

  const steps = [
    <Step1_EpicGeneration key="step1" />,
    <Step2_EpicApproval key="step2" />,
    <Step3_DeveloperAnalysis key="step3" />,
    <Step4_Assignment key="step4" />
  ]

  return steps[currentStep - 1]
}

export default App
