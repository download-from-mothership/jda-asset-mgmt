"use client"

import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Maintenance",
  description: "Maintenance and configuration section",
}

interface MaintenanceLayoutProps {
  children: React.ReactNode
}

export default function MaintenanceLayout({ children }: MaintenanceLayoutProps) {
  return <>{children}</>
} 