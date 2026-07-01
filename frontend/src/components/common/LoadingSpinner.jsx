import React from 'react';

const LoadingSpinner = ({ fullPage = true }) => {
  const spinner = (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-indigo-500"></div>
      <p className="text-sm font-medium text-slate-400">Loading AI InterviewOS...</p>
    </div>
  );

  if (fullPage) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        {spinner}
      </div>
    );
  }

  return spinner;
};

export default LoadingSpinner;
