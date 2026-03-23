import React, { useState, memo } from 'react';
import { cn } from '../lib/utils';

interface ChannelIconProps {
  src: string;
  name: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: {
    container: 'w-10 h-10',
    text: 'text-xs',
  },
  md: {
    container: 'w-16 h-16',
    text: 'text-sm',
  },
  lg: {
    container: 'w-20 h-20',
    text: 'text-lg',
  },
};

export const ChannelIcon = memo(function ChannelIcon({ src, name, className, size = 'md' }: ChannelIconProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  
  const initials = name.substring(0, 2).toUpperCase();
  
  if (!src || hasError) {
    return (
      <div 
        className={cn(
          "flex items-center justify-center bg-white/10 rounded-xl grayscale",
          sizeClasses[size].container,
          sizeClasses[size].text,
          className
        )}
      >
        <span className="font-black text-gray-500">
          {initials}
        </span>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "relative overflow-hidden rounded-xl bg-white/10",
        sizeClasses[size].container,
        className
      )}
    >
      {/* Placeholder - shows until image loads */}
      <div 
        className={cn(
          "absolute inset-0 flex items-center justify-center transition-opacity duration-300",
          isLoaded ? "opacity-0" : "opacity-100"
        )}
      >
        <span className={cn(
          "font-black text-gray-500",
          sizeClasses[size].text
        )}>
          {initials}
        </span>
      </div>
      
      {/* Image */}
      <img
        src={src}
        alt={name}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        className={cn(
          "w-full h-full object-cover transition-opacity duration-300",
          isLoaded ? "opacity-100" : "opacity-0"
        )}
        referrerPolicy="no-referrer"
      />
    </div>
  );
});

interface FeaturedIconProps {
  src: string;
  name: string;
  className?: string;
}

export const FeaturedIcon = memo(function FeaturedIcon({ src, name, className }: FeaturedIconProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  
  const initials = name.substring(0, 2).toUpperCase();
  
  if (!src || hasError) {
    return (
      <div 
        className={cn(
          "absolute inset-0 flex items-center justify-center bg-primary/20 rounded-3xl grayscale",
          className
        )}
      >
        <span className="text-4xl font-black text-primary/40">
          {initials}
        </span>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "absolute inset-0 overflow-hidden rounded-3xl",
        className
      )}
    >
      {/* Placeholder */}
      <div 
        className={cn(
          "absolute inset-0 flex items-center justify-center bg-primary/20 transition-opacity duration-300",
          isLoaded ? "opacity-0" : "opacity-100"
        )}
      >
        <span className="text-4xl font-black text-primary/40">
          {initials}
        </span>
      </div>
      
      {/* Image */}
      <img
        src={src}
        alt={name}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        className={cn(
          "w-full h-full object-cover transition-opacity duration-300",
          isLoaded ? "opacity-100" : "opacity-0"
        )}
        referrerPolicy="no-referrer"
      />
    </div>
  );
});

interface GridIconProps {
  src: string;
  name: string;
  className?: string;
}

export const GridIcon = memo(function GridIcon({ src, name, className }: GridIconProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  
  const initials = name.substring(0, 2).toUpperCase();
  
  if (!src || hasError) {
    return (
      <div 
        className={cn(
          "flex items-center justify-center bg-white/10 rounded-2xl grayscale aspect-square",
          className
        )}
      >
        <span className="text-2xl font-black text-gray-500">
          {initials}
        </span>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "relative overflow-hidden rounded-2xl bg-white/10 aspect-square",
        className
      )}
    >
      {/* Placeholder */}
      <div 
        className={cn(
          "absolute inset-0 flex items-center justify-center transition-opacity duration-300",
          isLoaded ? "opacity-0" : "opacity-100"
        )}
      >
        <span className="text-2xl font-black text-gray-500">
          {initials}
        </span>
      </div>
      
      {/* Image */}
      <img
        src={src}
        alt={name}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        className={cn(
          "w-full h-full object-cover transition-opacity duration-300",
          isLoaded ? "opacity-100" : "opacity-0"
        )}
        referrerPolicy="no-referrer"
      />
    </div>
  );
});