'use client';

import { useState, useEffect } from 'react';
import { getProfiles, deleteProfile } from '@/lib/api';
import { FaceProfile } from '@/types';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function AdminProfilesPage() {
  const [profiles, setProfiles] = useState<FaceProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfiles() {
      setLoading(true);
      const result = await getProfiles();
      if (result.success && result.data) {
        setProfiles(result.data);
      }
      setLoading(false);
    }
    fetchProfiles();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    setDeleting(id);
    const result = await deleteProfile(id);
    if (result.success) {
      setProfiles((prev) => prev.filter((p) => p.id !== id));
    } else {
      alert(result.error || 'Failed to delete profile');
    }
    setDeleting(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Face Profiles</h1>
        <a
          href="/face"
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Register Face
        </a>
      </div>

      {/* Profiles Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Name</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Email</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Embeddings</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Created</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {profiles.map((profile) => (
              <tr key={profile.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-purple-600 font-medium">
                        {profile.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="font-medium text-gray-800">{profile.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">{profile.email}</td>
                <td className="px-4 py-3 text-gray-600">
                  {profile.embeddings?.length || 0} embeddings
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {new Date(profile.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleDelete(profile.id, profile.name)}
                    disabled={deleting === profile.id}
                    className="text-red-600 hover:text-red-800 p-2 disabled:opacity-50"
                  >
                    {deleting === profile.id ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {profiles.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No face profiles registered</p>
          </div>
        )}
      </div>
    </div>
  );
}
