import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary', 
  children, 
  className = '', 
  ...props 
}) => {
  const baseStyle = "px-4 py-2 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 active:scale-95";
  
  const variants = {
    primary: "bg-accent-violet hover:bg-violet-700 text-white shadow-[0_0_15px_rgba(139,92,246,0.3)] focus:ring-violet-500",
    secondary: "glass-panel hover:bg-white/10 text-gray-200 focus:ring-gray-500",
    danger: "bg-red-600 hover:bg-red-700 text-white shadow-[0_0_15px_rgba(220,38,38,0.3)] focus:ring-red-500"
  };

  return (
    <button 
      className={`${baseStyle} ${variants[variant]} ${className}`} 
      {...props}
    >
      {children}
    </button>
  );
};
