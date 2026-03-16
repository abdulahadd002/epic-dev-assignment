import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const priorityColors = {
  Blocker: 'bg-red-600',
  Critical: 'bg-red-500',
  High: 'bg-orange-500',
  Medium: 'bg-yellow-500',
  Low: 'bg-green-500',
};

const typeColors = {
  Bug: 'bg-red-100 text-red-700',
  Story: 'bg-blue-100 text-blue-700',
  Task: 'bg-gray-100 text-gray-700',
  Epic: 'bg-purple-100 text-purple-700',
  Subtask: 'bg-green-100 text-green-700',
};

export default function TaskCard({ issue }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: issue.key,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const initials = issue.assignee?.name
    ? issue.assignee.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-grab rounded-lg border border-gray-200 bg-white p-3 shadow-sm hover:shadow-md active:cursor-grabbing select-none"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-mono font-medium text-gray-500">{issue.key}</span>
        <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${typeColors[issue.issueType] || typeColors.Task}`}>
          {issue.issueType}
        </span>
      </div>

      <p className="mb-3 text-sm font-medium text-gray-900 line-clamp-2">{issue.summary}</p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${priorityColors[issue.priority] || 'bg-gray-400'}`} />
          <span className="text-xs text-gray-500">{issue.priority}</span>
          {issue.storyPoints && (
            <span className="ml-1 rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600">
              {issue.storyPoints} SP
            </span>
          )}
        </div>

        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700" title={issue.assignee?.name || 'Unassigned'}>
          {issue.assignee?.avatarUrl ? (
            <img src={issue.assignee.avatarUrl} alt={initials} className="h-6 w-6 rounded-full" />
          ) : (
            initials
          )}
        </div>
      </div>
    </div>
  );
}
