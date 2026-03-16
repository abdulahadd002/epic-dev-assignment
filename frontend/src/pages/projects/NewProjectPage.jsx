import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useProjects } from '../../hooks/useProjects';
import { ArrowLeft, Sparkles, Loader2 } from 'lucide-react';

function transformEpics(rawEpics) {
  return (rawEpics || []).map((epic) => ({
    id: epic.epic_id || epic.id || crypto.randomUUID(),
    title: epic.epic_title || epic.title || 'Untitled Epic',
    description: epic.description || '',
    status: 'pending',
    jiraKey: null,
    stories: (epic.user_stories || epic.stories || []).map((story) => ({
      id: story.story_id || story.id || crypto.randomUUID(),
      title: story.story_title || story.title || 'Untitled Story',
      description: story.description || '',
      acceptanceCriteria: story.acceptance_criteria || story.acceptanceCriteria || '',
      storyPoints: parseInt(story.story_points || story.storyPoints) || 5,
      status: 'pending',
      jiraKey: null,
    })),
  }));
}

export default function NewProjectPage() {
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const { addProject } = useProjects();
  const navigate = useNavigate();

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const isValid = name.trim().length > 0 && wordCount >= 200;

  const handleAnalyze = async () => {
    if (!isValid) return;
    setIsAnalyzing(true);
    setError('');

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: text }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Analysis failed');
      }

      const data = await res.json();

      if (data.success === false) {
        throw new Error(data.error || 'Generation failed');
      }

      // Flask returns { success, result: { epics: [...] }, raw_output, generator_used }
      const projectId = data.projectId || crypto.randomUUID();
      const rawEpics = data.result?.epics || data.epics || [];
      const epics = transformEpics(rawEpics);

      const project = {
        id: projectId,
        name: name.trim(),
        rawText: text,
        createdAt: new Date().toISOString(),
        status: 'stories-ready',
        epics,
      };

      addProject(project);
      navigate(`/projects/${projectId}`);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Link
        to="/projects"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Projects
      </Link>

      <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Create New Project</h1>
        <p className="mt-2 text-sm text-gray-500">
          Paste your raw requirements text and let AI generate structured Epics and User Stories.
        </p>

        <div className="mt-6 space-y-5">
          <div>
            <label htmlFor="project-name" className="block text-sm font-medium text-gray-700">
              Project Name
            </label>
            <input
              id="project-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., E-Commerce Platform"
              disabled={isAnalyzing}
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="raw-text" className="block text-sm font-medium text-gray-700">
                Raw Requirements Text
              </label>
              <span className={`text-xs font-medium ${wordCount >= 200 ? 'text-green-600' : 'text-gray-400'}`}>
                {wordCount} / 200 words minimum
              </span>
            </div>
            <textarea
              id="raw-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste your meeting notes, project briefs, feature descriptions, or any raw requirements text here... (minimum 200 words)"
              rows={14}
              disabled={isAnalyzing}
              className="mt-1 w-full resize-y rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50"
            />
          </div>

          {/* Progress bar */}
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-full rounded-full transition-all duration-300 ${wordCount >= 200 ? 'bg-green-500' : 'bg-blue-500'}`}
              style={{ width: `${Math.min((wordCount / 200) * 100, 100)}%` }}
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <button
            onClick={handleAnalyze}
            disabled={!isValid || isAnalyzing}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating with AI...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Analyze &amp; Generate Epics
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
