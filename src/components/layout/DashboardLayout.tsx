import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { 
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  FileText,
  ClipboardList,
  Wrench,
  ShieldCheck,
  User
} from 'lucide-react';
import { Sidebar, SidebarBody, SidebarLink, useSidebar } from '@/components/ui/sidebar';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

const DashboardLayout = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { open, animate } = useSidebar();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const links = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: <LayoutDashboard className="h-5 w-5" />
    },
    {
      label: "Reporting",
      href: "/dashboard/reporting",
      icon: <FileText className="h-5 w-5" />
    },
    {
      label: "Action Items",
      href: "/dashboard/action-items",
      icon: <ClipboardList className="h-5 w-5" />
    },
    {
      label: "Maintenance",
      href: "/dashboard/maintenance",
      icon: <Wrench className="h-5 w-5" />,
      children: [
        {
          label: "Add New Sender",
          href: "/dashboard/maintenance/add-sender",
        },
        {
          label: "Search Record",
          href: "/dashboard/maintenance/search",
        },
        {
          label: "Senders Not Delivering",
          href: "/dashboard/maintenance/not-delivering",
        },
        {
          label: "Update Record",
          href: "/dashboard/maintenance/update",
        }
      ]
    },
    {
      label: "Users",
      href: "/dashboard/users",
      icon: <Users className="h-5 w-5" />
    },
    {
      label: "Admin",
      href: "/dashboard/admin",
      icon: <ShieldCheck className="h-5 w-5" />
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
          <div className="flex flex-col h-full">
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
            
            {/* User profile and sign out at bottom of sidebar */}
            <div className="mt-auto pt-4">
              <Separator className="mb-4" />
              <div className="px-2 py-2">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <motion.div
                    animate={{
                      display: animate ? (open ? "block" : "none") : "block",
                      opacity: animate ? (open ? 1 : 0) : 1,
                    }}
                    className="flex flex-col"
                  >
                    <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                      {user?.email}
                    </span>
                  </motion.div>
                </div>
                <motion.div
                  animate={{
                    display: animate ? (open ? "block" : "none") : "block",
                    opacity: animate ? (open ? 1 : 0) : 1,
                  }}
                >
                  <button
                    onClick={handleSignOut}
                    className="mt-2 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </motion.div>
              </div>
            </div>
          </div>
        </SidebarBody>
      </Sidebar>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 bg-white dark:bg-neutral-900">
          <div className="h-full w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;