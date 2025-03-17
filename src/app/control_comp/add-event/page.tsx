'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AddEventPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [eventName, setEventName] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [registrationUrl, setRegistrationUrl] = useState('');

  useEffect(() => {
    // Redirect if not authenticated or not company
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated' && session.user.type !== 'company') {
      router.push('/');
      return;
    }
  }, [status, session, router]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('Image size should be less than 2MB');
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session?.user?.name) {
      setError('User session not found');
      return;
    }
    
    // Validate form
    if (!eventName) {
      setError('Event name is required');
      return;
    }
    
    if (!eventDescription) {
      setError('Event description is required');
      return;
    }
    
    if (!eventDate) {
      setError('Event date is required');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyName: session.user.name,
          eventName,
          eventDescription,
          eventDate,
          image,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create event');
      }
      
      // Show registration URL
      setRegistrationUrl(data.event.registrationUrl);
    } catch (error) {
      console.error('Error creating event:', error);
      setError(error instanceof Error ? error.message : 'Failed to create event');
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Add Event</h1>
          <Link
            href="/control_comp"
            className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
          >
            Back to Dashboard
          </Link>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}
            
            {registrationUrl ? (
              <div className="text-center">
                <h2 className="text-2xl font-semibold text-green-600 mb-4">
                  Event Created Successfully!
                </h2>
                <p className="mb-2">Share this registration link with participants:</p>
                <div className="bg-gray-100 p-4 rounded mb-6 break-all">
                  <a
                    href={registrationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {registrationUrl}
                  </a>
                </div>
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(registrationUrl);
                      alert('Registration URL copied to clipboard!');
                    }}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                  >
                    Copy Link
                  </button>
                  <Link
                    href="/control_comp"
                    className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
                  >
                    Back to Dashboard
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label
                    htmlFor="eventName"
                    className="block text-gray-700 text-sm font-bold mb-2"
                  >
                    Event Name
                  </label>
                  <input
                    type="text"
                    id="eventName"
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    disabled={loading}
                    placeholder="Enter event name"
                  />
                </div>
                
                <div className="mb-4">
                  <label
                    htmlFor="eventDescription"
                    className="block text-gray-700 text-sm font-bold mb-2"
                  >
                    Event Description
                  </label>
                  <textarea
                    id="eventDescription"
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    value={eventDescription}
                    onChange={(e) => setEventDescription(e.target.value)}
                    disabled={loading}
                    placeholder="Enter event description"
                    rows={4}
                  />
                </div>
                
                <div className="mb-4">
                  <label
                    htmlFor="eventDate"
                    className="block text-gray-700 text-sm font-bold mb-2"
                  >
                    Event Date
                  </label>
                  <input
                    type="date"
                    id="eventDate"
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    disabled={loading}
                  />
                </div>
                
                <div className="mb-6">
                  <label
                    htmlFor="image"
                    className="block text-gray-700 text-sm font-bold mb-2"
                  >
                    Event Banner (Optional)
                  </label>
                  <input
                    type="file"
                    id="image"
                    accept="image/*"
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    onChange={handleImageChange}
                    disabled={loading}
                  />
                  {image && (
                    <div className="mt-2 relative h-40 w-full overflow-hidden rounded">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image}
                        alt="Event Banner Preview"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                </div>
                
                <div className="flex items-center justify-between">
                  <button
                    type="submit"
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
                    disabled={loading}
                  >
                    {loading ? 'Creating...' : 'Create Event'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
} 