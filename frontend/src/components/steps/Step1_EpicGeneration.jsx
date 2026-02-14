import { useState } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';

const exampleProjects = [
  "Build a fitness tracking mobile application with workout logging, nutrition tracking, and progress analytics",
  "Create a project management system with task tracking, team collaboration, and reporting features",
  "Develop an e-commerce platform with product catalog, shopping cart, payment integration, and order management",
  "Build a social media dashboard with post scheduling, analytics, and multi-platform integration",
  "Create a healthcare patient management system with appointments, medical records, and billing"
];

export default function Step1_EpicGeneration() {
  const {
    projectDescription,
    setProjectDescription,
    setGeneratedEpics,
    nextStep
  } = useWorkflow();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    if (!projectDescription.trim()) {
      setError('Please enter a project description');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: projectDescription })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate epics');
      }

      setGeneratedEpics(data.result.epics, data.generator_used);
      nextStep();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Generate Epic Documentation
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Describe your project and we'll generate comprehensive epics, user stories, acceptance criteria, and test cases using AI.
        </p>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Project Description
          </label>
          <textarea
            value={projectDescription}
            onChange={(e) => setProjectDescription(e.target.value)}
            placeholder="E.g., Build a modern task management application with real-time collaboration, notifications, and analytics..."
            className="w-full h-40 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     resize-none"
            disabled={loading}
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Example Projects
          </label>
          <div className="space-y-2">
            {exampleProjects.map((example, index) => (
              <button
                key={index}
                onClick={() => setProjectDescription(example)}
                className="w-full text-left px-4 py-3 border border-gray-300 dark:border-gray-600
                         rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700
                         transition-colors text-sm text-gray-700 dark:text-gray-300"
                disabled={loading}
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={loading || !projectDescription.trim()}
          className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400
                   text-white font-medium rounded-lg transition-colors
                   flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="animate-spin">⏳</span>
              Generating epics...
            </>
          ) : (
            <>
              <span>✨</span>
              Generate Epics
            </>
          )}
        </button>

        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 text-center">
          This will generate 5 comprehensive epics with user stories, acceptance criteria, and test cases
        </p>
      </div>
    </div>
  );
}
