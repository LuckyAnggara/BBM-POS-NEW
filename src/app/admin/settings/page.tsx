'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import MainLayout from '@/components/layout/main-layout'
import { useAuth } from '@/contexts/auth-context'
import { useBranch } from '@/contexts/branch-context'
import { Branch } from '@/lib/appwrite/types'
import { toast } from 'sonner'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ManageBranches from '@/components/admin/ManageBranches'
import ManageUsers from '@/components/admin/ManageUsers'
import ManageBankAccounts from '@/components/admin/ManageBankAccounts'
import SystemUtilities from '@/components/admin/SystemUtilities'
import { AlertCircleIcon, CheckCircle2Icon, PopcornIcon } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export default function AdminSettingsPage() {
  const { currentUser, userData, loadingAuth } = useAuth()
  const {
    branches,
    loadingBranches,
    refreshBranches,
    selectedBranch: adminSelectedBranch,
    setSelectedBranchId: setAdminSelectedBranchId,
  } = useBranch()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('manage-branches')

  // useEffect(() => {
  //   if (!loadingAuth && userData?.role !== 'admin') {
  //     router.push('/dashboard')
  //   }
  // }, [userData])
  if (loadingAuth) {
    return (
      <div className='flex h-screen items-center justify-center'>
        Memuat data admin...
      </div>
    )
  }

  if (userData && userData.role === 'admin') {
    return (
      <ProtectedRoute>
        <MainLayout>
          <div className='space-y-6'>
            <h1 className='text-xl md:text-2xl font-semibold font-headline'>
              Pengaturan Admin
            </h1>

            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className='space-y-4'
            >
              <TabsList className='inline-flex items-center justify-start rounded-md bg-muted p-1 text-muted-foreground'>
                <TabsTrigger
                  value='manage-branches'
                  className='tab-trigger-style'
                >
                  Kelola Cabang
                </TabsTrigger>
                <TabsTrigger
                  value='manage-users'
                  className='text-xs px-3 py-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm'
                >
                  Kelola Pengguna
                </TabsTrigger>
                <TabsTrigger
                  value='manage-bank-accounts'
                  className='text-xs px-3 py-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm'
                >
                  Rekening Bank
                </TabsTrigger>
                <TabsTrigger
                  value='system-utilities'
                  className='text-xs px-3 py-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm'
                >
                  Utilitas Sistem
                </TabsTrigger>
              </TabsList>

              <TabsContent value='manage-branches' className='mt-0'>
                <ManageBranches
                  branches={branches}
                  loadingBranches={loadingBranches}
                  adminSelectedBranch={adminSelectedBranch}
                  setAdminSelectedBranchId={setAdminSelectedBranchId}
                  toast={toast}
                  fetchUsers={async () => {}} // Placeholder, ManageUsers will fetch its own
                />
              </TabsContent>
              <TabsContent value='manage-users' className='mt-0'>
                <ManageUsers
                  branches={branches}
                  loadingBranches={loadingBranches}
                />
              </TabsContent>
              <TabsContent value='manage-bank-accounts' className='mt-0'>
                {' '}
                <ManageBankAccounts
                  branches={branches}
                  loadingBranches={loadingBranches}
                />
              </TabsContent>
              <TabsContent value='system-utilities' className='mt-0'>
                <SystemUtilities
                  adminSelectedBranch={adminSelectedBranch}
                  currentUser={currentUser}
                  userData={userData}
                  toast={toast}
                />
              </TabsContent>
            </Tabs>
          </div>
        </MainLayout>
      </ProtectedRoute>
    )
  }

  if (userData && userData.role !== 'admin') {
    return (
      <ProtectedRoute>
        <MainLayout>
          <div className='grid w-full items-start  h-screen'>
            <Alert variant='destructive'>
              <AlertCircleIcon />
              <AlertTitle>Only admin can access this page.</AlertTitle>
              <AlertDescription>
                <p>Please contact your administrator for access.</p>
              </AlertDescription>
            </Alert>
          </div>
        </MainLayout>
      </ProtectedRoute>
    )
  }
}
