import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, addToTable, getTableData } from '@/lib/sheets';

// POST /api/events/register - Register for an event
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const {
      companyName: rawCompanyName,
      eventName: rawEventName,
      name,
      phone,
      email,
      gender,
      college,
      status,
      nationalId,
    } = body;
    
    // Ensure company name and event name are properly decoded and normalized
    const companyName = decodeURIComponent(rawCompanyName).trim();
    const eventId = decodeURIComponent(rawEventName).trim();
    
    console.log('Registration request received:', {
      companyName,
      eventId,
      name,
      email,
    });
    
    // Validate required fields
    if (!companyName || !eventId || !name || !phone || !email || !gender || !college || !status || !nationalId) {
      console.log('Validation failed - missing fields:', {
        companyName: !!companyName,
        eventId: !!eventId,
        name: !!name,
        phone: !!phone,
        email: !!email,
        gender: !!gender,
        college: !!college,
        status: !!status,
        nationalId: !!nationalId,
      });
      
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }
    
    // Validate phone number (simple validation)
    const phoneRegex = /^\d{10,15}$/;
    if (!phoneRegex.test(phone)) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      );
    }
    
    // Check if the company exists
    try {
      console.log('Checking if company exists:', companyName);
      const sheetData = await getSheetData(companyName);
      
      if (!sheetData || sheetData.length === 0) {
        console.error(`Company sheet ${companyName} is empty or does not exist`);
        return NextResponse.json(
          { error: 'Company not found' },
          { status: 404 }
        );
      }
      
      // Check if the company is disabled
      const companiesData = await getSheetData('companies');
      const companies = companiesData.slice(1); // Skip header row
      
      // Find the company (case-insensitive match)
      const company = companies.find((row: any) => row[1].trim().toLowerCase() === companyName.toLowerCase());
      
      if (company) {
        const status = company[5] || 'enabled';
        if (status === 'disabled') {
          return NextResponse.json(
            { error: 'Company is disabled, registration is not available' },
            { status: 403 }
          );
        }
      } else {
        console.error(`Company ${companyName} not found in companies sheet`);
        return NextResponse.json(
          { error: 'Company not found' },
          { status: 404 }
        );
      }
      
      // Find the exact event table name by searching the data first
      const exactEventName = findExactEventName(sheetData, eventId);
      
      if (!exactEventName) {
        console.error(`Event ${eventId} not found in company ${companyName}`);
        return NextResponse.json(
          { error: 'Event not found' },
          { status: 404 }
        );
      }
      
      console.log(`Found exact event name: "${exactEventName}" for event ID: "${eventId}"`);
      
      // Check if the event exists and get its data
      try {
        console.log('Checking if event exists:', { companyName, exactEventName });
        const tableData = await getTableData(companyName, exactEventName);
        
        if (!tableData || tableData.length === 0) {
          console.error(`Event ${exactEventName} not found in company ${companyName}`);
          return NextResponse.json(
            { error: 'Event not found' },
            { status: 404 }
          );
        }
        
        // Check if the event is disabled
        const headers = tableData[0];
        const statusIndex = headers.findIndex(h => h === 'EventStatus');
        
        if (statusIndex !== -1 && tableData.length > 1) {
          const eventStatus = tableData[1][statusIndex];
          if (eventStatus === 'disabled') {
            return NextResponse.json(
              { error: 'Event registration is currently disabled' },
              { status: 403 }
            );
          }
        }
        
        // Check if the person is already registered (by email or phone)
        // Skip header row
        const registrationData = tableData.slice(1);
        
        // Find registration with matching email or phone
        const existingRegistration = registrationData.find(
          (row) => row[2] === email || row[1] === phone
        );
        
        if (existingRegistration) {
          return NextResponse.json(
            { error: 'You are already registered for this event' },
            { status: 400 }
          );
        }
        
        // Add registration to the event table
        const registrationDate = new Date().toISOString();
        
        console.log('Adding registration to table:', {
          companyName,
          exactEventName,
          name,
          email,
        });
        
        await addToTable(companyName, exactEventName, [
          name,
          phone,
          email,
          gender,
          college,
          status,
          nationalId,
          registrationDate,
          '', // No image for registrations
        ]);
        
        console.log('Registration successful');
        
        return NextResponse.json({
          success: true,
          message: 'Registration successful',
          registration: {
            name,
            email,
            registrationDate,
          },
        });
      } catch (error) {
        console.error('Error checking event:', error);
        return NextResponse.json(
          { error: 'Event not found' },
          { status: 404 }
        );
      }
    } catch (error) {
      console.error('Error checking company:', error);
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Error registering for event:', error);
    return NextResponse.json(
      { error: 'Failed to register for event' },
      { status: 500 }
    );
  }
}

// Helper function to find the exact event name in the sheet data
function findExactEventName(data: any[], eventId: string): string | null {
  // Normalize the event ID for case-insensitive comparison
  const normalizedEventId = eventId.trim().toLowerCase();
  
  for (let i = 0; i < data.length; i++) {
    // Check if this row is a table name (has only one cell)
    if (data[i] && data[i].length === 1 && data[i][0]) {
      const tableName = data[i][0];
      
      // Check if this table name matches the event ID (case insensitive)
      if (tableName.trim().toLowerCase() === normalizedEventId) {
        console.log(`Found matching event: "${tableName}" for ID: "${eventId}"`);
        return tableName; // Return the exact table name as it appears in the sheet
      }
    }
  }
  
  console.error(`Event "${eventId}" not found in company sheet`);
  return null;
} 