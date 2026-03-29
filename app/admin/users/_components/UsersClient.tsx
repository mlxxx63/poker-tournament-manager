'use client';

import { useState } from 'react';
import type { AdminUser } from '../page';

export default function UsersClient({ initialUsers }: { initialUsers: AdminUser[] }) {
  const [users, setUsers] = useState<AdminUser[]>(initialUsers);

  // Add form state
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'operator' | 'owner'>('operator');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');

  async function refreshUsers() {
    const res = await fetch('/api/users');
    if (res.ok) setUsers(await res.json());
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddError('');
    setAdding(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, display_name: displayName, password, role }),
      });
      const data = await res.json();
      if (!res.ok) { setAddError(data.error ?? 'Failed to create user.'); return; }
      setUsername(''); setDisplayName(''); setPassword(''); setRole('operator');
      await refreshUsers();
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`Remove "${name}" from admin access?`)) return;
    const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
    if (res.ok) await refreshUsers();
  }

  return (
    <main className="flex-1 px-8 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Admin Users</h1>
        <p className="text-gray-400 text-sm mt-1">Manage who can access the admin panel.</p>
      </div>

      {/* Current admins */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden mb-8">
        <div className="px-5 py-3.5 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-gray-200">Current Admins</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 text-xs uppercase tracking-wide border-b border-gray-800">
              <th className="text-left px-5 py-3">Name</th>
              <th className="text-left px-5 py-3">Username</th>
              <th className="text-left px-5 py-3">Role</th>
              <th className="text-left px-5 py-3">Added</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/40 transition">
                <td className="px-5 py-3.5 font-medium text-white">{u.display_name}</td>
                <td className="px-5 py-3.5 text-gray-400 font-mono text-xs">{u.username}</td>
                <td className="px-5 py-3.5">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    u.role === 'owner'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 text-gray-300'
                  }`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-gray-500 text-xs">
                  {new Date(u.created_at).toLocaleDateString('en-CA')}
                </td>
                <td className="px-5 py-3.5 text-right">
                  {u.role !== 'owner' && (
                    <button
                      onClick={() => handleDelete(u.id, u.display_name)}
                      className="text-xs text-red-400 hover:text-red-300 transition"
                    >
                      Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add user form */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-200 mb-5">Add New Admin</h2>
        <form onSubmit={handleAdd} className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Display Name</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              placeholder="Mike Smith"
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="mike"
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'operator' | 'owner')}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="operator">Operator — run tournaments</option>
              <option value="owner">Owner — full access</option>
            </select>
          </div>

          {addError && (
            <div className="col-span-2">
              <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                {addError}
              </p>
            </div>
          )}

          <div className="col-span-2">
            <button
              type="submit"
              disabled={adding}
              className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded-lg transition"
            >
              {adding ? 'Adding...' : 'Add Admin'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
