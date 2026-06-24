import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Button } from "./ui/button";

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-background p-6">
                    <div className="glass-card max-w-md w-full p-8 rounded-2xl text-center space-y-6 border-2 border-destructive/20">
                        <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
                            <AlertTriangle className="h-8 w-8 text-destructive" />
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-2xl font-bold text-foreground">Something went wrong</h1>
                            <p className="text-muted-foreground text-sm">
                                The application encountered an unexpected error. This might be due to a loading issue or a missing dependency.
                            </p>
                        </div>
                        {this.state.error && (
                            <div className="p-4 bg-muted/50 rounded-lg text-left overflow-auto max-h-32">
                                <p className="text-xs font-mono text-destructive">
                                    {this.state.error.message}
                                </p>
                            </div>
                        )}
                        <Button
                            variant="hero"
                            className="w-full"
                            onClick={() => window.location.reload()}
                        >
                            <RefreshCcw className="h-4 w-4 mr-2" />
                            Reload Page
                        </Button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
