import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import {
    Home,
    LayoutDashboard,
    Map,
    Settings,
    Info,
    LogOut,
    Menu,
    X,
    ChevronRight,
    User,
    Building2,
    MessageSquare,
    Calendar,
} from 'lucide-react';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const normalUserNav = [
        { icon: Home, label: 'Home', path: '/dashboard' },
        { icon: LayoutDashboard, label: 'Analysis', path: '/dashboard/analysis' },
        { icon: Map, label: 'Find Services', path: '/dashboard/map' },
        { icon: Settings, label: 'Settings', path: '/dashboard/settings' },
        { icon: Info, label: 'About', path: '/dashboard/about' },
    ];

    const companyUserNav = [
        { icon: Home, label: 'Home', path: '/dashboard' },
        { icon: MessageSquare, label: 'Requests', path: '/dashboard/requests' },
        { icon: Calendar, label: 'Appointments', path: '/dashboard/appointments' },
        { icon: Map, label: 'Service Map', path: '/dashboard/map' },
        { icon: Settings, label: 'Settings', path: '/dashboard/settings' },
        { icon: Info, label: 'About', path: '/dashboard/about' },
    ];

    const navItems = user?.role === 'company' ? companyUserNav : normalUserNav;

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-background flex">
            {/* Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 w-64 bg-sidebar transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <div className="flex flex-col h-full p-4">
                    {/* Logo */}
                    <div className="mb-8 px-2">
                        <Logo size="md" />
                    </div>

                    {/* User Info */}
                    <div className="px-2 mb-6">
                        <div className="flex items-center gap-3 p-3 bg-sidebar-accent rounded-lg">
                            <div className="w-10 h-10 bg-sidebar-primary rounded-full flex items-center justify-center">
                                {user?.role === 'company' ? (
                                    <Building2 className="h-5 w-5 text-sidebar-primary-foreground" />
                                ) : (
                                    <User className="h-5 w-5 text-sidebar-primary-foreground" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-sidebar-foreground truncate">
                                    {user?.name}
                                </p>
                                <p className="text-xs text-sidebar-foreground/60 truncate">
                                    {user?.role === 'company' ? 'Service Provider' : 'Normal User'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 space-y-1">
                        {navItems.map((item) => {
                            const isActive = location.pathname === item.path ||
                                (item.path !== '/dashboard' && location.pathname.startsWith(item.path));

                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setSidebarOpen(false)}
                                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 ${isActive
                                            ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                                            : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent'
                                        }`}
                                >
                                    <item.icon className="h-5 w-5" />
                                    <span className="font-medium">{item.label}</span>
                                    {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Logout */}
                    <div className="pt-4 border-t border-sidebar-border">
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 px-4 py-2.5 w-full rounded-lg text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-200"
                        >
                            <LogOut className="h-5 w-5" />
                            <span className="font-medium">Sign Out</span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Main content */}
            <main className="flex-1 lg:ml-64">
                {/* Mobile header */}
                <header className="lg:hidden sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-4 h-16 flex items-center justify-between">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 rounded-lg hover:bg-muted"
                    >
                        <Menu className="h-6 w-6" />
                    </button>
                    <Logo size="sm" />
                    <div className="w-10" /> {/* Spacer */}
                </header>

                {/* Page content */}
                <motion.div
                    key={location.pathname}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="p-6 lg:p-8"
                >
                    {children}
                </motion.div>
            </main>
        </div>
    );
};
