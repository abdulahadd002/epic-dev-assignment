import { useJira } from '../../context/JiraContext';
import { useSprintIssues } from '../../hooks/useSprintData';
import { useKanbanBoard } from '../../hooks/useKanbanBoard';
import KanbanBoard from '../../components/kanban/KanbanBoard';
import FilterBar from '../../components/kanban/FilterBar';
import SprintSelector from '../../components/reports/SprintSelector';

export default function Kanban() {
  const { sprints, selectedSprintId, setSelectedSprintId } = useJira();
  const { issues, isLoading } = useSprintIssues(selectedSprintId);
  const kanban = useKanbanBoard(issues);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kanban Board</h1>
          <p className="mt-1 text-sm text-gray-500">Drag and drop to move issues between columns</p>
        </div>
        <div className="w-56 flex-shrink-0">
          <SprintSelector sprints={sprints} selectedId={selectedSprintId} onSelect={setSelectedSprintId} />
        </div>
      </div>

      <FilterBar
        search={kanban.search} setSearch={kanban.setSearch}
        assigneeFilter={kanban.assigneeFilter} setAssigneeFilter={kanban.setAssigneeFilter} assignees={kanban.assignees}
        priorityFilter={kanban.priorityFilter} setPriorityFilter={kanban.setPriorityFilter} priorities={kanban.priorities}
        typeFilter={kanban.typeFilter} setTypeFilter={kanban.setTypeFilter} types={kanban.types}
        onClear={kanban.clearFilters}
      />

      <div className="mt-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
        ) : (
          <KanbanBoard kanban={kanban} />
        )}
      </div>
    </div>
  );
}
