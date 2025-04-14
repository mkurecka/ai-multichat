import { jsx as _jsx } from "react/jsx-runtime";
import { Link } from 'react-router-dom';
const NavLinks = () => {
    return (_jsx(Link, { to: "/templates", className: "text-gray-700 hover:bg-gray-200 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium", children: "Templates" })
    // Add other navigation links here if needed in the future
    );
};
export default NavLinks;
