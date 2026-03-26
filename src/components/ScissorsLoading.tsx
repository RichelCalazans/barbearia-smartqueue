import { motion } from 'motion/react';
import { Scissors } from 'lucide-react';

export function ScissorsLoading() {
  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <motion.div
        animate={{
          rotate: [0, 15, -15, 0],
          scale: [1, 1.1, 1.1, 1],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="relative"
      >
        <Scissors className="h-12 w-12 text-[#00D4A5]" />
        <motion.div
          animate={{
            opacity: [0, 1, 0],
            scale: [0.5, 1.5, 0.5],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-[#00D4A5]/30"
        />
      </motion.div>
      <p className="text-sm font-medium text-[#64748B] animate-pulse">
        Preparando sua vez...
      </p>
    </div>
  );
}
