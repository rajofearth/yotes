import React from 'react';
import { TextShimmer } from './ui/text-shimmer';
import PropTypes from 'prop-types';

const ProgressBar = ({ progress = 0, message = 'Loading...' }) => {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-lg p-6 flex flex-col justify-center items-center">
        {/* Yotes Branding */}
        <TextShimmer 
          className="text-3xl md:text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400" 
          duration={1}
        >
          Yotes
        </TextShimmer>

        {/* Progress Bar */}
        <div 
          className="w-full bg-gray-700/50 rounded-full h-3 overflow-hidden shadow-md"
          role="progressbar"
          aria-valuenow={progress === -1 ? undefined : progress}
          aria-valuemin="0"
          aria-valuemax="100"
          aria-label={progress === -1 ? 'Loading in progress' : `Progress at ${progress}%`}
        >
          {progress === -1 ? (
            <div
              className="bg-gradient-to-r from-gray-200 to-gray-700 h-3 rounded-full animate-indeterminate"
              style={{ width: '50%' }}
            ></div>
          ) : (
            <div
              className="bg-gradient-to-r from-gray-200 to-gray-700 h-3 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }} // Clamp between 0-100
            ></div>
          )}
        </div>

        {/* Message */}
        <p className="text-text-primary/80 mt-3 text-sm md:text-base font-medium italic">
          {message}
        </p>
      </div>
    </div>
  );
};

ProgressBar.propTypes = {
  progress: PropTypes.number,
  message: PropTypes.string,
};

export default ProgressBar;