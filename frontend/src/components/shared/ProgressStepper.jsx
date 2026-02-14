import { useWorkflow } from '../../context/WorkflowContext';

const steps = [
  { number: 1, title: 'Epic Generation', icon: '✨' },
  { number: 2, title: 'Approval', icon: '✅' },
  { number: 3, title: 'Dev Analysis', icon: '👥' },
  { number: 4, title: 'Assignment', icon: '🎯' }
];

export default function ProgressStepper() {
  const { currentStep, approvedEpics, developers, assignments } = useWorkflow();

  const getStepStatus = (stepNumber) => {
    if (stepNumber < currentStep) return 'completed';
    if (stepNumber === currentStep) return 'current';
    return 'upcoming';
  };

  const getStepBadge = (stepNumber) => {
    if (stepNumber === 2 && approvedEpics.length > 0) {
      return approvedEpics.length;
    }
    if (stepNumber === 3 && developers.length > 0) {
      return developers.length;
    }
    if (stepNumber === 4 && assignments.length > 0) {
      return assignments.length;
    }
    return null;
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const status = getStepStatus(step.number);
          const badge = getStepBadge(step.number);

          return (
            <div key={step.number} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`
                    w-12 h-12 rounded-full flex items-center justify-center text-xl
                    transition-all duration-300
                    ${status === 'completed' ? 'bg-green-500 text-white' : ''}
                    ${status === 'current' ? 'bg-blue-500 text-white ring-4 ring-blue-200 dark:ring-blue-900' : ''}
                    ${status === 'upcoming' ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400' : ''}
                  `}
                >
                  {status === 'completed' ? '✓' : step.icon}
                </div>
                <div className="mt-2 text-center">
                  <div
                    className={`
                      text-sm font-medium
                      ${status === 'current' ? 'text-blue-600 dark:text-blue-400' : ''}
                      ${status === 'completed' ? 'text-green-600 dark:text-green-400' : ''}
                      ${status === 'upcoming' ? 'text-gray-500 dark:text-gray-400' : ''}
                    `}
                  >
                    {step.title}
                    {badge && (
                      <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                        {badge}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`
                    flex-1 h-1 mx-2 -mt-6
                    ${status === 'completed' ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}
                  `}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
