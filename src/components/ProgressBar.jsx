import React from 'react';

const ProgressBar = ({ progress, message }) => {
  return (
    <div className="w-full max-w-lg mx-auto p-6 flex flex-col items-center">
      {/* Yotes Branding */}
      <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 mb-4">
        Yotes
      </h1>

      {/* Progress Bar */}
      <div className="w-full bg-gray-700/50 rounded-full h-3 overflow-hidden shadow-md">
        <div
          className="bg-gradient-to-r from-blue-500 to-blue-700 h-3 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      {/* Message */}
      <p className="text-text-primary/80 mt-3 text-sm md:text-base font-medium italic">
        {message}
      </p>
    </div>
  );
};

export default ProgressBar;