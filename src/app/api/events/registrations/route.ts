import { NextRequest, NextResponse } from 'next/server';
import { getTableData } from '@/lib/sheets';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/events/registrations?company={companyName}&event={eventName} - Get registrations for an event
export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get parameters from query
    const { searchParams } = new URL(request.url);
    const companyName = searchParams.get('company');
    const eventName = searchParams.get('event');
    
    if (!companyName || !eventName) {
      return NextResponse.json(
        { error: 'Company name and event name are required' },
        { status: 400 }
      );
    }
    
    // Check if user is admin or the company owner
    if (session.user.type !== 'admin' && session.user.name !== companyName) {
      return NextResponse.json(
        { error: 'Unauthorized to access this company\'s event registrations' },
        { status: 403 }
      );
    }
    
    // Get event registrations
    const tableData = await getTableData(companyName, eventName);
    
    // First row is headers
    const originalHeaders = tableData[0];
    
    // Find indices of settings columns
    const imageIndex = originalHeaders.indexOf('Image');
    const descriptionIndex = originalHeaders.indexOf('EventDescription');
    const dateIndex = originalHeaders.indexOf('EventDate');
    const statusIndex = originalHeaders.indexOf('EventStatus');
    const nationalIdIndex = originalHeaders.indexOf('National ID');
    
    // Create a list of indices to exclude (only settings columns)
    const settingsIndices = [imageIndex, descriptionIndex, dateIndex, statusIndex].filter(index => index !== -1);
    
    // Create the final list of indices to exclude
    // For admin, only exclude settings columns
    // For non-admin, also exclude National ID
    const excludeIndices = session.user.type === 'admin' 
      ? settingsIndices 
      : (nationalIdIndex !== -1 
          ? [...settingsIndices, nationalIdIndex] 
          : settingsIndices);
    
    // Filter out excluded columns from headers
    const headers = originalHeaders.filter((header, index) => !excludeIndices.includes(index));
    
    // Map registrations to objects, filtering out settings rows and columns
    const registrations = tableData.slice(1)
      .filter(row => {
        // Skip rows that only contain settings data
        const isSettingsRow = row.every((cell, index) => {
          // If this is a settings column and has data, or if the cell is empty
          return (
            (imageIndex !== -1 && index === imageIndex && cell) ||
            (descriptionIndex !== -1 && index === descriptionIndex && cell) ||
            (dateIndex !== -1 && index === dateIndex && cell) ||
            (statusIndex !== -1 && index === statusIndex && cell) ||
            !cell
          );
        });
        
        // Keep only non-settings rows
        return !isSettingsRow;
      })
      .map((row) => {
        const registration: Record<string, string> = {};
        
        // Only include non-excluded columns
        originalHeaders.forEach((header, index) => {
          if (!excludeIndices.includes(index)) {
            registration[header] = row[index] || '';
          }
        });
        
        return registration;
      });
    
    return NextResponse.json({
      headers,
      registrations,
      total: registrations.length,
    });
  } catch (error) {
    console.error('Error getting event registrations:', error);
    return NextResponse.json(
      { error: 'Failed to get event registrations' },
      { status: 500 }
    );
  }
} 