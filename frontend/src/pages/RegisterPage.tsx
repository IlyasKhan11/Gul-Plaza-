import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Store, ShoppingBag, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/types'

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [role, setRole] = useState<UserRole>('buyer')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true)
    const result = await register(name, email, password, role)
    setLoading(false)
    if (result.success) {
      navigate(role === 'seller' ? '/seller/store' : '/')
    } else {
      setError(result.message)
    }
  }

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Store className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Create Account</h1>
          <p className="text-slate-500 text-sm mt-1">Join GUL PLAZA today</p>
        </div>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Register</CardTitle>
            <CardDescription>Choose your account type and fill in your details</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Role Selector */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              {([
                { role: 'buyer' as UserRole, icon: ShoppingBag, title: 'Buyer', desc: 'Shop & order products' },
                { role: 'seller' as UserRole, icon: Store, title: 'Seller', desc: 'Open your store' },
              ] as const).map(({ role: r, icon: Icon, title, desc }) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center',
                    role === r ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                  )}
                >
                  <Icon className={cn('h-6 w-6', role === r ? 'text-blue-600' : 'text-slate-400')} />
                  <span className={cn('font-semibold text-sm', role === r ? 'text-blue-700' : 'text-slate-700')}>{title}</span>
                  <span className="text-xs text-slate-400">{desc}</span>
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" className="mt-1" required />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="mt-1" required />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 6 characters" className="mt-1" required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Creating account...' : `Create ${role === 'seller' ? 'Seller' : 'Buyer'} Account`}
              </Button>
            </form>

            <p className="text-center text-sm text-slate-500 mt-4">
              Already have an account?{' '}
              <Link to="/login" className="text-blue-600 font-medium hover:underline">Sign in</Link>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Error Dialog */}
      <Dialog open={!!error} onOpenChange={() => setError('')}>
        <DialogContent className="max-w-sm">
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle className="h-7 w-7 text-red-600" />
            </div>
            <DialogHeader>
              <DialogTitle>Registration Failed</DialogTitle>
              <DialogDescription>{error}</DialogDescription>
            </DialogHeader>
          </div>
          <DialogFooter className="justify-center">
            <Button onClick={() => setError('')}>Try Again</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
