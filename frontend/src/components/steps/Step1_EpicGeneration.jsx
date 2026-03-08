import { useState } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import { motion } from 'framer-motion';
import { Zap, ChevronRight, Loader2 } from 'lucide-react';
import SpotlightCard from '../shared/SpotlightCard';

const exampleProjects = [
  "Build a fitness tracking mobile application with workout logging, nutrition tracking, and progress analytics",
  "Create a project management system with task tracking, team collaboration, and reporting features",
  "Develop an e-commerce platform with product catalog, shopping cart, payment integration, and order management",
  "Build a social media dashboard with post scheduling, analytics, and multi-platform integration",
  "Create a healthcare patient management system with appointments, medical records, and billing"
];

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } }
};
const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } }
};

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

      const text = await response.text();
      if (!text) throw new Error('Empty response from server. The AI generation may have timed out — please try again.');
      let data;
      try { data = JSON.parse(text); } catch { throw new Error('Invalid response from server. Please try again.'); }

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
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Hero */}
      <div className="text-center mb-2">
        <h2 className="gradient-text-animated inline-block">Generate Epic Documentation</h2>
        <p className="text-white/40 text-sm mt-2 max-w-lg mx-auto">
          Describe your project and AI will generate comprehensive epics, user stories, acceptance criteria, and test cases.
        </p>
      </div>

      {/* Main card */}
      <SpotlightCard className="p-6 space-y-6">
        {/* Guide */}
        <details className="group">
          <summary className="cursor-pointer text-sm font-medium text-accent-cyan/80 flex items-center gap-2 hover:text-accent-cyan transition-colors">
            <ChevronRight className="w-4 h-4 group-open:rotate-90 transition-transform duration-200" />
            How to write an effective project description
          </summary>
          <div className="mt-4 space-y-4 text-sm text-white/50">
            <div>
              <span className="text-white/70 font-medium">1. Project Overview</span>
              <p className="mt-1 ml-4">Start with 1-3 sentences describing your application's purpose.</p>
              <code className="block ml-4 mt-1.5 text-xs font-mono p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-accent-lime/80">
                "Create a modern fitness tracking web app that helps users monitor their daily health..."
              </code>
            </div>
            <div>
              <span className="text-white/70 font-medium">2. Core Features</span>
              <p className="mt-1 ml-4">List main features as numbered items. Each feature = 1 epic.</p>
              <code className="block ml-4 mt-1.5 text-xs font-mono p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-accent-lime/80 whitespace-pre">{`1. User Authentication - accounts, login, OAuth
2. Dashboard - overview, analytics, stats
3. Workout Logging - exercises, sets, history`}</code>
            </div>
            <div>
              <span className="text-white/70 font-medium">3. Feature Details</span>
              <p className="mt-1 ml-4">Add bullet points under each feature for specific requirements.</p>
            </div>
            <div className="pt-3 border-t border-white/[0.06]">
              <p className="text-accent-cyan/60 text-xs font-mono">
                TIP: More features (up to 15) = more epics generated. Each numbered feature = 1 epic.
              </p>
            </div>
          </div>
        </details>

        {/* Textarea */}
        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-white/30 mb-2">
            Project Description
          </label>
          <textarea
            value={projectDescription}
            onChange={(e) => setProjectDescription(e.target.value)}
            placeholder="Build a modern task management application with real-time collaboration, notifications, and analytics..."
            className="input-dark w-full h-40 resize-none"
            disabled={loading}
          />
        </div>

        {/* Examples */}
        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-white/30 mb-3">
            Quick Start Templates
          </label>
          <motion.div
            className="grid gap-2"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            {exampleProjects.map((example, index) => (
              <motion.button
                key={index}
                variants={itemVariants}
                onClick={() => setProjectDescription(example)}
                className="w-full text-left px-4 py-3 rounded-xl text-sm text-white/50
                         bg-white/[0.02] border border-white/[0.04]
                         hover:bg-white/[0.05] hover:border-white/[0.1] hover:text-white/70
                         transition-all duration-300"
                disabled={loading}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.99 }}
              >
                {example}
              </motion.button>
            ))}
          </motion.div>
        </div>

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-xl bg-danger/10 border border-danger/20"
          >
            <p className="text-danger text-sm">{error}</p>
          </motion.div>
        )}

        {/* Generate button */}
        <motion.button
          onClick={handleGenerate}
          disabled={loading || !projectDescription.trim()}
          className="btn-accent w-full flex items-center justify-center gap-2 text-sm"
          whileTap={{ scale: 0.98 }}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Generating epics...</span>
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Generate Epics
            </span>
          )}
        </motion.button>

        <p className="text-center text-xs text-white/25">
          Generates 3-15 epics based on features described. Each epic includes user stories, acceptance criteria, and test cases.
        </p>
      </SpotlightCard>
    </div>
  );
}
