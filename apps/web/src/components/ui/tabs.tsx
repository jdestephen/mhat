"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const TabsContext = React.createContext<{
  activeTab: string
  setActiveTab: (value: string) => void
} | null>(null)

export function Tabs({ 
  defaultValue, 
  children, 
  className 
}: { 
  defaultValue: string
  children: React.ReactNode
  className?: string 
}) {
  const [activeTab, setActiveTab] = React.useState(defaultValue)

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={cn("w-full", className)}>{children}</div>
    </TabsContext.Provider>
  )
}

export function TabsList({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "flex w-full items-center justify-start border-b border-emerald-900/10 bg-transparent p-0",
        className
      )}
    >
      {children}
    </div>
  )
}

export function TabsTrigger({ 
  value, 
  children, 
  className 
}: { 
  value: string
  children: React.ReactNode
  className?: string 
}) {
  const context = React.useContext(TabsContext)
  if (!context) throw new Error("TabsTrigger must be used within Tabs")

  const isActive = context.activeTab === value

  return (
    <button
      className={cn(
        "relative inline-flex items-center justify-center whitespace-nowrap px-6 py-3 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        "border border-transparent bg-white text-slate-500 hover:text-emerald-900 hover:bg-emerald-50/30 hover:cursor-pointer",
        isActive && "border-emerald-900/10 border-b-white bg-emerald-50/30 text-emerald-900 text-md font-semibold mb-[-1px] z-10",
        className
      )}
      onClick={() => context.setActiveTab(value)}
    >
      {children}
    </button>
  )
}

export function TabsContent({ 
  value, 
  children, 
  className 
}: { 
  value: string
  children: React.ReactNode
  className?: string 
}) {
  const context = React.useContext(TabsContext)
  if (!context) throw new Error("TabsContent must be used within Tabs")

  if (context.activeTab !== value) return null

  return (
    <div
      className={cn(
        "mt-0 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-950 focus-visible:ring-offset-2",
        className
      )}
    >
      {children}
    </div>
  )
}
