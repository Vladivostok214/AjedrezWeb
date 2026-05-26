import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className={`glass-panel p-6 rounded-2xl transition-all duration-300 ${className}`}>
      {children}
    </div>
  );
};
