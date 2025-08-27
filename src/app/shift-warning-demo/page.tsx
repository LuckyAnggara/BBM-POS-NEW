'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useShiftUnloadWarning } from '@/hooks/useShiftUnloadWarning'
import { useShiftAwareNavigation } from '@/hooks/useShiftAwareNavigation'
import { ShiftStatusIndicator } from '@/components/shift/ShiftStatusIndicator'
import { ShiftWarningDialog } from '@/components/dialogs/ShiftWarningDialog'
import { AlertTriangle, Home, Settings, FileText, Users } from 'lucide-react'

/**
 * Halaman demo untuk testing shift warning system.
 * Bisa diakses di /shift-warning-demo
 */
export default function ShiftWarningDemoPage() {
  const navigation = useShiftAwareNavigation()
  const {
    activeShift,
    showWarningDialog,
    showWarning,
    handleConfirmLeave,
    handleCancelLeave,
    refreshActiveShift,
  } = useShiftUnloadWarning()

  const handleTestNavigation = (path: string, label: string) => {
    console.log(`Testing navigation to ${path} (${label})`)
    navigation.push(path)
  }

  const handleTestCustomWarning = async () => {
    // This demonstrates manual trigger of custom dialog
    try {
      const shouldProceed = await showWarning(() => {
        console.log('Custom action confirmed!')
      })

      if (shouldProceed) {
        alert('Custom action confirmed! User chose to proceed.')
      } else {
        alert('Action cancelled by user.')
      }
    } catch (error) {
      // If no active shift, showWarning resolves immediately with true
      alert('No active shift, action executed immediately!')
    }
  }

  const handleTestBrowserWarning = () => {
    // Test browser's native warning (for close/refresh events)
    alert(
      'Try closing this tab (Ctrl+W) or refreshing (F5) to see browser native warning when shift is active.'
    )
  }

  return (
    <div className='container mx-auto p-6 max-w-4xl space-y-6'>
      <div className='space-y-2'>
        <h1 className='text-3xl font-bold'>Shift Warning System Demo</h1>
        <p className='text-muted-foreground'>
          Test various scenarios untuk sistem peringatan shift aktif.
        </p>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
        {/* Status Shift */}
        <div className='space-y-4'>
          <h2 className='text-xl font-semibold'>Status Shift</h2>
          <ShiftStatusIndicator />
        </div>

        {/* Test Navigation */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Home className='h-5 w-5' />
              Test Safe Navigation
            </CardTitle>
            <CardDescription>
              Navigasi yang akan menampilkan warning jika ada shift aktif
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-3'>
            <Button
              onClick={() => handleTestNavigation('/dashboard', 'Dashboard')}
              variant='outline'
              className='w-full justify-start'
            >
              <Home className='h-4 w-4 mr-2' />
              Go to Dashboard
            </Button>

            <Button
              onClick={() =>
                handleTestNavigation('/branch-settings', 'Settings')
              }
              variant='outline'
              className='w-full justify-start'
            >
              <Settings className='h-4 w-4 mr-2' />
              Go to Settings
            </Button>

            <Button
              onClick={() => handleTestNavigation('/customers', 'Customers')}
              variant='outline'
              className='w-full justify-start'
            >
              <Users className='h-4 w-4 mr-2' />
              Go to Customers
            </Button>

            <Button
              onClick={() => handleTestNavigation('/reports', 'Reports')}
              variant='outline'
              className='w-full justify-start'
            >
              <FileText className='h-4 w-4 mr-2' />
              Go to Reports
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Test Custom Actions */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <AlertTriangle className='h-5 w-5' />
            Test Custom Warning
          </CardTitle>
          <CardDescription>
            Test custom actions dengan warning system
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-3'>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
            <Button onClick={handleTestCustomWarning} variant='secondary'>
              Test Custom Action
            </Button>

            <Button onClick={refreshActiveShift} variant='outline'>
              Refresh Shift Data
            </Button>

            <Button onClick={handleTestBrowserWarning} variant='destructive'>
              Test Browser Warning
            </Button>

            <Button onClick={() => navigation.back()} variant='outline'>
              Test Go Back
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current State */}
      <Card>
        <CardHeader>
          <CardTitle>Current State Debug</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='space-y-2 text-sm'>
            <div className='grid grid-cols-2 gap-4'>
              <div>
                <span className='font-medium'>Active Shift ID:</span>
                <span className='ml-2'>{activeShift?.id || 'None'}</span>
              </div>
              <div>
                <span className='font-medium'>Shift Status:</span>
                <span className='ml-2'>{activeShift?.status || 'N/A'}</span>
              </div>
              <div>
                <span className='font-medium'>Kasir:</span>
                <span className='ml-2'>{activeShift?.user_name || 'N/A'}</span>
              </div>
              <div>
                <span className='font-medium'>Dialog State:</span>
                <span className='ml-2'>
                  {showWarningDialog ? 'Open' : 'Closed'}
                </span>
              </div>
            </div>

            <Separator className='my-3' />

            <div>
              <span className='font-medium'>Raw Shift Data:</span>
              <pre className='mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto'>
                {JSON.stringify(activeShift, null, 2)}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Manual Dialog Test */}
      <Card>
        <CardHeader>
          <CardTitle>Manual Dialog Test</CardTitle>
          <CardDescription>
            Test dialog secara manual (untuk development)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ShiftWarningDialog
            open={showWarningDialog}
            onOpenChange={() => {}} // Controlled by hook
            shift={activeShift}
            onConfirmLeave={handleConfirmLeave}
            onCancelLeave={handleCancelLeave}
          />
        </CardContent>
      </Card>
    </div>
  )
}
