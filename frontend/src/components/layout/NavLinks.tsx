import React from 'react';
import { Link } from 'react-router-dom';

const NavLinks: React.FC = () => {
  return (
    <Link
      to="/templates"
      className="text-gray-700 hover:bg-gray-200 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
    >
      Templates
    </Link>
    // Add other navigation links here if needed in the future
  );
};

export default NavLinks; 