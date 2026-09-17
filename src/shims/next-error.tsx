import React from 'react';

interface ErrorProps {
  statusCode: number;
  title?: string;
}

export const NextError: React.FC<ErrorProps> = ({ statusCode, title }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-4">
      <h1 className="text-4xl font-bold mb-2">{statusCode}</h1>
      <p className="text-sm opacity-75">{title || 'An error occurred.'}</p>
    </div>
  );
};

export default NextError;
