import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  FolderKanban,
  PlusCircle,
  Zap,
  Users,
  LayoutDashboard,
  Columns3,
  BarChart3,
  Settings,
  LogOut,
  ChevronRight,
} from 'lucide-react';

const navSections = [
  {
    label: 'AI Workflow',
    items: [
      { to: '/projects', label: 'Projects', icon: FolderKanban, end: true },
      { to: '/projects/new', label: 'New Project', icon: PlusCircle },
      { to: '/developers', label: 'Developers', icon: Users },
    ],
  },
  {
    label: 'Sprint Monitoring',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/kanban', label: 'Kanban', icon: Columns3 },
      { to: '/reports', label: 'Reports', icon: BarChart3 },
    ],
  },
];

function NavItem({ to, label, icon: Icon, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          isActive
            ? 'bg-blue-50 text-blue-700'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`
      }
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      {label}
    </NavLink>
  );
}

export default function Sidebar() {
  const { logout } = useAuth();

  return (
    <aside className="flex h-screen w-56 flex-shrink-0 flex-col border-r border-gray-200" style={{ background: '#ffffff' }}>
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 border-b border-gray-200 px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600">
          <Zap className="h-4 w-4 text-white" />
        </div>
        <span className="text-sm font-semibold text-gray-900">Focus Flow</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navSections.map((section) => (
          <div key={section.label} className="mb-5">
            <p className="mb-1.5 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavItem key={item.to} {...item} />
              ))}
            </div>
          </div>
        ))}

        <div className="mb-1.5">
          <p className="mb-1.5 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Account
          </p>
          <div className="space-y-0.5">
            <NavItem to="/settings" label="Settings" icon={Settings} />
          </div>
        </div>
      </nav>

      {/* Logout */}
      <div className="border-t border-gray-200 p-3">
        <button
          onClick={logout}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          Logout
        </button>
      </div>
    </aside>
  );
}
