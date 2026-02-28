import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Store, Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { useAuth } from '@/context/AuthContext'

const demoAccounts = [
  { icon: '🛒', label: 'Buyer', email: 'buyer@test.com' },
  { icon: '🏪', label: 'Seller', email: 'seller@test.com' },
  { icon: '🔐', label: 'Admin', email: 'admin@test.com' },
]

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await login(email, password)
    setLoading(false)
    if (result.success) {
      navigate('/')
    } else {
      setError(result.message)
    }
  }

  return (
    <div className="min-h-[calc(100vh-160px)] flex items-center justify-center px-4 py-12 bg-slate-100">
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-5 group">
            <div className="w-11 h-11 bg-blue-600 rounded-xl flex items-center justify-center shadow-md group-hover:bg-blue-700 transition-colors">
              <Store className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900">Gul <span className="text-blue-600">Plaza</span></span>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
          <p className="text-slate-500 text-sm mt-1.5">Sign in to your account to continue</p>
        </div>

        <Card className="shadow-md">
          <CardContent className="p-7">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full h-11 text-base gap-2" disabled={loading}>
                {loading ? 'Signing in...' : <>Sign In <ArrowRight className="h-4 w-4" /></>}
              </Button>
            </form>

            {/* Demo credentials */}
            <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-blue-100">
                <p className="text-xs font-bold text-blue-800 uppercase tracking-wide">Demo Accounts — any password works</p>
              </div>
              <div className="grid grid-cols-3 divide-x divide-blue-100">
                {demoAccounts.map(({ icon, label, email: demoEmail }) => (
                  <button
                    key={demoEmail}
                    type="button"
                    onClick={() => { setEmail(demoEmail); setPassword('password') }}
                    className="flex flex-col items-center py-3 px-2 hover:bg-blue-100/60 transition-colors group"
                  >
                    <span className="text-xl mb-1">{icon}</span>
                    <span className="text-xs font-semibold text-blue-800 group-hover:text-blue-900">{label}</span>
                    <span className="text-xs text-blue-500 mt-0.5 text-center leading-tight">{demoEmail.split('@')[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            <p className="text-center text-sm text-slate-500 mt-5">
              Don't have an account?{' '}
              <Link to="/register" className="text-blue-600 font-semibold hover:underline">Create one free</Link>
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
              <DialogTitle>Sign In Failed</DialogTitle>
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
