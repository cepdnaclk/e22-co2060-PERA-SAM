import { Activity } from 'lucide-react';

interface LogoProps {
    size?: 'sm' | 'md' | 'lg' | 'xl';
    showText?: boolean;
    className?: string;
}

const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
};

const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-4xl',
};

export function Logo({ size = 'md', showText = true, className = '' }: LogoProps) {
    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <div className="relative">
                <div className="absolute inset-0 bg-accent/20 rounded-lg blur-md" />
                <div className="relative bg-accent rounded-lg p-1.5 flex items-center justify-center">
                    <Activity className={`${sizeClasses[size]} text-accent-foreground`} />
                </div>
            </div>
            {showText && (
                <div className="flex flex-col">
                    <span className={`${textSizeClasses[size]} font-bold tracking-tight text-foreground`}>
                        PERA-SAM
                    </span>
                    {size !== 'sm' && (
                        <span className="text-xs text-muted-foreground -mt-1">
                            Sound Analysis Manager
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
