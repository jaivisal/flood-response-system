import React from 'react';
import { motion } from 'framer-motion';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'blue' | 'white' | 'gray';
  className?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
};

const colorClasses = {
  blue: 'border-blue-600',
  white: 'border-white',
  gray: 'border-gray-600',
};

export default function LoadingSpinner({ 
  size = 'md', 
  color = 'blue', 
  className = '' 
}: LoadingSpinnerProps) {
  return (
    <motion.div
      className={`inline-block ${sizeClasses[size]} ${className}`}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
    >
      <div className={`${sizeClasses[size]} border-2 ${colorClasses[color]} border-t-transparent rounded-full`} />
    </motion.div>
  );
}