import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Server,
  Bell,
  Activity,
  Settings,
  HardDrive,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Hosts', href: '/hosts', icon: Server },
  { name: 'Metrics', href: '/metrics', icon: Activity },
  { name: 'Alerts', href: '/alerts', icon: Bell },
  { name: 'Services', href: '/services', icon: HardDrive },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-dark-900 border-r border-dark-700 flex flex-col">
      <div className="p-6 border-b border-dark-700">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary-600 flex items-center justify-center">
            <Activity className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-dark-100">HomeLab</h1>
            <p className="text-xs text-dark-400">Infrastructure Monitor</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary-600/10 text-primary-400 border border-primary-600/20'
                  : 'text-dark-300 hover:bg-dark-800 hover:text-dark-100'
              )
            }
          >
            <item.icon className="h-5 w-5" />
            {item.name}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-dark-700">
        <div className="bg-dark-800 rounded-lg p-3">
          <div className="flex items-center gap-2 text-xs text-dark-400">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            System Online
          </div>
          <p className="text-xs text-dark-500 mt-1">
            Last updated: {new Date().toLocaleTimeString()}
          </p>
        </div>
      </div>
    </aside>
  );
}
