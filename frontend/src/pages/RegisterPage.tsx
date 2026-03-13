import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiUser, FiMail, FiPhone, FiLock, FiAlertCircle, FiEye, FiEyeOff, FiShoppingBag, FiArrowRight, FiShield, FiZap, FiTrendingUp } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { useAuth } from '@/context/AuthContext'
import gulPlazaLogo from '@/assets/gulplazalogo.png'

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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

  const inputClass = `w-full h-12 pl-11 pr-4 rounded-xl border text-sm outline-none transition-all
    bg-white border-slate-200 text-slate-900 placeholder:text-slate-400
    focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
    dark:bg-white/5 dark:border-white/10 dark:text-white dark:placeholder:text-slate-600
    dark:focus:border-blue-500/60 dark:focus:ring-blue-500/20`

  const labelClass = "text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest"

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-[#0f1117] transition-colors duration-300">

      {/* Left panel — branding (desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden bg-gradient-to-br from-blue-900 via-slate-900 to-indigo-950">
        {/* Blobs */}
        <div className="absolute top-[-80px] left-[-80px] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-[-100px] right-[-60px] w-[400px] h-[400px] bg-indigo-600/20 rounded-full blur-3xl" />
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '40px 40px' }} />

        {/* Logo */}
        <div className="relative z-10">
          <Link to="/" className="inline-flex items-center gap-3">
            <img src={gulPlazaLogo} alt="Gul Plaza" className="h-10 w-auto object-contain" />
          </Link>
        </div>

        {/* Center content */}
        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-4xl font-bold text-white leading-tight">
              Join Pakistan's Fastest<br />
              <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                Growing Marketplace
              </span>
            </h2>
            <p className="mt-4 text-slate-400 text-base leading-relaxed max-w-xs">
              Create your free account and start shopping from thousands of verified sellers across Pakistan.
            </p>
          </div>

          <div className="space-y-4">
            {[
              { icon: FiShield,     color: 'text-emerald-400', bg: 'bg-emerald-400/10', label: 'Buyer & Seller Protection' },
              { icon: FiZap,        color: 'text-yellow-400',  bg: 'bg-yellow-400/10',  label: 'Fast & Secure Payments' },
              { icon: FiTrendingUp, color: 'text-blue-400',    bg: 'bg-blue-400/10',    label: 'Real-time Order Tracking' },
            ].map(({ icon: Icon, color, bg, label }) => (
              <div key={label} className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
                <span className="text-slate-300 text-sm font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-slate-600 text-xs">Trusted by 10,000+ buyers across Pakistan</p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative overflow-y-auto">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-sm relative z-10">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <Link to="/">
              <img src={gulPlazaLogo} alt="Gul Plaza" className="h-10 w-auto object-contain mx-auto" />
            </Link>
          </div>

          <div className="mb-6">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Create account</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">Join GUL PLAZA and start shopping today</p>
          </div>

          {/* Buyer badge */}
          <div className="flex items-center gap-2.5 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl px-4 py-3 mb-6">
            <FiShoppingBag className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <p className="text-blue-700 dark:text-blue-300 text-xs leading-snug">
              All new accounts start as a <span className="font-semibold">Buyer</span>. Apply to become a Seller from your profile.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className={labelClass} htmlFor="name">Full Name</label>
              <div className="relative">
                <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                <input id="name" type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="Your full name" required className={inputClass} />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className={labelClass} htmlFor="email">Email Address</label>
              <div className="relative">
                <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com" required className={inputClass} />
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <label className={labelClass} htmlFor="phone">Phone Number</label>
              <div className="relative">
                <FiPhone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                <input id="phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="03001234567" required className={inputClass} />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className={labelClass} htmlFor="password">Password</label>
              <div className="relative">
                <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 8 chars, upper+lower+number"
                  required
                  className={`${inputClass} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  tabIndex={-1}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 mt-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Creating account...
                </span>
              ) : (
                <>Create Buyer Account <FiArrowRight className="h-4 w-4" /></>
              )}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-slate-200 dark:bg-white/5" />
            <span className="text-slate-400 dark:text-slate-600 text-xs">or</span>
            <div className="flex-1 h-px bg-slate-200 dark:bg-white/5" />
          </div>

          <p className="text-center text-sm text-slate-500 dark:text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 dark:text-blue-400 font-semibold hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* Error Dialog */}
      <Dialog open={!!error} onOpenChange={() => setError('')}>
        <DialogContent className="max-w-sm">
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center">
              <FiAlertCircle className="h-7 w-7 text-red-600 dark:text-red-400" />
            </div>
            <DialogHeader>
              <DialogTitle>Registration Failed</DialogTitle>
              <DialogDescription>{error}</DialogDescription>
            </DialogHeader>
          </div>
          <DialogFooter className="justify-center">
            <Button onClick={() => setError('')} className="bg-blue-600 hover:bg-blue-700">Try Again</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
