import React from 'react';
import { TextShimmer } from './ui/text-shimmer';
import PropTypes from 'prop-types';

const ProgressBar = ({ progress, message }) => {
  // Determine if progress is indeterminate (e.g., undefined, null, or < 0)
  const isIndeterminate = typeof progress !== 'number' || progress < 0;

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary"> {/* Ensure background */}
      <div className="w-full max-w-lg p-6 flex flex-col justify-center items-center">
        {/* Yotes Logo/Title */}
        <TextShimmer
          className="text-3xl md:text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400"
          duration={1.5} // Adjust shimmer speed if desired
        >
          Yotes
        </TextShimmer>

        {/* Progress Bar Container */}
        <div className={`w-full bg-gray-700/50 rounded-full h-3 overflow-hidden shadow-md ${isIndeterminate ? 'relative' : ''}`}>
          {isIndeterminate ? (
            // Indeterminate animation (e.g., sliding bar)
             <div
                className="absolute inset-0 h-3 rounded-full bg-gradient-to-r from-transparent via-gray-400 to-transparent animate-indeterminate"
                style={{ animationDuration: '2s' }} // Adjust animation speed
             ></div>
          ) : (
            // Determinate progress
            <div
              className="bg-gradient-to-r from-gray-200 to-gray-700 h-3 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} // Clamp progress 0-100
            ></div>
          )}
        </div>

        {/* Loading Message */}
        <p className="text-text-primary/80 mt-3 text-sm md:text-base font-medium italic text-center">
          {message || (isIndeterminate ? 'Loading...' : 'Processing...')} {/* Fallback message */}
        </p>
      </div>
    </div>
  );
};

// Define prop types for better component usage understanding
ProgressBar.propTypes = {
  progress: PropTypes.number, // Can be omitted or < 0 for indeterminate
  message: PropTypes.string.isRequired,
};

export default ProgressBar;