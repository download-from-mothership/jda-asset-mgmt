"use client"

import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar"
import { LayoutDashboard, Settings, Users } from "lucide-react"
import { Outlet } from "react-router-dom"

export default function DashboardLayout() {
  return (
    <div className="flex h-screen">
      <Sidebar>
        <SidebarBody>
          <div className="space-y-4">
            <SidebarLink
              link={{
                label: "Dashboard",
                href: "/",
                icon: <LayoutDashboard className="h-4 w-4" />,
              }}
            />
            <SidebarLink
              link={{
                label: "Maintenance",
                href: "/maintenance",
                icon: <Settings className="h-4 w-4" />,
                children: [
                  {
                    label: "Update Record",
                    href: "/maintenance/update",
                  },
                ],
              }}
            />
            <SidebarLink
              link={{
                label: "Users",
                href: "/users",
                icon: <Users className="h-4 w-4" />,
              }}
            />
          </div>
        </SidebarBody>
      </Sidebar>
      <main className="flex-1 overflow-y-auto bg-background">
        <Outlet />
      </main>
    </div>
  )
} 