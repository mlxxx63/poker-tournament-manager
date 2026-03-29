'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';

const NAV_LINKS = [
  { href: '/admin', label: 'Dashboard', icon: '🏠', exact: true },
  { href: '/admin/tournament/new', label: 'New Tournament', icon: '➕', exact: false },
  { href: '/admin/history', label: 'History', icon: '📜', exact: false },
];

const OWNER_LINKS = [
  { href: '/admin/users', label: 'Admin Users', icon: '👤', exact: false },
];

export default function AdminNav({
  userName,
  userRole,
}: {
  userName: string;
  userRole: string;
}) {
  const pathname = usePathname();

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  return (
    <aside className="w-56 shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col min-h-screen">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <span className="text-lg">♠</span>
          <span className="font-bold text-sm text-white">Poker Manager</span>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 p-3 space-y-0.5">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition ${
              isActive(link.href, link.exact)
                ? 'bg-purple-600 text-white font-medium'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            <span className="text-base">{link.icon}</span>
            {link.label}
          </Link>
        ))}

        {userRole === 'owner' && (
          <>
            <div className="pt-4 pb-1 px-3">
              <p className="text-xs text-gray-600 uppercase tracking-wider font-medium">Owner</p>
            </div>
            {OWNER_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition ${
                  isActive(link.href, link.exact)
                    ? 'bg-purple-600 text-white font-medium'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <span className="text-base">{link.icon}</span>
                {link.label}
              </Link>
            ))}
          </>
        )}
      </nav>

      {/* User + sign out */}
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
        <button
          onClick={() => signOut({ callbackUrl: '/admin/login' })}
          className="w-full mt-0.5 text-left px-3 py-1.5 text-xs text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
