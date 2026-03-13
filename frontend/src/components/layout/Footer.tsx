import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { FiFacebook, FiInstagram, FiTwitter, FiMail, FiPhone, FiMapPin, FiArrowRight } from 'react-icons/fi'
import { useAuth } from '@/context/AuthContext'
import gulPlazaLogo from '@/assets/gulplazalogo.png'
import { api } from '@/lib/api'

interface FooterCategory {
  id: number
  name: string
  slug: string
  parent_id: number | null
}

export function Footer() {
  const { user } = useAuth()
  const [categories, setCategories] = useState<FooterCategory[]>([])

  useEffect(() => {
    api.get<{ success: boolean; data: FooterCategory[] }>('/api/categories')
      .then(res => {
        if (res.success && res.data.length > 0) {
          setCategories(res.data.filter(c => c.parent_id === null).slice(0, 5))
        }
      })
      .catch(() => {})
  }, [])

  return (
    <footer className="bg-slate-900 text-slate-300 mt-auto">
      {/* Top gradient border */}
      <div className="h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">

          {/* Brand */}
          <div className="space-y-5">
            <div className="flex items-center gap-2.5">
              <img src={gulPlazaLogo} alt="GUL PLAZA" className="h-10 w-auto object-contain" />
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              Pakistan's trusted multi-vendor marketplace. Shop from thousands of verified sellers across the country.
            </p>
            <div className="flex items-center gap-2">
              {[
                { icon: FiFacebook, href: '#', hover: 'hover:text-blue-400 hover:bg-blue-400/10' },
                { icon: FiInstagram, href: '#', hover: 'hover:text-pink-400 hover:bg-pink-400/10' },
                { icon: FiTwitter, href: '#', hover: 'hover:text-sky-400 hover:bg-sky-400/10' },
              ].map(({ icon: Icon, href, hover }) => (
                <a key={href + Icon.name} href={href}
                  className={`w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 transition-all duration-200 ${hover}`}>
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="font-bold text-white text-sm uppercase tracking-widest">Quick Links</h3>
            <ul className="space-y-2.5 text-sm">
              {[
                { to: '/', label: 'Home' },
                { to: '/products', label: 'All Products' },
                { to: '/cart', label: 'My Cart' },
                ...(user?.role !== 'admin' ? [{ to: '/login', label: 'Become a Seller' }] : []),
              ].map(({ to, label }) => (
                <li key={label}>
                  <Link to={to}
                    className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors group">
                    <FiArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div className="space-y-4">
            <h3 className="font-bold text-white text-sm uppercase tracking-widest">Categories</h3>
            <ul className="space-y-2.5 text-sm">
              {categories.map(cat => (
                <li key={cat.id}>
                  <Link to={`/products?category=${cat.slug}`}
                    className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors group">
                    <FiArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all" />
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h3 className="font-bold text-white text-sm uppercase tracking-widest">Contact Us</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <a href="mailto:support@gulplaza.pk" className="flex items-center gap-3 text-slate-400 hover:text-white transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                    <FiMail className="h-3.5 w-3.5" />
                  </div>
                  support@gulplaza.pk
                </a>
              </li>
              <li>
                <a href="tel:+923000000000" className="flex items-center gap-3 text-slate-400 hover:text-white transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                    <FiPhone className="h-3.5 w-3.5" />
                  </div>
                  +92 300 0000000
                </a>
              </li>
              <li className="flex items-start gap-3 text-slate-400">
                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                  <FiMapPin className="h-3.5 w-3.5" />
                </div>
                Lahore, Punjab, Pakistan
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© 2025 GUL PLAZA. All rights reserved. Powered by <span className="text-slate-400 font-medium">Aerox ERP</span>.</p>
          <div className="flex items-center gap-5">
            {['Privacy Policy', 'Terms of Service', 'Refund Policy'].map(t => (
              <a key={t} href="#" className="hover:text-slate-300 transition-colors">{t}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
