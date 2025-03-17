import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, getTableData, createTable, updateRow, addToTable } from '@/lib/sheets';
import { uploadImage } from '@/lib/github';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/events?company={companyName} - Get all events for a company
export async function GET(request: NextRequest) {
  try {
    // Get company name from query parameters
    const { searchParams } = new URL(request.url);
    const rawCompanyName = searchParams.get('company');
    
    if (!rawCompanyName) {
      return NextResponse.json(
        { error: 'Company name is required' },
        { status: 400 }
      );
    }
    
    // Ensure company name is properly decoded
    const companyName = decodeURIComponent(rawCompanyName);
    console.log('Getting events for company:', companyName);
    
    // Check if company is disabled
    // Get companies data to check status
    const companiesData = await getSheetData('companies');
    const companies = companiesData.slice(1); // Skip header row
    
    // Find the company
    const company = companies.find((row) => row[1] === companyName);
    
    if (company) {
      const status = company[5] || 'enabled';
      if (status === 'disabled') {
        return NextResponse.json(
          { error: 'Company is disabled' },
          { status: 403 }
        );
      }
    }
    
    // Get company sheet data
    const data = await getSheetData(companyName);
    
    // Find all tables (events) in the sheet
    const events = [];
    for (let i = 0; i < data.length; i++) {
      // If a row has only one cell and it's not empty, it's likely a table name (event)
      if (data[i].length === 1 && data[i][0] && !data[i][0].startsWith('ID')) {
        const eventName = data[i][0];
        
        // Get the next row for headers
        const headers = data[i + 1] || [];
        
        // Find the image URL if it exists in the headers
        const imageIndex = headers.findIndex(h => h === 'Image');
        let imageUrl = null;
        
        if (imageIndex !== -1 && data[i + 2] && data[i + 2][imageIndex]) {
          imageUrl = data[i + 2][imageIndex];
        }
        
        // Find the event description if it exists in the headers
        const descriptionIndex = headers.findIndex(h => h === 'EventDescription');
        let description = '';
        
        if (descriptionIndex !== -1 && data[i + 2] && data[i + 2][descriptionIndex]) {
          description = data[i + 2][descriptionIndex];
        }
        
        // Find the event date if it exists in the headers
        const dateIndex = headers.findIndex(h => h === 'EventDate');
        let eventDate = '';
        
        if (dateIndex !== -1 && data[i + 2] && data[i + 2][dateIndex]) {
          eventDate = data[i + 2][dateIndex];
        }
        
        // Find the event status if it exists in the headers
        const statusIndex = headers.findIndex(h => h === 'EventStatus');
        let status = 'enabled'; // Default to enabled
        
        if (statusIndex !== -1 && data[i + 2] && data[i + 2][statusIndex]) {
          status = data[i + 2][statusIndex];
        }
        
        events.push({
          id: eventName,
          name: eventName,
          image: imageUrl,
          description: description,
          date: eventDate,
          status: status,
          registrations: 0, // We'll calculate this later
          companyStatus: company ? (company[5] || 'enabled') : 'enabled',
        });
      }
    }
    
    // Calculate registrations for each event
    for (const event of events) {
      try {
        const eventData = await getTableData(companyName, event.id);
        
        // Get the headers row
        const headers = eventData[0] || [];
        
        // Find the indices of the settings columns
        const imageIndex = headers.indexOf('Image');
        const descriptionIndex = headers.indexOf('EventDescription');
        const dateIndex = headers.indexOf('EventDate');
        const statusIndex = headers.indexOf('EventStatus');
        
        // Count only rows that are actual registrations (not settings)
        let registrationCount = 0;
        
        for (let i = 1; i < eventData.length; i++) {
          const row = eventData[i];
          
          // Skip rows that only contain settings data
          const isSettingsRow = row.every((cell, index) => {
            // If this is a settings column and has data, or if the cell is empty
            return (
              (index === imageIndex && cell) ||
              (index === descriptionIndex && cell) ||
              (index === dateIndex && cell) ||
              (index === statusIndex && cell) ||
              !cell
            );
          });
          
          if (!isSettingsRow) {
            registrationCount++;
          }
        }
        
        event.registrations = registrationCount;
      } catch (error) {
        console.error(`Error getting data for event ${event.id}:`, error);
        // Continue with the next event
      }
    }
    
    return NextResponse.json({ events });
  } catch (error) {
    console.error('Error getting events:', error);
    return NextResponse.json(
      { error: 'Failed to get events' },
      { status: 500 }
    );
  }
}

// POST /api/events - Create a new event
export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the origin from request headers
    const origin = request.headers.get('origin') || 'https://your-production-domain.com';
    
    // Parse request body
    const { companyName, eventName, eventDescription, eventDate, image } = await request.json();
    
    // Validate required fields
    if (!companyName || !eventName || !eventDescription || !eventDate) {
      return NextResponse.json(
        { error: 'Company name, event name, description and date are required' },
        { status: 400 }
      );
    }
    
    // Check if user is admin or the company owner
    if (session.user.type !== 'admin' && session.user.name !== companyName) {
      return NextResponse.json(
        { error: 'Unauthorized to create events for this company' },
        { status: 403 }
      );
    }
    
    // Upload image if provided
    let imageUrl = null;
    if (image) {
      const fileName = `event_${companyName}_${eventName}_${Date.now()}.jpg`;
      const uploadResult = await uploadImage(fileName, image, 'events');
      
      if (uploadResult.success) {
        imageUrl = uploadResult.url;
      }
    }
    
    // Define headers for the event table
    const headers = [
      'Name',
      'Phone',
      'Email',
      'Gender',
      'College',
      'Status', // Student or Graduate
      'National ID',
      'Registration Date',
      'Image', // For the event banner
      'EventDescription', // Event description
      'EventDate', // Event date
      'EventStatus', // enabled or disabled
    ];
    
    // Create the event table in the company sheet
    await createTable(companyName, eventName, headers);
    
    // Create a separate row for settings data
    const settingsRow = Array(headers.length).fill('');
    const imageIndex = headers.findIndex(h => h === 'Image');
    const descriptionIndex = headers.findIndex(h => h === 'EventDescription');
    const dateIndex = headers.findIndex(h => h === 'EventDate');
    const statusIndex = headers.findIndex(h => h === 'EventStatus');
    
    // Add settings data to the row
    if (imageUrl && imageIndex !== -1) {
      settingsRow[imageIndex] = imageUrl;
    }
    
    if (descriptionIndex !== -1) {
      settingsRow[descriptionIndex] = eventDescription;
    }
    
    if (dateIndex !== -1) {
      settingsRow[dateIndex] = eventDate;
    }
    
    if (statusIndex !== -1) {
      settingsRow[statusIndex] = 'enabled'; // Set default status to enabled
    }
    
    // Add the settings row to the table
    await addToTable(companyName, eventName, settingsRow);
    
    return NextResponse.json({
      success: true,
      event: {
        id: eventName,
        name: eventName,
        image: imageUrl,
        description: eventDescription,
        date: eventDate,
        status: 'enabled',
        registrationUrl: `${origin}/${companyName}/${eventName}`,
      },
    });
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 }
    );
  }
}

// PUT /api/events - Update event status
export async function PUT(request: NextRequest) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const { company, event, status } = await request.json();
    
    // Validate required fields
    if (!company || !event || !status) {
      return NextResponse.json(
        { error: 'Company name, event name, and status are required' },
        { status: 400 }
      );
    }
    
    // Check if status is valid
    if (status !== 'enabled' && status !== 'disabled') {
      return NextResponse.json(
        { error: 'Status must be either "enabled" or "disabled"' },
        { status: 400 }
      );
    }
    
    // Check if user is admin or the company owner
    if (session.user.type !== 'admin' && session.user.name !== company) {
      return NextResponse.json(
        { error: 'Unauthorized to update events for this company' },
        { status: 403 }
      );
    }
    
    // Get company sheet data
    const data = await getSheetData(company);
    
    // Find the event table
    let eventIndex = -1;
    for (let i = 0; i < data.length; i++) {
      if (data[i].length === 1 && data[i][0] === event) {
        eventIndex = i;
        break;
      }
    }
    
    if (eventIndex === -1) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }
    
    // Find the headers row
    const headersRow = data[eventIndex + 1];
    if (!headersRow) {
      return NextResponse.json(
        { error: 'Event headers not found' },
        { status: 500 }
      );
    }
    
    // Find the EventStatus column index
    const statusIndex = headersRow.findIndex(h => h === 'EventStatus');
    
    // If EventStatus column doesn't exist, add it
    if (statusIndex === -1) {
      // Add EventStatus to headers
      headersRow.push('EventStatus');
      await updateRow(company, eventIndex + 1, headersRow);
      
      // Update the first data row with the status if it exists
      if (data[eventIndex + 2]) {
        const firstDataRow = [...data[eventIndex + 2]];
        firstDataRow.push(status);
        await updateRow(company, eventIndex + 2, firstDataRow);
      }
    } else {
      // Update the first data row with the status if it exists
      if (data[eventIndex + 2]) {
        const firstDataRow = [...data[eventIndex + 2]];
        firstDataRow[statusIndex] = status;
        await updateRow(company, eventIndex + 2, firstDataRow);
      }
    }
    
    return NextResponse.json({
      success: true,
      event: {
        id: event,
        name: event,
        status: status,
      },
    });
  } catch (error) {
    console.error('Error updating event:', error);
    return NextResponse.json(
      { error: 'Failed to update event' },
      { status: 500 }
    );
  }
} 