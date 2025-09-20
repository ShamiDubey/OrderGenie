'use client';

import { useState } from 'react';
import { FaceRecognition } from '@/components/face/FaceRecognition';
import { FaceRegister } from '@/components/face/FaceRegister';

type Tab = 'recognize' | 'register';

export default function FacePage() {
  const [activeTab, setActiveTab] = useState<Tab>('recognize');

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Face ID</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-8">
        <button
          onClick={() => setActiveTab('recognize')}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            activeTab === 'recognize'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Recognize Face
        </button>
        <button
          onClick={() => setActiveTab('register')}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            activeTab === 'register'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Register New Face
        </button>
      </div>

      {/* Content */}
      {activeTab === 'recognize' ? (
        <FaceRecognition />
      ) : (
        <FaceRegister
          onSuccess={() => {
            // Optionally switch to recognize tab after successful registration
          }}
        />
      )}

      {/* Info */}
      <div className="mt-8 p-6 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">How it works</h3>
        <ul className="text-blue-700 text-sm space-y-2">
          <li>
            <strong>Recognize:</strong> Upload a photo and we will identify registered users
          </li>
          <li>
            <strong>Register:</strong> Create a new face profile with your name and email
          </li>
          <li>
            For best results, use a clear, well-lit photo with a visible face
          </li>
        </ul>
      </div>
    </div>
  );
}
