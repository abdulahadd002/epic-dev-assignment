import { useWorkflow } from '../../context/WorkflowContext';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

const steps = [
  { number: 1, title: 'Generate', label: 'EPICS' },
  { number: 2, title: 'Approve', label: 'REVIEW' },
  { number: 3, title: 'Analyze', label: 'DEVS' },
  { number: 4, title: 'Assign', label: 'MATCH' }
];

export default function ProgressStepper() {
  const { currentStep, setCurrentStep } = useWorkflow();

  const getStepStatus = (stepNumber) => {
    if (stepNumber < currentStep) return 'completed';
    if (stepNumber === currentStep) return 'current';
    return 'upcoming';
  };

  const handleStepClick = (stepNumber) => {
    const status = getStepStatus(stepNumber);
    if (status === 'completed' || status === 'current') {
      setCurrentStep(stepNumber);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="flex items-center">
        {steps.map((step, index) => {
          const status = getStepStatus(step.number);
          const isCompleted = status === 'completed';
          const isCurrent = status === 'current';
          const isUpcoming = status === 'upcoming';

          return (
            <div key={step.number} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <button
                  onClick={() => handleStepClick(step.number)}
                  disabled={isUpcoming}
                  className="relative group"
                >
                  {/* Glow ring for current */}
                  {isCurrent && (
                    <motion.div
                      className="absolute -inset-1.5 rounded-2xl bg-accent-cyan/20 blur-sm"
                      layoutId="stepGlow"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                  <motion.div
                    className={`
                      relative w-10 h-10 rounded-xl flex items-center justify-center
                      text-sm font-mono font-semibold
                      transition-colors duration-300
                      ${isCompleted ? 'bg-accent-cyan/15 text-accent-cyan cursor-pointer group-hover:bg-accent-cyan/25' : ''}
                      ${isCurrent ? 'bg-accent-cyan cursor-pointer' : ''}
                      ${isUpcoming ? 'bg-card-theme text-faint cursor-not-allowed' : ''}
                    `}
                    style={isCurrent ? { color: '#fff' } : undefined}
                    whileHover={!isUpcoming ? { scale: 1.08 } : {}}
                    whileTap={!isUpcoming ? { scale: 0.95 } : {}}
                  >
                    {isCompleted ? (
                      <motion.div
                        initial={{ scale: 0, rotate: -45 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                      >
                        <Check className="w-4 h-4" strokeWidth={2.5} />
                      </motion.div>
                    ) : (
                      step.number
                    )}
                  </motion.div>
                </button>
                <div className="mt-2.5 text-center">
                  <div className={`
                    text-[11px] font-mono uppercase tracking-widest transition-colors duration-300
                    ${isCurrent ? 'text-accent-cyan' : ''}
                    ${isCompleted ? 'text-accent-cyan/50' : ''}
                    ${isUpcoming ? 'text-faint' : ''}
                  `}>
                    {step.label}
                  </div>
                  <div className={`
                    text-xs mt-0.5 transition-colors duration-300
                    ${isCurrent ? 'text-heading' : ''}
                    ${isCompleted ? 'text-subtle' : ''}
                    ${isUpcoming ? 'text-faint' : ''}
                  `}>
                    {step.title}
                  </div>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div className="flex-1 mx-1 -mt-6 relative">
                  <div className="h-px w-full" style={{ background: 'var(--border-card)' }} />
                  {isCompleted && (
                    <motion.div
                      className="absolute top-0 left-0 h-px bg-gradient-to-r from-accent-cyan/40 to-accent-cyan/10"
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
