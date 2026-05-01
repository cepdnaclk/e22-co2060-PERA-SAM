import { useEffect, useState } from 'react';
import { Activity, Waves, Cpu, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface WelcomeScreenProps {
    onComplete: () => void;
}

export const WelcomeScreen = ({ onComplete }: WelcomeScreenProps) => {
    const [step, setStep] = useState(0);

    useEffect(() => {
        const timers = [
            setTimeout(() => setStep(1), 800),
            setTimeout(() => setStep(2), 1800),
            setTimeout(() => setStep(3), 2800),
            setTimeout(() => setStep(4), 3800),
            setTimeout(() => onComplete(), 5000),
        ];

        return () => timers.forEach(clearTimeout);
    }, [onComplete]);

    return (
        <div className="fixed inset-0 bg-[#0f172a] z-50 flex items-center justify-center overflow-hidden">
            {/* Dynamic Sound Wave Particle Background */}
            <div className="absolute inset-0 opacity-20">
                {[...Array(40)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute bg-accent rounded-full"
                        initial={{
                            x: Math.random() * window.innerWidth,
                            y: Math.random() * window.innerHeight,
                            width: Math.random() * 4 + 1,
                            height: Math.random() * 4 + 1,
                            opacity: 0
                        }}
                        animate={{
                            y: [null, Math.random() * window.innerHeight],
                            x: [null, Math.random() * window.innerWidth],
                            opacity: [0, 0.8, 0],
                            scale: [1, 2, 0.5],
                        }}
                        transition={{
                            duration: Math.random() * 5 + 5,
                            repeat: Infinity,
                            ease: "linear",
                        }}
                    />
                ))}

                {/* Central Pulse Ring */}
                <motion.div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent/30"
                    animate={{
                        width: [200, 800],
                        height: [200, 800],
                        opacity: [0.5, 0],
                        borderWidth: [4, 1]
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeOut" }}
                />
                <motion.div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent/20"
                    animate={{
                        width: [0, 600],
                        height: [0, 600],
                        opacity: [0.8, 0]
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeOut", delay: 1.5 }}
                />
            </div>

            <div className="relative z-10 text-center px-4">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={step}
                        initial={{ opacity: 0, scale: 0.8, filter: "blur(10px)" }}
                        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                        exit={{ opacity: 0, scale: 1.2, filter: "blur(10px)" }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className="flex flex-col items-center"
                    >
                        {step === 0 && (
                            <div className="relative group">
                                <motion.div
                                    className="absolute inset-0 bg-accent/40 rounded-full blur-3xl"
                                    animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.6, 0.3] }}
                                    transition={{ duration: 3, repeat: Infinity }}
                                />
                                <div className="relative bg-accent rounded-full p-8 shadow-glow-lg transition-transform duration-300 group-hover:scale-110">
                                    <Activity className="h-24 w-24 text-white animate-pulse" />
                                </div>
                            </div>
                        )}

                        {step === 1 && (
                            <div className="space-y-4">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: "100%" }}
                                    className="h-1 bg-accent mx-auto rounded-full shadow-glow"
                                />
                                <h1 className="text-6xl font-black text-white tracking-tighter uppercase italic">
                                    PERA<span className="text-accent">-</span>SAM
                                </h1>
                                <p className="text-accent font-mono tracking-[0.3em] text-sm uppercase">
                                    Acoustic Intelligence Systems
                                </p>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="flex flex-col items-center gap-8">
                                <div className="flex items-end gap-2 h-20">
                                    {[...Array(12)].map((_, i) => (
                                        <motion.div
                                            key={i}
                                            className="w-3 bg-accent rounded-full"
                                            animate={{ height: [20, 80, 20, 60, 20] }}
                                            transition={{
                                                duration: 1,
                                                repeat: Infinity,
                                                delay: i * 0.1,
                                                ease: "easeInOut"
                                            }}
                                        />
                                    ))}
                                </div>
                                <div className="space-y-2">
                                    <span className="text-white text-2xl font-light tracking-widest uppercase">Initializing Audio Engine</span>
                                    <div className="flex justify-center gap-1 opacity-50">
                                        <span className="animate-bounce delay-0 w-1 h-1 bg-white rounded-full"></span>
                                        <span className="animate-bounce delay-150 w-1 h-1 bg-white rounded-full"></span>
                                        <span className="animate-bounce delay-300 w-1 h-1 bg-white rounded-full"></span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="flex flex-col items-center gap-6">
                                <motion.div
                                    initial={{ scale: 0, rotate: -180 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{ type: "spring", damping: 10, stiffness: 100 }}
                                    className="bg-success rounded-full p-6 shadow-glow"
                                >
                                    <CheckCircle className="h-20 w-20 text-white" />
                                </motion.div>
                                <div className="text-center">
                                    <h2 className="text-4xl font-bold text-white mb-2">Diagnostic Ready</h2>
                                    <p className="text-white/60">Your workspace has been calibrated.</p>
                                </div>
                            </div>
                        )}

                        {step >= 4 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex flex-col items-center gap-4"
                            >
                                <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-accent"
                                        initial={{ width: 0 }}
                                        animate={{ width: "100%" }}
                                        transition={{ duration: 1 }}
                                    />
                                </div>
                                <span className="text-white/40 font-mono text-xs uppercase tracking-widest">
                                    Entering Dashboard
                                </span>
                            </motion.div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};

