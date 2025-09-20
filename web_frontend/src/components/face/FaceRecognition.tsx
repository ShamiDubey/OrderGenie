'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { recognizeFace } from '@/lib/api';
import { FaceMatch } from '@/types';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export function FaceRecognition() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [matches, setMatches] = useState<FaceMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
      setMatches([]);
      setError(null);
    }
  };

  const handleRecognize = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setError(null);

    try {
      const result = await recognizeFace(selectedFile);

      if (result.success && result.data) {
        setMatches(result.data);
        if (result.data.length === 0) {
          setError('No matching profiles found');
        }
      } else {
        setError(result.error || 'Recognition failed');
      }
    } catch (err) {
      setError('Failed to recognize face');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreview(null);
    setMatches([]);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">Face Recognition</h2>

      <div className="space-y-4">
        {/* Upload Area */}
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          {preview ? (
            <div className="relative w-48 h-48 mx-auto">
              <Image src={preview} alt="Preview" fill className="object-cover rounded-lg" />
            </div>
          ) : (
            <div className="text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p>Click to upload an image</p>
              <p className="text-sm text-gray-400">JPG, PNG up to 10MB</p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 justify-center">
          <button
            onClick={handleRecognize}
            disabled={!selectedFile || loading}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <LoadingSpinner size="sm" />
                Recognizing...
              </>
            ) : (
              'Recognize Face'
            )}
          </button>

          {(selectedFile || matches.length > 0) && (
            <button
              onClick={handleReset}
              className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300"
            >
              Reset
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-center">
            {error}
          </div>
        )}

        {/* Results */}
        {matches.length > 0 && (
          <div className="mt-6">
            <h3 className="font-semibold mb-3">Matches Found ({matches.length})</h3>
            <div className="space-y-3">
              {matches.map((match, index) => (
                <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{match.profile.name}</p>
                    <p className="text-sm text-gray-500">{match.profile.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-green-600">
                      {(match.similarity * 100).toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500">similarity</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
