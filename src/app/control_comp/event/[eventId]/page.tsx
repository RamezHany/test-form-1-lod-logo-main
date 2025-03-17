'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { exportToPDF, exportToCSV } from '@/utils/export';

interface Registration {
  Name: string;
  Phone: string;
  Email: string;
  Gender: string;
  College: string;
  Status: string;
  'Registration Date': string;
  [key: string]: string | undefined;
}

export default function EventRegistrationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const eventId = params.eventId as string;
  
  const [eventName, setEventName] = useState('');
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchRegistrations = useCallback(async () => {
    if (!session?.user?.name) return;
    
    try {
      setLoading(true);
      
      // Fetch registrations for this event
      const response = await fetch(
        `/api/events/registrations?company=${session.user.name}&event=${eventId}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch registrations');
      }
      
      const data = await response.json();
      setRegistrations(data.registrations || []);
      setHeaders(data.headers || []);
      setEventName(eventId);
    } catch (error) {
      console.error('Error fetching registrations:', error);
      setError('Failed to load registrations');
    } finally {
      setLoading(false);
    }
  }, [session, eventId]);

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

    // Fetch registrations
    if (status === 'authenticated' && session.user.name) {
      fetchRegistrations();
    }
  }, [status, session, router, fetchRegistrations]);

  const handleExportPDF = () => {
    if (!session?.user?.name || !registrations.length) return;
    
    // Convert registrations to array format for PDF export
    const data = registrations.map((reg) => {
      return headers.map((header) => reg[header] || '');
    });
    
    exportToPDF(
      data,
      headers,
      `${session.user.name} - ${eventName} Registrations`,
      `${session.user.name}_${eventName}_registrations.pdf`
    );
  };

  const handleExportCSV = () => {
    if (!session?.user?.name || !registrations.length) return;
    
    // Convert registrations to array format for CSV export
    const data = registrations.map((reg) => {
      return headers.map((header) => reg[header] || '');
    });
    
    exportToCSV(
      data,
      headers,
      `${session.user.name}_${eventName}_registrations.csv`
    );
  };

  if (status === 'loading' || loading) {
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
          <h1 className="text-3xl font-bold text-gray-900">
            {eventName} Registrations
          </h1>
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
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          <div className="flex justify-between items-center mb-4">
            <p className="text-gray-600">
              Registration Link:{' '}
              <span className="text-blue-500">
                {`${process.env.NEXT_PUBLIC_URL || window.location.origin}/${session?.user?.name}/${eventId}`}
              </span>
            </p>
            <div className="flex space-x-2">
              <button
                onClick={handleExportPDF}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                disabled={registrations.length === 0}
              >
                Export PDF
              </button>
              <button
                onClick={handleExportCSV}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                disabled={registrations.length === 0}
              >
                Export CSV
              </button>
            </div>
          </div>
          
          {registrations.length === 0 ? (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6 text-center">
              <p className="text-gray-500">No registrations found for this event.</p>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {headers.map((header) => (
                        <th
                          key={header}
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {registrations.map((registration, index) => (
                      <tr key={index}>
                        {headers.map((header) => (
                          <td
                            key={`${index}-${header}`}
                            className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                          >
                            {registration[header] || ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 