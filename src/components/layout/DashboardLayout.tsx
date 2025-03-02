import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { 
  LayoutDashboard,
  Users,
  Settings,
  LogOut 
} from 'lucide-react';
import { Sidebar, SidebarBody, SidebarLink, useSidebar } from '@/components/ui/sidebar';
import { motion } from 'framer-motion';

const DashboardLayout = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { open, animate } = useSidebar();

  console.log('DashboardLayout rendering:', { user, loading });

  // Redirect to login if not authenticated
  if (!loading && !user) {
    console.log('DashboardLayout: No user, redirecting to login');
    navigate('/login');
    return null;
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading) {
    console.log('DashboardLayout: Loading...');
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  console.log('DashboardLayout: Rendering main content');

  const links = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: <LayoutDashboard className="h-5 w-5" />
    },
    {
      label: "Users",
      href: "/dashboard/users",
      icon: <Users className="h-5 w-5" />
    },
    {
      label: "Settings",
      href: "/dashboard/settings",
      icon: <Settings className="h-5 w-5" />
    }
  ];

  return (
    <div className="flex min-h-screen">
      <Sidebar>
        <SidebarBody>
          <div className="flex flex-col gap-4">
            <div className="p-2">
              <div className="flex flex-col">
                <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-200">JDA</h2>
                <motion.h2
                  animate={{
                    display: animate ? (open ? "block" : "none") : "block",
                    opacity: animate ? (open ? 1 : 0) : 1,
                  }}
                  className="text-xl font-bold text-neutral-800 dark:text-neutral-200"
                >
                  Asset Management
                </motion.h2>
              </div>
            </div>
            <div className="flex flex-col">
              {links.map((link) => (
                <SidebarLink key={link.href} link={link} />
              ))}
            </div>
          </div>
        </SidebarBody>
      </Sidebar>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <header className="flex h-16 items-center justify-between bg-white px-6 shadow dark:bg-neutral-800">
          <div>
            {/* Placeholder for search or breadcrumbs */}
          </div>
          <div className="flex items-center">
            <span className="mr-4 text-neutral-800 dark:text-neutral-200">{user?.email}</span>
            <button
              onClick={handleSignOut}
              className="flex items-center rounded-md bg-red-600 px-3 py-1 text-white hover:bg-red-700"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6 bg-white dark:bg-neutral-900">
          <div className="h-full w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;