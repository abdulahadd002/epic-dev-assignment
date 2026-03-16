import { useParams, useNavigate, Link } from 'react-router-dom';
import { useEffect, useMemo } from 'react';
import { useProjects } from '../../hooks/useProjects';
import { ArrowLeft, Columns3 } from 'lucide-react';

const columns = [
  { id: 'todo', label: 'To Do', color: 'bg-gray-100 border-gray-300', dot: 'bg-gray-400' },
  { id: 'in-progress', label: 'In Progress', color: 'bg-blue-50 border-blue-300', dot: 'bg-blue-500' },
  { id: 'done', label: 'Done', color: 'bg-green-50 border-green-300', dot: 'bg-green-500' },
];

function mapStatus(story) {
  if (story.status === 'rejected') return null; // hide rejected
  if (story.status === 'done') return 'done';
  if (story.status === 'in-progress') return 'in-progress';
  return 'todo'; // approved, pending, or any other
}

export default function ProjectKanbanPage() {
  const { projectId } = useParams();
  const { getProject, isLoaded } = useProjects();
  const navigate = useNavigate();
  const project = getProject(projectId);

  useEffect(() => {
    if (isLoaded && !project) navigate('/projects');
  }, [isLoaded, project, navigate]);

  // Build assignment lookup
  const assignmentMap = useMemo(() => {
    const map = {};
    if (project?.assignments) {
      for (const a of project.assignments) {
        map[a.epic_id || a.epicId] = a.assigned_developer || a.developer;
      }
    }
    return map;
  }, [project?.assignments]);

  // Flatten all approved stories with their epic context
  const cards = useMemo(() => {
    if (!project?.epics) return [];
    const items = [];
    for (const epic of project.epics) {
      if (epic.status === 'rejected') continue;
      for (const story of epic.stories || []) {
        const col = mapStatus(story);
        if (!col) continue;
        items.push({
          id: story.id,
          title: story.title,
          epicTitle: epic.title,
          epicId: epic.id,
          storyPoints: story.storyPoints,
          jiraKey: story.jiraKey,
          epicJiraKey: epic.jiraKey,
          assignee: assignmentMap[epic.id] || null,
          column: col,
        });
      }
    }
    return items;
  }, [project?.epics, assignmentMap]);

  if (!isLoaded || !project) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="px-6 py-8">
      <Link to={`/projects/${projectId}`} className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" />
        Back to Project
      </Link>

      <div className="mb-6 flex items-center gap-3">
        <Columns3 className="h-5 w-5 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">{project.name} — Kanban</h1>
      </div>

      {cards.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <p className="text-gray-500">No stories to display. Approve epics and stories first.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {columns.map((col) => {
            const colCards = cards.filter((c) => c.column === col.id);
            return (
              <div key={col.id} className={`rounded-xl border p-4 ${col.color}`}>
                <div className="mb-3 flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${col.dot}`} />
                  <h2 className="text-sm font-semibold text-gray-700">{col.label}</h2>
                  <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-xs font-medium text-gray-600 shadow-sm">
                    {colCards.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {colCards.map((card) => (
                    <div key={card.id} className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
                      <p className="text-sm font-medium text-gray-900">{card.title}</p>
                      <p className="mt-0.5 text-xs text-purple-600">{card.epicTitle}</p>
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        {card.storyPoints && (
                          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600">
                            {card.storyPoints} SP
                          </span>
                        )}
                        {card.jiraKey && (
                          <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700">
                            {card.jiraKey}
                          </span>
                        )}
                        {card.assignee && (
                          <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700">
                            {card.assignee}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {colCards.length === 0 && (
                    <p className="py-4 text-center text-xs text-gray-400">No items</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
