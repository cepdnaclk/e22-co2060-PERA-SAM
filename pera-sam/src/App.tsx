import { Toaster } from "@/components/ui/toaster.tsx";
import { Toaster as Sonner } from "@/components/ui/sonner.tsx";
import { TooltipProvider } from "@/components/ui/tooltip.tsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth-context.tsx";
import { ProtectedRoute } from "@/components/ProtectedRoute.tsx";
import { DashboardLayout } from "@/components/DashboardLayout.tsx";
import { ErrorBoundary } from "@/components/ErrorBoundary.tsx";

// Pages
import { LandingPage } from "@/pages/LandingPage.tsx";
import { LoginPage } from "@/pages/LoginPage.tsx";
import { RegisterPage } from "@/pages/RegisterPage.tsx";
import { ForgotPasswordPage } from "@/pages/ForgotPasswordPage.tsx";
import { ResetPasswordPage } from "@/pages/ResetPasswordPage.tsx";
import { WelcomePage } from "@/pages/WelcomePage.tsx";
import { DashboardHome } from "@/pages/dashboard/DashboardHome.tsx";
import { AnalysisPage } from "@/pages/dashboard/AnalysisPage.tsx";
import { MapPage } from "@/pages/dashboard/MapPage.tsx";
import { SettingsPage } from "@/pages/dashboard/SettingsPage.tsx";
import { AboutPage } from "@/pages/dashboard/AboutPage.tsx";
import { RequestsPage } from "@/pages/dashboard/RequestsPage.tsx";
import { AppointmentsPage } from "@/pages/dashboard/AppointmentsPage.tsx";
import NotFound from "@/pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
    <QueryClientProvider client={queryClient}>
        <AuthProvider>
            <TooltipProvider>
                <Toaster />
                <Sonner />
                <ErrorBoundary>
                    <BrowserRouter>
                        <Routes>
                            {/* Public Routes */}
                            <Route path="/" element={<LandingPage />} />
                            <Route path="/login" element={<LoginPage />} />
                            <Route path="/register" element={<RegisterPage />} />

                            {/* Welcome Screen */}
                            <Route
                                path="/welcome"
                                element={
                                    <ProtectedRoute>
                                        <WelcomePage />
                                    </ProtectedRoute>
                                }
                            />

                            {/* Dashboard Routes */}
                            <Route
                                path="/dashboard"
                                element={
                                    <ProtectedRoute>
                                        <DashboardLayout>
                                            <DashboardHome />
                                        </DashboardLayout>
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/dashboard/analysis"
                                element={
                                    <ProtectedRoute>
                                        <DashboardLayout>
                                            <AnalysisPage />
                                        </DashboardLayout>
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/dashboard/map"
                                element={
                                    <ProtectedRoute>
                                        <DashboardLayout>
                                            <MapPage />
                                        </DashboardLayout>
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/dashboard/settings"
                                element={
                                    <ProtectedRoute>
                                        <DashboardLayout>
                                            <SettingsPage />
                                        </DashboardLayout>
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/dashboard/about"
                                element={
                                    <ProtectedRoute>
                                        <DashboardLayout>
                                            <AboutPage />
                                        </DashboardLayout>
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/dashboard/requests"
                                element={
                                    <ProtectedRoute>
                                        <DashboardLayout>
                                            <RequestsPage />
                                        </DashboardLayout>
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/dashboard/appointments"
                                element={
                                    <ProtectedRoute>
                                        <DashboardLayout>
                                            <AppointmentsPage />
                                        </DashboardLayout>
                                    </ProtectedRoute>
                                }
                            />

                            {/* Catch-all */}
                            <Route path="*" element={<NotFound />} />
                        </Routes>
                    </BrowserRouter>
                </ErrorBoundary>
            </TooltipProvider>
        </AuthProvider>
    </QueryClientProvider>
);

export default App;
