import { useParams, useNavigate, Link } from 'react-router-dom';
import { useEffect } from 'react';
import { useProjects } from '../../hooks/useProjects';
import { ArrowLeft, Columns3 } from 'lucide-react';

const statusConfig = {
  'epics-ready': { label: 'Epics Ready', color: 'bg-blue-100 text-blue-700' },
  'stories-ready': { label: 'Stories Ready', color: 'bg-purple-100 text-purple-700' },
  assigned: { label: 'Assigned', color: 'bg-yellow-100 text-yellow-700' },
  synced: { label: 'Synced to Jira', color: 'bg-green-100 text-green-700' },
};

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const { getProject, isLoaded } = useProjects();
  const navigate = useNavigate();
  const project = getProject(projectId);

  useEffect(() => {
    if (isLoaded && !project) navigate('/projects');
  }, [isLoaded, project, navigate]);

  if (!isLoaded || !project) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const cfg = statusConfig[project.status] || { label: project.status, color: 'bg-gray-100 text-gray-600' };
  const totalStories = project.epics?.reduce((s, e) => s + (e.stories?.length || 0), 0) || 0;

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <Link to="/projects" className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" />
        Back to Projects
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {project.epics?.length || 0} epics · {totalStories} stories
          </p>
        </div>
        <div className="flex items-center gap-2">
          {project.status === 'synced' && (
            <Link
              to={`/projects/${projectId}/kanban`}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              <Columns3 className="h-4 w-4" />
              Kanban Board
            </Link>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {(project.epics || []).map((epic) => (
          <div key={epic.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            {/* Epic Header */}
            <div className="border-b border-gray-100 bg-purple-50 px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase text-purple-600">Epic</span>
                {epic.jiraKey && (
                  <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">{epic.jiraKey}</span>
                )}
              </div>
              <h3 className="mt-1 font-semibold text-gray-900">{epic.title}</h3>
              <p className="mt-0.5 text-sm text-gray-600">{epic.description}</p>
            </div>

            {/* Stories */}
            <div className="divide-y divide-gray-50 px-5">
              {(epic.stories || []).map((story) => (
                <div key={story.id} className="py-3 pl-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold uppercase text-blue-600">Story</span>
                    {story.storyPoints && (
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600">
                        {story.storyPoints} SP
                      </span>
                    )}
                    {story.jiraKey && (
                      <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">{story.jiraKey}</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm font-medium text-gray-900">{story.title}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{story.description}</p>
                </div>
              ))}
              {(!epic.stories || epic.stories.length === 0) && (
                <p className="py-3 text-sm text-gray-400">No stories yet.</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
