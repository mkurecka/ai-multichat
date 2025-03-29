import { ReactNode } from 'react';
import { Header } from './Header';

interface LayoutProps {
  children: ReactNode;
  showSidebar?: boolean;
  sidebarContent?: ReactNode;
}

export const Layout = ({ children, showSidebar = true, sidebarContent }: LayoutProps) => {
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 bg-white border-b z-10">
        <Header />
      </div>

      {/* Main Content */}
      <div className="flex w-full pt-16">
        {/* Sidebar */}
        {showSidebar && sidebarContent && (
          <div className="w-64 bg-white border-r">
            {sidebarContent}
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}; 