"use client"

interface MaintenanceLayoutProps {
  children: React.ReactNode
}

export default function MaintenanceLayout({ children }: MaintenanceLayoutProps) {
  return (
    <div className="container mx-auto p-4">
      {children}
    </div>
  )
} 