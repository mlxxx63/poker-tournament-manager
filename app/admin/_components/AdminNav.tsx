'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useState } from 'react';

const NAV_LINKS = [
  { href: '/admin', label: 'Dashboard', icon: '♠', exact: true },
  { href: '/admin/tournament/new', label: 'New Tournament', icon: '+', exact: false },
];

const OWNER_LINKS = [
  { href: '/admin/users', label: 'Admin Users', icon: '👤', exact: false },
];

export default function AdminNav({ userName, userRole }: { userName: string; userRole: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  const navContent = (
    <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col h-full">
      <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg text-purple-400">♠</span>
          <span className="font-bold text-sm text-white">Poker Manager</span>
        </div>
        <button onClick={() => setOpen(false)} className="lg:hidden text-gray-500 hover:text-white p-1">✕</button>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        {NAV_LINKS.map((link) => (
          <Link key={link.href} href={link.href} onClick={() => setOpen(false)}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition ${
              isActive(link.href, link.exact)
                ? 'bg-purple-600 text-white font-medium'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}>
            <span>{link.icon}</span>{link.label}
          </Link>
        ))}

        {userRole === 'owner' && (
          <>
            <div className="pt-4 pb-1 px-3">
              <p className="text-xs text-gray-600 uppercase tracking-wider">Owner</p>
            </div>
            {OWNER_LINKS.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition ${
                  isActive(link.href, link.exact)
                    ? 'bg-purple-600 text-white font-medium'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}>
                <span>{link.icon}</span>{link.label}
              </Link>
            ))}
          </>
        )}
      </nav>

      <div className="border-t border-gray-800 p-3">
        <div className="flex items-center gap-2.5 px-3 py-2">
          <div className="w-7 h-7 rounded-full bg-purple-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">{userName}</p>
            <p className="text-xs text-gray-500 capitalize">{userRole}</p>
          </div>
        </div>
        <button onClick={() => signOut({ callbackUrl: '/admin/login' })}
          className="w-full mt-0.5 text-left px-3 py-1.5 text-xs text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition">
          Sign out
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-50 bg-gray-900 border border-gray-800 text-gray-300 hover:text-white p-2 rounded-lg shadow-lg"
        aria-label="Open menu"
      >
        <span className="block w-4 h-0.5 bg-current mb-1" />
        <span className="block w-4 h-0.5 bg-current mb-1" />
        <span className="block w-4 h-0.5 bg-current" />
      </button>

      {/* Mobile overlay */}
      {open && (
        <div className="lg:hidden fixed inset-0 bg-black/60 z-40" onClick={() => setOpen(false)} />
      )}

      {/* Mobile drawer */}
      <div className={`lg:hidden fixed inset-y-0 left-0 z-50 transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        {navContent}
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:block shrink-0">
        {navContent}
      </div>
    </>
  );
}
