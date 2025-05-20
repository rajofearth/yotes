import React from 'react';
import { Link } from 'react-router-dom';

const StaticHomepage = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl text-center">
        <h1 className="text-5xl font-bold mb-6">Welcome to Yotes!</h1>
        <p className="text-lg mb-8 text-gray-300">
          Yotes is a privacy-first web application designed to empower users with full control over their data. 
          It integrates with your Google Drive to securely store and manage notes, documents, and other digital resources.
        </p>
        <Link
          to="/login"
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg text-lg transition duration-300 ease-in-out"
        >
          Login or Sign Up
        </Link>
      </div>
      <footer className="absolute bottom-0 left-0 right-0 p-4 text-center text-sm text-gray-500">
        <Link to="/privacy" className="hover:text-gray-300 mx-2">
          Privacy Policy
        </Link>
        |
        <Link to="/terms" className="hover:text-gray-300 mx-2">
          Terms & Conditions
        </Link>
      </footer>
    </div>
  );
};

export default StaticHomepage;
