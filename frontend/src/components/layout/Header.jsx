import { useWorkflow } from '../../context/WorkflowContext';
import { Sparkles } from 'lucide-react';

export default function Header() {
  const { reset } = useWorkflow();

  const handleReset = () => {
    if (confirm('Are you sure you want to start over? All progress will be lost.')) {
      reset();
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-[#050505]/70 backdrop-blur-2xl">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-accent-cyan via-purple to-accent-lime p-[1px]">
            <div className="w-full h-full rounded-[11px] bg-[#0a0a0a] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-accent-cyan" />
            </div>
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white tracking-tight leading-tight">
              Epic & Dev Assignment
            </h1>
            <p className="text-[11px] font-mono text-white/30 tracking-wide uppercase">
              AI-Powered Workflow
            </p>
          </div>
        </div>
        <button
          onClick={handleReset}
          className="text-xs py-2 px-4 rounded-lg border border-transparent text-danger/70
                   hover:bg-danger/10 hover:border-danger/20 hover:text-danger transition-all duration-300"
        >
          Reset
        </button>
      </div>
      <div className="divider-glow" />
    </header>
  );
}
