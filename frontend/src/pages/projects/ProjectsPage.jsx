import { Link } from 'react-router-dom';
import { useProjects } from '../../hooks/useProjects';
import { PlusCircle, FolderKanban, ChevronRight, Trash2 } from 'lucide-react';

const statusConfig = {
  'epics-ready': { label: 'Epics Ready', color: 'bg-blue-100 text-blue-700' },
  'stories-ready': { label: 'Stories Ready', color: 'bg-purple-100 text-purple-700' },
  assigned: { label: 'Assigned', color: 'bg-yellow-100 text-yellow-700' },
  synced: { label: 'Synced to Jira', color: 'bg-green-100 text-green-700' },
};

function StatusBadge({ status }) {
  const cfg = statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-600' };
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.color}`}>{cfg.label}</span>;
}

export default function ProjectsPage() {
  const { projects, isLoaded, deleteProject } = useProjects();

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="mt-1 text-sm text-gray-500">Manage your AI-generated epics and stories</p>
        </div>
        <Link
          to="/projects/new"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
        >
          <PlusCircle className="h-4 w-4" />
          New Project
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 py-16 text-center">
          <FolderKanban className="mb-4 h-12 w-12 text-gray-300" />
          <h3 className="text-base font-semibold text-gray-700">No projects yet</h3>
          <p className="mt-1 text-sm text-gray-400">Create your first project to get started</p>
          <Link
            to="/projects/new"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <PlusCircle className="h-4 w-4" />
            Create Project
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((project) => {
            const totalEpics = project.epics?.length || 0;
            const totalStories = project.epics?.reduce((s, e) => s + (e.stories?.length || 0), 0) || 0;
            const approvedEpics = project.epics?.filter((e) => e.status === 'approved').length || 0;

            return (
              <div
                key={project.id}
                className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm hover:border-blue-300 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <Link
                      to={`/projects/${project.id}`}
                      className="font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                    >
                      {project.name}
                    </Link>
                    <StatusBadge status={project.status} />
                  </div>
                  <p className="mt-1 text-xs text-gray-400">
                    {totalEpics} epic{totalEpics !== 1 ? 's' : ''} · {totalStories} stor{totalStories !== 1 ? 'ies' : 'y'} · {approvedEpics} approved
                    {project.createdAt && ` · Created ${new Date(project.createdAt).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => {
                      if (confirm(`Delete project "${project.name}"?`)) deleteProject(project.id);
                    }}
                    className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <Link
                    to={`/projects/${project.id}`}
                    className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
