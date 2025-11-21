'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, XCircle, Info, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ErrorType = 'error' | 'warning' | 'info' | 'success';

interface AuthErrorProps {
  type?: ErrorType;
  title?: string;
  message: string;
  autoClose?: boolean;
  className?: string;
  onClose?: () => void;
}

export default function AuthError({
  type = 'error',
  title,
  message,
  autoClose = false,
  className,
  onClose,
}: AuthErrorProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        if (onClose) onClose();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [autoClose, onClose]);

  if (!isVisible) return null;

  // Determine icon and colors based on type
  const getTypeStyles = () => {
    switch (type) {
      case 'error':
        return {
          icon: <AlertCircle className="h-5 w-5 text-red-400" />,
          containerClass: 'bg-red-50 border-red-200 text-red-800',
        };
      case 'warning':
        return {
          icon: <Info className="h-5 w-5 text-amber-400" />,
          containerClass: 'bg-amber-50 border-amber-200 text-amber-800',
        };
      case 'info':
        return {
          icon: <Info className="h-5 w-5 text-blue-400" />,
          containerClass: 'bg-blue-50 border-blue-200 text-blue-800',
        };
      case 'success':
        return {
          icon: <CheckCircle className="h-5 w-5 text-green-400" />,
          containerClass: 'bg-green-50 border-green-200 text-green-800',
        };
      default:
        return {
          icon: <AlertCircle className="h-5 w-5 text-red-400" />,
          containerClass: 'bg-red-50 border-red-200 text-red-800',
        };
    }
  };

  const { icon, containerClass } = getTypeStyles();

  return (
    <div
      className={cn(
        'relative rounded-md border p-4 text-sm',
        containerClass,
        className
      )}
    >
      <div className="flex">
        <div className="flex-shrink-0">{icon}</div>
        <div className="ml-3">
          {title && <h3 className="font-medium">{title}</h3>}
          <div className={title ? 'mt-1' : ''}>{message}</div>
        </div>
      </div>
      {onClose && (
        <button
          type="button"
          className="absolute right-2 top-2 text-gray-400 hover:text-gray-500"
          onClick={() => {
            setIsVisible(false);
            onClose();
          }}
        >
          <span className="sr-only">Close</span>
          <XCircle className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
