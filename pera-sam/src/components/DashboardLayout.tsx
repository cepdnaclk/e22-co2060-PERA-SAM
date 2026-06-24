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
    PanelLeftClose,
    PanelLeftOpen,
    History,
} from 'lucide-react';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const normalUserNav = [
        { icon: Home, label: 'Home', path: '/dashboard' },
        { icon: LayoutDashboard, label: 'Analysis', path: '/dashboard/analysis' },
        { icon: History, label: 'History', path: '/dashboard/history' },
        { icon: Map, label: 'Find Services', path: '/dashboard/map' },
        { icon: Settings, label: 'Settings', path: '/dashboard/settings' },
        { icon: Info, label: 'About', path: '/dashboard/about' },
    ];

    const companyUserNav = [
        { icon: Home, label: 'Home', path: '/dashboard' },
        { icon: LayoutDashboard, label: 'Analysis', path: '/dashboard/analysis' },
        { icon: History, label: 'History', path: '/dashboard/history' },
        { icon: MessageSquare, label: 'Requests', path: '/dashboard/requests' },
        { icon: Calendar, label: 'Appointments', path: '/dashboard/appointments' },
        { icon: Map, label: 'Service Map', path: '/dashboard/map' },
        { icon: Settings, label: 'Settings', path: '/dashboard/settings' },
        { icon: Info, label: 'About', path: '/dashboard/about' },
    ];

    const navItems = user?.role === 'company' ? companyUserNav : normalUserNav;

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-background flex">
            {/* Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 bg-[#000000] border-r border-sidebar-border transform transition-all duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    } ${isMinimized ? 'w-20' : 'w-64'}`}
            >
                <div className="flex flex-col h-full">
                    {/* Logo & Toggle */}
                    <div className={`p-4 mb-4 flex items-center ${isMinimized ? 'flex-col gap-4' : 'justify-between'}`}>
                        {!isMinimized ? (
                            <Link to="/" className="flex items-center gap-3">
                                <div className="bg-accent p-1.5 rounded-lg">
                                    <Logo size="sm" showText={false} />
                                </div>
                                <div>
                                    <h1 className="text-lg font-black text-white tracking-tighter uppercase italic">
                                        PERA<span className="text-accent">-</span>SAM
                                    </h1>
                                    <p className="text-[8px] text-accent font-mono tracking-widest uppercase opacity-70">Acoustic Intelligence</p>
                                </div>
                            </Link>
                        ) : (
                            <div className="bg-accent p-1.5 rounded-lg">
                                <Logo size="sm" showText={false} />
                            </div>
                        )}

                        <button
                            onClick={() => setIsMinimized(!isMinimized)}
                            className="hidden lg:block p-1.5 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
                            title={isMinimized ? "Expand Sidebar" : "Minimize Sidebar"}
                        >
                            {isMinimized ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
                        </button>
                    </div>

                    {/* User Info */}
                    <div className="px-4 mb-6">
                        <div className={`flex items-center gap-3 p-2 bg-sidebar-accent/50 rounded-xl overflow-hidden ${isMinimized ? 'justify-center' : ''}`}>
                            <div className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden">
                                {user?.avatarUrl ? (
                                    <img
                                        src={user.avatarUrl}
                                        alt={user.name}
                                        className="w-full h-full object-cover rounded-lg"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-sidebar-primary flex items-center justify-center rounded-lg">
                                        {user?.role === 'company' ? (
                                            <Building2 className="h-5 w-5 text-sidebar-primary-foreground" />
                                        ) : (
                                            <User className="h-5 w-5 text-sidebar-primary-foreground" />
                                        )}
                                    </div>
                                )}
                            </div>
                            {!isMinimized && (
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-white truncate">
                                        {user?.name}
                                    </p>
                                    <p className="text-[10px] text-sidebar-foreground/40 font-medium uppercase tracking-wider truncate">
                                        {user?.role === 'company' ? 'Service Provider' : 'Normal User'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
                        {navItems.map((item) => {
                            const isActive = location.pathname === item.path ||
                                (item.path !== '/dashboard' && location.pathname.startsWith(item.path));

                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setSidebarOpen(false)}
                                    className={`flex items-center gap-3 p-2.5 rounded-xl transition-all duration-200 group ${isActive
                                        ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-accent/20'
                                        : 'text-sidebar-foreground/60 hover:text-white hover:bg-sidebar-accent'
                                        } ${isMinimized ? 'justify-center px-0' : ''}`}
                                    title={isMinimized ? item.label : ''}
                                >
                                    <item.icon className={`h-5 w-5 flex-shrink-0 transition-transform ${!isActive && 'group-hover:scale-110'}`} />
                                    {!isMinimized && <span className="font-medium whitespace-nowrap">{item.label}</span>}
                                    {isActive && !isMinimized && <ChevronRight className="h-4 w-4 ml-auto" />}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Logout */}
                    <div className="p-4 border-t border-sidebar-border">
                        <button
                            onClick={handleLogout}
                            className={`flex items-center gap-3 p-2.5 w-full rounded-xl text-sidebar-foreground/60 hover:text-white hover:bg-sidebar-accent transition-all duration-200 ${isMinimized ? 'justify-center px-0' : ''}`}
                            title={isMinimized ? "Sign Out" : ""}
                        >
                            <LogOut className="h-5 w-5" />
                            {!isMinimized && <span className="font-medium">Sign Out</span>}
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
            <main className={`flex-1 transition-all duration-300 ${isMinimized ? 'lg:ml-20' : 'lg:ml-64'}`}>
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
                    className="p-6 lg:p-8 pt-20 lg:pt-8"
                >
                    {children}
                </motion.div>
            </main>
        </div>
    );
};
