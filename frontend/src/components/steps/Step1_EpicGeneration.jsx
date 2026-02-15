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

        {/* Prompt Structure Guide */}
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <details className="group">
            <summary className="cursor-pointer font-medium text-blue-900 dark:text-blue-300 flex items-center gap-2">
              <span className="group-open:rotate-90 transition-transform">▶</span>
              💡 How to Write an Effective Project Description
            </summary>
            <div className="mt-3 text-sm text-blue-800 dark:text-blue-300 space-y-3">
              <div>
                <strong>1. Project Overview</strong>
                <p className="text-blue-700 dark:text-blue-400 ml-4">Start with 1-3 sentences describing your application's purpose and key characteristics.</p>
                <code className="block ml-4 mt-1 text-xs bg-white dark:bg-gray-800 p-2 rounded">
                  "Create a modern, responsive fitness tracking web application that helps users monitor their daily health..."
                </code>
              </div>

              <div>
                <strong>2. Core Features (Required)</strong>
                <p className="text-blue-700 dark:text-blue-400 ml-4">List your main features as numbered items. Each feature will become an epic!</p>
                <code className="block ml-4 mt-1 text-xs bg-white dark:bg-gray-800 p-2 rounded whitespace-pre">
{`Core Features Required:
1. User Authentication - Allow users to create accounts...
2. Dashboard - Display a comprehensive overview...
3. Workout Logging - Enable users to log exercises...`}
                </code>
              </div>

              <div>
                <strong>3. Feature Details</strong>
                <p className="text-blue-700 dark:text-blue-400 ml-4">Add bullet points under each feature for specific requirements.</p>
                <code className="block ml-4 mt-1 text-xs bg-white dark:bg-gray-800 p-2 rounded whitespace-pre">
{`2. Dashboard - Display overview with:
   - Daily calorie intake vs. burned calories
   - Water intake tracking with goal progress
   - Steps walked with daily goal indicator`}
                </code>
              </div>

              <div>
                <strong>4. Additional Details (Optional)</strong>
                <p className="text-blue-700 dark:text-blue-400 ml-4">Include design requirements, technical stack, or performance needs if relevant.</p>
              </div>

              <div className="pt-2 border-t border-blue-200 dark:border-blue-700">
                <p className="text-blue-900 dark:text-blue-300">
                  <strong>💡 Tip:</strong> The more features you list (up to 15), the more epics will be generated. Each numbered feature = 1 epic!
                </p>
              </div>
            </div>
          </details>
        </div>

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
          Number of epics generated will match the number of features in your description (3-15 epics). Each epic includes user stories, acceptance criteria, and test cases.
        </p>
      </div>
    </div>
  );
}
