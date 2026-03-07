import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { FiCheckCircle } from 'react-icons/fi'
import { Navbar } from './Navbar'
import { Footer } from './Footer'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export function PublicLayout() {
  const location = useLocation()
  const [welcomeName, setWelcomeName] = useState<string | null>(null)

  useEffect(() => {
    const name = sessionStorage.getItem('welcome_name')
    if (name) {
      sessionStorage.removeItem('welcome_name')
      setWelcomeName(name)
    }
  }, [location.pathname])

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-slate-950">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />

      <Dialog open={!!welcomeName} onOpenChange={() => setWelcomeName(null)}>
        <DialogContent className="max-w-sm">
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <FiCheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-xl">Welcome back, {welcomeName}!</DialogTitle>
              <DialogDescription>
                You have successfully signed in to your Gul Plaza account.
              </DialogDescription>
            </DialogHeader>
          </div>
          <DialogFooter className="justify-center">
            <Button className="w-full" onClick={() => setWelcomeName(null)}>
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
