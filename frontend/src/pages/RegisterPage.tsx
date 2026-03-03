import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiGlobe, FiShoppingBag, FiAlertCircle } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { useAuth } from '@/context/AuthContext'

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      setError('Password must contain uppercase, lowercase, and a number')
      return
    }
    if (phone.length < 10) { setError('Phone number must be at least 10 digits'); return }
    setLoading(true)
    const result = await register(name, email, password, 'buyer', phone)
    setLoading(false)
    if (result.success) {
      navigate('/login')
    } else {
      setError(result.message)
    }
  }

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3">
            <FiGlobe className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Create Account</h1>
          <p className="text-slate-500 text-sm mt-1">Join GUL PLAZA today</p>
        </div>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Register</CardTitle>
            <CardDescription>
              <span className="flex items-center gap-2">
                <FiShoppingBag className="h-4 w-4 text-blue-600" />
                All new accounts start as a Buyer. You can apply to become a Seller from your profile after signing up.
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="03001234567" className="mt-1" required />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 chars, upper+lower+number" className="mt-1" required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Creating account...' : 'Create Buyer Account'}
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
              <FiAlertCircle className="h-7 w-7 text-red-600" />
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
