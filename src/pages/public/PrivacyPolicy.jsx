import React from 'react';
import { Link } from 'react-router-dom';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl text-center">
        <h1 className="text-4xl font-bold mb-6">Privacy Policy</h1>
        <p className="text-lg mb-8 text-gray-300">
          Our Privacy Policy is coming soon. We are committed to protecting your data and ensuring transparency. 
          Yotes stores all your notes and data directly in your own Google Drive, and we do not have access to it.
        </p>
        <Link
          to="/"
          className="text-indigo-400 hover:text-indigo-500 font-semibold transition duration-300 ease-in-out"
        >
          &larr; Back to Homepage
        </Link>
      </div>
      <footer className="absolute bottom-0 left-0 right-0 p-4 text-center text-sm text-gray-500">
        Yotes - Your Data, Your Drive.
      </footer>
    </div>
  );
};

export default PrivacyPolicy;
