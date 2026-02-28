import { Link } from 'react-router-dom'
import { Facebook, Instagram, Twitter, Mail, Phone, MapPin } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import gulPlazaLogo from '@/assets/gul-plaza.jpeg'

export function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <img src={gulPlazaLogo} alt="GUL PLAZA" className="h-10 w-auto rounded-lg object-contain" />
            </div>
            <p className="text-sm text-slate-400">
              Pakistan's trusted multi-vendor marketplace. Shop from thousands of verified sellers.
            </p>
            <div className="flex items-center gap-3">
              <a href="#" className="hover:text-white transition-colors"><Facebook className="h-5 w-5" /></a>
              <a href="#" className="hover:text-pink-400 transition-colors"><Instagram className="h-5 w-5" /></a>
              <a href="#" className="hover:text-white transition-colors"><Twitter className="h-5 w-5" /></a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h3 className="font-semibold text-white">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-white transition-colors">Home</Link></li>
              <li><Link to="/products" className="hover:text-white transition-colors">All Products</Link></li>
              <li><Link to="/register" className="hover:text-white transition-colors">Become a Seller</Link></li>
              <li><Link to="/cart" className="hover:text-white transition-colors">My Cart</Link></li>
            </ul>
          </div>

          {/* Categories */}
          <div className="space-y-3">
            <h3 className="font-semibold text-white">Categories</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/products?category=electronics" className="hover:text-white transition-colors">Electronics</Link></li>
              <li><Link to="/products?category=fashion" className="hover:text-white transition-colors">Fashion</Link></li>
              <li><Link to="/products?category=home-living" className="hover:text-white transition-colors">Home & Living</Link></li>
              <li><Link to="/products?category=beauty" className="hover:text-white transition-colors">Beauty</Link></li>
              <li><Link to="/products?category=sports" className="hover:text-white transition-colors">Sports</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <h3 className="font-semibold text-white">Contact</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                <span>support@gulplaza.pk</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                <span>+92 300 0000000</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                <span>Lahore, Punjab, Pakistan</span>
              </li>
            </ul>
          </div>
        </div>

        <Separator className="my-8 bg-slate-700" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <p>© 2025 GUL PLAZA. All rights reserved. Powered by Aerox ERP.</p>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-slate-300">Privacy Policy</a>
            <a href="#" className="hover:text-slate-300">Terms of Service</a>
            <a href="#" className="hover:text-slate-300">Refund Policy</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
