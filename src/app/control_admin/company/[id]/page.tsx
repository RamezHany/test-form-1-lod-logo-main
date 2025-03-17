'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

interface Event {
  id: string;
  name: string;
  image: string | null;
  registrations: number;
  status?: string;
}

interface Company {
  id: string;
  name: string;
  username: string;
  image: string | null;
  status?: string;
}

export default function CompanyEventsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const companyId = params.id as string;
  
  const [company, setCompany] = useState<Company | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedCompany, setEditedCompany] = useState<Partial<Company>>({});
  const [newPassword, setNewPassword] = useState('');
  const [newImage, setNewImage] = useState<string | null>(null);

  const fetchCompanyAndEvents = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch companies to find the current one
      const companiesResponse = await fetch('/api/companies');
      
      if (!companiesResponse.ok) {
        throw new Error('Failed to fetch companies');
      }
      
      const companiesData = await companiesResponse.json();
      const currentCompany = companiesData.companies.find(
        (c: Company) => c.id === companyId
      );
      
      if (!currentCompany) {
        throw new Error('Company not found');
      }
      
      setCompany(currentCompany);
      setEditedCompany({
        name: currentCompany.name,
        username: currentCompany.username,
      });
      
      // Fetch events for this company
      const eventsResponse = await fetch(`/api/events?company=${currentCompany.name}`);
      
      if (!eventsResponse.ok) {
        throw new Error('Failed to fetch events');
      }
      
      const eventsData = await eventsResponse.json();
      setEvents(eventsData.events || []);
    } catch (error) {
      console.error('Error fetching company and events:', error);
      setError('Failed to load company and events');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    // Redirect if not authenticated or not admin
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated' && session.user.type !== 'admin') {
      router.push('/');
      return;
    }

    // Fetch company and events
    if (status === 'authenticated') {
      fetchCompanyAndEvents();
    }
  }, [status, session, router, fetchCompanyAndEvents]);

  const handleViewRegistrations = (eventId: string) => {
    if (!company) return;
    router.push(`/control_admin/company/${companyId}/event/${eventId}`);
  };

  const handleToggleEventStatus = async (eventId: string, currentStatus: string) => {
    if (!company) return;
    
    const newStatus = currentStatus === 'enabled' ? 'disabled' : 'enabled';
    console.log(`Toggling event status: ${eventId} from ${currentStatus} to ${newStatus}`);
    
    try {
      const response = await fetch('/api/events', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company: company.name,
          event: eventId,
          status: newStatus,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        throw new Error(`Failed to update event status: ${errorData.error || response.statusText}`);
      }
      
      // Update local state
      setEvents(events.map(event => 
        event.id === eventId 
          ? { ...event, status: newStatus } 
          : event
      ));
    } catch (error) {
      console.error('Error updating event status:', error);
      setError('Failed to update event status');
    }
  };

  const handleToggleCompanyStatus = async () => {
    if (!company) return;
    
    const newStatus = company.status === 'enabled' ? 'disabled' : 'enabled';
    
    try {
      const response = await fetch('/api/companies', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: company.id,
          status: newStatus,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update company status');
      }
      
      // Update local state
      setCompany({ ...company, status: newStatus });
    } catch (error) {
      console.error('Error updating company status:', error);
      setError('Failed to update company status');
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setNewImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveCompany = async () => {
    if (!company) return;
    
    try {
      const updateData: {
        id: string;
        name?: string;
        username?: string;
        password?: string;
        image?: string;
        status?: string;
      } = {
        id: company.id,
      };
      
      if (editedCompany.name && editedCompany.name !== company.name) {
        updateData.name = editedCompany.name;
      }
      
      if (editedCompany.username && editedCompany.username !== company.username) {
        updateData.username = editedCompany.username;
      }
      
      if (newPassword) {
        updateData.password = newPassword;
      }
      
      if (newImage) {
        updateData.image = newImage;
      }
      
      // Only send request if there are changes
      if (Object.keys(updateData).length > 1) {
        const response = await fetch('/api/companies', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateData),
        });
        
        if (!response.ok) {
          throw new Error('Failed to update company');
        }
        
        const result = await response.json();
        
        // Update local state
        setCompany({
          ...company,
          name: result.company.name,
          username: result.company.username,
          image: result.company.image,
        });
        
        // Reset form
        setNewPassword('');
        setNewImage(null);
        setIsEditing(false);
        
        // Refresh data to get updated events (in case company name changed)
        fetchCompanyAndEvents();
      } else {
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error updating company:', error);
      setError('Failed to update company');
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-red-500">Company not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center">
            {company.image ? (
              <div className="h-12 w-12 mr-4 relative">
                <Image
                  src={company.image}
                  alt={company.name}
                  fill
                  className="rounded-full object-cover"
                />
              </div>
            ) : (
              <div className="h-12 w-12 mr-4 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-gray-500 text-lg">
                  {company.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{company.name} Events</h1>
              <div className="flex items-center mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  company.status === 'disabled' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                }`}>
                  {company.status || 'enabled'}
                </span>
                <button
                  onClick={handleToggleCompanyStatus}
                  className="ml-2 text-xs text-blue-600 hover:text-blue-800"
                >
                  Toggle Status
                </button>
              </div>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              {isEditing ? 'Cancel' : 'Edit Company'}
            </button>
            <Link
              href="/control_admin"
              className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          {isEditing && (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Edit Company</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={editedCompany.name || ''}
                    onChange={(e) => setEditedCompany({...editedCompany, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={editedCompany.username || ''}
                    onChange={(e) => setEditedCompany({...editedCompany, username: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Password (leave blank to keep current)
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Logo
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  {newImage && (
                    <div className="mt-2 h-20 w-20 relative">
                      <Image
                        src={newImage}
                        alt="New company logo"
                        fill
                        className="rounded-full object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-6">
                <button
                  onClick={handleSaveCompany}
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                  Save Changes
                </button>
              </div>
            </div>
          )}
          
          {events.length === 0 ? (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6 text-center">
              <p className="text-gray-500">No events found for this company.</p>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <ul className="divide-y divide-gray-200">
                {events.map((event) => (
                  <li key={event.id} className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center">
                      {event.image ? (
                        <div className="h-16 w-16 mr-4 relative">
                          <Image
                            src={event.image}
                            alt={event.name}
                            fill
                            className="rounded object-cover"
                          />
                        </div>
                      ) : (
                        <div className="h-16 w-16 mr-4 bg-gray-200 rounded flex items-center justify-center">
                          <span className="text-gray-500 text-lg">
                            {event.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{event.name}</h3>
                        <div className="flex items-center">
                          <p className="text-sm text-gray-500 mr-2">
                            {event.registrations} registrations
                          </p>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            event.status === 'disabled' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {event.status || 'enabled'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-4 items-center">
                      <div className="flex items-center">
                        <div className="inline-flex items-center cursor-pointer" onClick={() => handleToggleEventStatus(event.id, event.status || 'enabled')}>
                          <div className={`relative w-11 h-6 ${event.status === 'disabled' ? 'bg-gray-200' : 'bg-blue-600'} rounded-full peer after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${event.status !== 'disabled' ? 'after:translate-x-full' : ''}`}></div>
                          <span className="ms-3 text-sm font-medium text-gray-900">
                            {event.status === 'disabled' ? 'Disabled' : 'Enabled'}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleViewRegistrations(event.id)}
                        className="bg-blue-100 hover:bg-blue-200 text-blue-800 font-semibold py-2 px-4 rounded"
                      >
                        View Registrations
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}