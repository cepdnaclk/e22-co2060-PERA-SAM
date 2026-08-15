import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import sidebarBg from '@/assets/hero-bg-industrial.png';
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
    
    const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
    const isCompany = user?.role === 'company';

    useEffect(() => {
        if (!user || !isCompany) return;

        const fetchPendingCount = async () => {
            const { count } = await supabase
                .from('repair_requests')
                .select('*', { count: 'exact', head: true })
                .eq('company_id', user.id)
                .eq('status', 'pending');
            
            if (count !== null) setPendingRequestsCount(count);
        };

        fetchPendingCount();

        const channel = supabase
            .channel('layout-requests-updates')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'repair_requests',
                    filter: `company_id=eq.${user.id}`,
                },
                () => {
                    fetchPendingCount();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, isCompany]);

    const normalUserNav = [
        {
            group: 'Overview',
            items: [
                { icon: Home, label: 'Home', path: '/dashboard' },
                { icon: LayoutDashboard, label: 'Analysis', path: '/dashboard/analysis' },
                { icon: History, label: 'History', path: '/dashboard/history' },
            ]
        },
        {
            group: 'Services',
            items: [
                { icon: MessageSquare, label: 'My Requests', path: '/dashboard/requests' },
                { icon: Map, label: 'Find Services', path: '/dashboard/map' },
            ]
        },
        {
            group: 'Preferences',
            items: [
                { icon: Settings, label: 'Settings', path: '/dashboard/settings' },
                { icon: Info, label: 'About', path: '/dashboard/about' },
            ]
        }
    ];

    const companyUserNav = [
        {
            group: 'Overview',
            items: [
                { icon: Home, label: 'Home', path: '/dashboard' },
                { icon: LayoutDashboard, label: 'Analysis', path: '/dashboard/analysis' },
                { icon: History, label: 'History', path: '/dashboard/history' },
            ]
        },
        {
            group: 'Management',
            items: [
                { icon: MessageSquare, label: 'Requests', path: '/dashboard/requests' },
                { icon: Calendar, label: 'Appointments', path: '/dashboard/appointments' },
                { icon: Map, label: 'Service Map', path: '/dashboard/map' },
            ]
        },
        {
            group: 'Preferences',
            items: [
                { icon: Settings, label: 'Settings', path: '/dashboard/settings' },
                { icon: Info, label: 'About', path: '/dashboard/about' },
            ]
        }
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
                className={`fixed inset-y-0 left-0 z-50 border-r border-white/10 transform transition-all duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    } ${isMinimized ? 'w-20' : 'w-64'}`}
                style={{
                    backgroundImage: `linear-gradient(rgba(10, 15, 30, 0.88), rgba(10, 15, 30, 0.88)), url(${sidebarBg})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                }}
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
                            className="hidden lg:block p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                            title={isMinimized ? "Expand Sidebar" : "Minimize Sidebar"}
                        >
                            {isMinimized ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
                        </button>
                    </div>

                    {/* User Info */}
                    <div className="px-4 mb-6">
                        <div className={`flex items-center gap-3 p-2 bg-white/5 backdrop-blur-sm rounded-xl overflow-hidden ${isMinimized ? 'justify-center' : ''}`}>
                            <div className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden">
                                {user?.avatarUrl ? (
                                    <img
                                        src={user.avatarUrl}
                                        alt={user.name}
                                        className="w-full h-full object-cover rounded-lg"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-white/10 flex items-center justify-center rounded-lg">
                                        {user?.role === 'company' ? (
                                            <Building2 className="h-5 w-5 text-white/70" />
                                        ) : (
                                            <User className="h-5 w-5 text-white/70" />
                                        )}
                                    </div>
                                )}
                            </div>
                            {!isMinimized && (
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-white truncate">
                                        {user?.name}
                                    </p>
                                    <p className="text-[10px] text-white/60 font-medium uppercase tracking-wider truncate">
                                        {user?.role === 'company' ? 'Service Provider' : 'Normal User'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-4 space-y-6 overflow-y-auto">
                        {navItems.map((group) => (
                            <div key={group.group} className="space-y-1.5">
                                {!isMinimized && (
                                    <h3 className="px-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                        {group.group}
                                    </h3>
                                )}
                                <div className="space-y-1">
                                    {group.items.map((item) => {
                                        const isActive = location.pathname === item.path ||
                                            (item.path !== '/dashboard' && location.pathname.startsWith(item.path));

                                        return (
                                            <Link
                                                key={item.path}
                                                to={item.path}
                                                onClick={() => setSidebarOpen(false)}
                                                className={`flex items-center gap-3 p-2.5 rounded-xl transition-all duration-200 group ${isActive
                                                    ? 'bg-white/10 text-white backdrop-blur-sm shadow-sm'
                                                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                                                    } ${isMinimized ? 'justify-center px-0' : ''}`}
                                                title={isMinimized ? item.label : ''}
                                            >
                                                <item.icon className={`h-5 w-5 flex-shrink-0 transition-transform ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-white group-hover:scale-105'}`} />
                                                {!isMinimized && <span className="font-medium text-sm whitespace-nowrap">{item.label}</span>}
                                                
                                                {/* Notification Badge */}
                                                {isCompany && item.path === '/dashboard/requests' && pendingRequestsCount > 0 && (
                                                    <div className="ml-auto flex items-center justify-center">
                                                        {isMinimized ? (
                                                            <div className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full animate-pulse" />
                                                        ) : (
                                                            <span className="bg-destructive text-destructive-foreground text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                                                                {pendingRequestsCount} New
                                                                </span>
                                                        )}
                                                    </div>
                                                )}

                                                {isActive && !isMinimized && !(isCompany && item.path === '/dashboard/requests' && pendingRequestsCount > 0) && (
                                                    <ChevronRight className="h-4 w-4 ml-auto text-white/50" />
                                                )}
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </nav>

                    {/* Logout */}
                    <div className="p-4 border-t border-white/10">
                        <button
                            onClick={handleLogout}
                            className={`flex items-center gap-3 p-2.5 w-full rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-all duration-200 ${isMinimized ? 'justify-center px-0' : ''}`}
                            title={isMinimized ? "Sign Out" : ""}
                        >
                            <LogOut className="h-5 w-5 text-gray-400 group-hover:text-white" />
                            {!isMinimized && <span className="font-medium text-sm">Sign Out</span>}
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
