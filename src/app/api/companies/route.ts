import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, appendToSheet, createSheet, updateRow, renameSheet } from '@/lib/sheets';
import { uploadImage } from '@/lib/github';
import bcrypt from 'bcryptjs';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/companies - Get all companies
export async function GET() {
  try {
    // Check if user is authenticated as admin
    const session = await getServerSession(authOptions);
    if (!session || session.user.type !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get companies data from Google Sheets
    const data = await getSheetData('companies');
    
    // Skip header row and map to objects
    const companies = data.slice(1).map((row) => ({
      id: row[0],
      name: row[1],
      username: row[2],
      // Don't include password
      image: row[4] || null,
      status: row[5] || 'enabled',
    }));
    
    return NextResponse.json({ companies });
  } catch (error) {
    console.error('Error getting companies:', error);
    return NextResponse.json(
      { error: 'Failed to get companies' },
      { status: 500 }
    );
  }
}

// POST /api/companies - Create a new company
export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated as admin
    const session = await getServerSession(authOptions);
    if (!session || session.user.type !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const { name, username, password, image } = await request.json();
    
    // Validate required fields
    if (!name || !username || !password) {
      return NextResponse.json(
        { error: 'Name, username, and password are required' },
        { status: 400 }
      );
    }
    
    // Check if companies sheet exists, if not create it
    try {
      await getSheetData('companies');
    } catch {
      console.log('Companies sheet does not exist, creating it...');
      // Create companies sheet with headers
      await createSheet('companies');
      await appendToSheet('companies', [
        ['ID', 'Name', 'Username', 'Password', 'Image', 'Status'],
      ]);
    }
    
    // Check if username already exists
    const existingData = await getSheetData('companies');
    const existingCompanies = existingData.slice(1); // Skip header row
    
    if (existingCompanies.some((row) => row[2] === username)) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 400 }
      );
    }
    
    // Generate a unique ID for the company
    const id = `company_${Date.now()}`;
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Upload image if provided
    let imageUrl = null;
    if (image) {
      const fileName = `company_${id}_${Date.now()}.jpg`;
      const uploadResult = await uploadImage(fileName, image, 'companies');
      
      if (uploadResult.success) {
        imageUrl = uploadResult.url;
      }
    }
    
    // Add company to the sheet with status enabled by default
    await appendToSheet('companies', [
      [id, name, username, hashedPassword, imageUrl, 'enabled'],
    ]);
    
    // Create a sheet for the company
    await createSheet(name);
    
    return NextResponse.json({
      success: true,
      company: {
        id,
        name,
        username,
        image: imageUrl,
        status: 'enabled',
      },
    });
  } catch (error) {
    console.error('Error creating company:', error);
    return NextResponse.json(
      { error: 'Failed to create company' },
      { status: 500 }
    );
  }
}

// PUT /api/companies - Update company information
export async function PUT(request: NextRequest) {
  try {
    // Check if user is authenticated as admin
    const session = await getServerSession(authOptions);
    if (!session || session.user.type !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const { id, name, username, password, image, status } = await request.json();
    
    // Validate required fields
    if (!id) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      );
    }
    
    // Get companies data
    const data = await getSheetData('companies');
    const companies = data.slice(1); // Skip header row
    
    // Find the company index
    const companyIndex = companies.findIndex((row) => row[0] === id);
    
    if (companyIndex === -1) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }
    
    // Get current company data
    const currentCompany = companies[companyIndex];
    const currentName = currentCompany[1];
    const currentUsername = currentCompany[2];
    const currentPassword = currentCompany[3];
    const currentImage = currentCompany[4] || null;
    const currentStatus = currentCompany[5] || 'enabled';
    
    // Check if username is being changed and if it already exists
    if (username && username !== currentUsername) {
      if (companies.some((row, index) => index !== companyIndex && row[2] === username)) {
        return NextResponse.json(
          { error: 'Username already exists' },
          { status: 400 }
        );
      }
    }
    
    // Hash the password if it's being updated
    let hashedPassword = currentPassword;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }
    
    // Upload image if provided
    let imageUrl = currentImage;
    if (image) {
      const fileName = `company_${id}_${Date.now()}.jpg`;
      const uploadResult = await uploadImage(fileName, image, 'companies');
      
      if (uploadResult.success) {
        imageUrl = uploadResult.url;
      }
    }
    
    // Update company in the sheet
    const updatedCompany = [
      id,
      name || currentName,
      username || currentUsername,
      hashedPassword,
      imageUrl,
      status || currentStatus,
    ];
    
    await updateRow('companies', companyIndex + 1, updatedCompany);
    
    // If company name is changed, rename the sheet
    if (name && name !== currentName) {
      await renameSheet(currentName, name);
    }
    
    return NextResponse.json({
      success: true,
      company: {
        id,
        name: name || currentName,
        username: username || currentUsername,
        image: imageUrl,
        status: status || currentStatus,
      },
    });
  } catch (error) {
    console.error('Error updating company:', error);
    return NextResponse.json(
      { error: 'Failed to update company' },
      { status: 500 }
    );
  }
} 