import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Home, ArrowLeft, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="text-center max-w-md"
      >
        {/* Animated 404 icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2, type: "spring", stiffness: 200 }}
          className="w-24 h-24 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <SearchX className="h-12 w-12 text-accent" />
        </motion.div>

        {/* Error code */}
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-7xl font-bold text-foreground mb-2"
        >
          404
        </motion.h1>

        {/* Message */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <p className="text-xl font-semibold text-foreground mb-2">
            Page not found
          </p>
          <p className="text-muted-foreground mb-2">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <p className="text-sm text-muted-foreground/70 mb-8 font-mono">
            {location.pathname}
          </p>
        </motion.div>

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col sm:flex-row gap-3 justify-center"
        >
          <Link to="/">
            <Button variant="accent" className="w-full sm:w-auto">
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          </Link>
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default NotFound;
