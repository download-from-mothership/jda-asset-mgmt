import React from 'react'
import { SenderTable } from './SenderTable'

export function MaintenanceSearch() {
  return (
    <div className="container mx-auto py-10">
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Sender Search</h1>
        <div className="rounded-lg border p-4">
          <SenderTable />
        </div>
      </div>
    </div>
  )
} 