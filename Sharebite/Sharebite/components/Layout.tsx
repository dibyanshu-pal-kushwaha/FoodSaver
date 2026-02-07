'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser, setCurrentUser, getUnreadNotificationCount, getUserById } from '@/lib/storage';
import { User } from '@/lib/types';
import MLStatusIndicator from './MLStatusIndicator';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push('/');
      return;
    }
    setUser(currentUser);

    // Update notification count
    const updateNotificationCount = () => {
      setNotificationCount(getUnreadNotificationCount(currentUser.id));
    };
    updateNotificationCount();
    const interval = setInterval(updateNotificationCount, 5000);
    return () => clearInterval(interval);
  }, [router]);

  const handleLogout = () => {
    setCurrentUser(null);
    router.push('/');
  };

  if (!user) return null;

  const getNavLinks = () => {
    if (user.role === 'admin') {
      return [
        { href: '/admin', label: 'Dashboard' },
        { href: '/admin/users', label: 'Users' },
        { href: '/admin/completed-donations', label: 'Completed Donations' },
        { href: '/admin/analytics', label: 'Analytics' },
      ];
    } else if (user.role === 'ngo') {
      return [
        { href: '/ngo', label: 'Discover' },
        { href: '/ngo/requests', label: 'My Requests' },
        { href: '/ngo/disposal', label: 'Disposal' },
        { href: '/ngo/impact', label: 'Impact' },
      ];
    } else {
      return [
        { href: '/restaurant', label: 'Inventory' },
        { href: '/restaurant/donations', label: 'Donations' },
        { href: '/restaurant/disposal', label: 'Disposal' },
        { href: '/restaurant/rewards', label: 'Rewards' },
        { href: '/restaurant/analytics', label: 'Analytics' },
      ];
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <nav className="bg-white border-b border-gray-200/80 shadow-sm sticky top-0 z-50 backdrop-blur-md bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo and Navigation */}
            <div className="flex items-center space-x-8">
              <Link href={user.role === 'admin' ? '/admin' : user.role === 'ngo' ? '/ngo' : '/restaurant'} className="flex-shrink-0">
                <div className="flex items-center space-x-2">
                  <div className="w-10 h-10 overflow-hidden">
                    <img 
                      src="https://images.vexels.com/media/users/3/254185/isolated/preview/bdb081449443b1729a9d10b0e96d7a08-happy-bread-food-character-cartoon.png" 
                      alt="ShareBite Logo" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <span className="text-2xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 bg-clip-text text-transparent">
                    ShareBite
                  </span>
                </div>
              </Link>
              
              {/* Navigation Links */}
              <div className="hidden md:flex items-center space-x-1">
                {getNavLinks().map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`relative inline-flex items-center px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      pathname === link.href
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/80'
                    }`}
                  >
                    {link.label}
                    {pathname === link.href && (
                      <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white rounded-full"></span>
                    )}
                  </Link>
                ))}
              </div>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-4">
              {user.role === 'restaurant' && (
                <div className="hidden sm:block">
                  <MLStatusIndicator />
                </div>
              )}
              
              {/* Notifications */}
              <div className="relative">
                <Link
                  href={user.role === 'admin' ? '/admin/notifications' : user.role === 'ngo' ? '/ngo/notifications' : '/restaurant/notifications'}
                  className="relative p-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all group"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {notificationCount > 0 && (
                    <span className="absolute top-1 right-1 block h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-white shadow-sm"></span>
                  )}
                </Link>
              </div>

              {/* User Info */}
              <div className="hidden sm:flex items-center space-x-3 px-4 py-2 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-900">{user.name}</span>
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs font-medium ${
                      user.role === 'admin' ? 'text-purple-600' :
                      user.role === 'ngo' ? 'text-blue-600' :
                      'text-emerald-600'
                    }`}>
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </span>
                    {user.role === 'ngo' && user.rating && (
                      <div className="flex items-center">
                        <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span className="text-xs text-gray-600 ml-1">{user.rating.toFixed(1)}</span>
                      </div>
                    )}
                    {user.role === 'restaurant' && user.reward_points !== undefined && (
                      <span className="text-xs text-yellow-600 font-medium">
                        {user.reward_points} pts
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-semibold text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all border border-gray-200 hover:border-gray-300"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}

