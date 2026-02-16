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
            setTimeout(() => setStep(1), 500),
            setTimeout(() => setStep(2), 1200),
            setTimeout(() => setStep(3), 1900),
            setTimeout(() => setStep(4), 2600),
            setTimeout(() => onComplete(), 3500),
        ];

        return () => timers.forEach(clearTimeout);
    }, [onComplete]);

    return (
        <div className="fixed inset-0 bg-primary z-50 flex items-center justify-center overflow-hidden">
            {/* Animated background */}
            <div className="absolute inset-0 overflow-hidden">
                {[...Array(20)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-1 bg-accent/20"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{
                            height: Math.random() * 100 + 50,
                            opacity: [0, 0.5, 0],
                            y: [window.innerHeight, -100],
                        }}
                        transition={{
                            duration: 2,
                            delay: Math.random() * 2,
                            repeat: Infinity,
                            ease: "linear",
                        }}
                        style={{
                            left: `${Math.random() * 100}%`,
                        }}
                    />
                ))}
            </div>

            <div className="relative z-10 text-center">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={step}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.1 }}
                        transition={{ duration: 0.3 }}
                        className="flex flex-col items-center"
                    >
                        {step === 0 && (
                            <div className="relative">
                                <motion.div
                                    className="absolute inset-0 bg-accent/30 rounded-3xl blur-2xl"
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                />
                                <div className="relative bg-accent rounded-3xl p-6">
                                    <Activity className="h-20 w-20 text-accent-foreground" />
                                </div>
                            </div>
                        )}

                        {step === 1 && (
                            <>
                                <h1 className="text-5xl font-bold text-primary-foreground mb-4">
                                    PERA-SAM
                                </h1>
                                <p className="text-primary-foreground/70 text-xl">
                                    Sound Analysis Manager
                                </p>
                            </>
                        )}

                        {step === 2 && (
                            <div className="flex items-center gap-6">
                                <motion.div
                                    animate={{ scale: [1, 1.1, 1] }}
                                    transition={{ duration: 0.8, repeat: Infinity }}
                                >
                                    <Waves className="h-10 w-10 text-accent" />
                                </motion.div>
                                <span className="text-primary-foreground text-xl">Analyzing Sounds</span>
                                <motion.div
                                    animate={{ scale: [1, 1.1, 1] }}
                                    transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }}
                                >
                                    <Cpu className="h-10 w-10 text-accent" />
                                </motion.div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="flex flex-col items-center gap-4">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1, rotate: 360 }}
                                    transition={{ type: "spring", stiffness: 200 }}
                                >
                                    <CheckCircle className="h-16 w-16 text-success" />
                                </motion.div>
                                <p className="text-primary-foreground text-xl">Welcome aboard!</p>
                            </div>
                        )}

                        {step >= 4 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-primary-foreground/50"
                            >
                                Loading your dashboard...
                            </motion.div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};
