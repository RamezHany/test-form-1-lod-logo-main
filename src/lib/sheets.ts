import { google } from 'googleapis';

// Initialize Google Sheets API
const auth = new google.auth.JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

// Get the main spreadsheet
export const getSpreadsheet = async () => {
  try {
    const response = await sheets.spreadsheets.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
    });
    return response.data;
  } catch (error) {
    console.error('Error getting spreadsheet:', error);
    throw error;
  }
};

// Get all sheets in the spreadsheet
export const getAllSheets = async () => {
  try {
    const spreadsheet = await getSpreadsheet();
    return spreadsheet.sheets || [];
  } catch (error) {
    console.error('Error getting all sheets:', error);
    throw error;
  }
};

// Get data from a specific sheet
export const getSheetData = async (sheetName: string) => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: sheetName,
    });
    return response.data.values || [];
  } catch (error) {
    console.error(`Error getting data from sheet ${sheetName}:`, error);
    throw error;
  }
};

// Append data to a specific sheet
export const appendToSheet = async (sheetName: string, values: unknown[][]) => {
  try {
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: sheetName,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values,
      },
    });
    return response.data;
  } catch (error) {
    console.error(`Error appending data to sheet ${sheetName}:`, error);
    throw error;
  }
};

// Create a new sheet
export const createSheet = async (sheetName: string) => {
  try {
    const response = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: sheetName,
              },
            },
          },
        ],
      },
    });
    return response.data;
  } catch (error) {
    console.error(`Error creating sheet ${sheetName}:`, error);
    throw error;
  }
};

// Delete a row from a sheet
export const deleteRow = async (sheetName: string, rowIndex: number) => {
  try {
    // Get the sheet ID first
    const spreadsheet = await getSpreadsheet();
    const sheet = spreadsheet.sheets?.find(
      (s) => s.properties?.title === sheetName
    );
    
    if (!sheet || !sheet.properties?.sheetId) {
      throw new Error(`Sheet ${sheetName} not found`);
    }
    
    const response = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: sheet.properties.sheetId,
                dimension: 'ROWS',
                startIndex: rowIndex,
                endIndex: rowIndex + 1,
              },
            },
          },
        ],
      },
    });
    return response.data;
  } catch (error) {
    console.error(`Error deleting row from sheet ${sheetName}:`, error);
    throw error;
  }
};

// Create a new table in a sheet (for events)
export const createTable = async (sheetName: string, tableName: string, headers: string[]) => {
  try {
    // First, get the sheet data to see if the table already exists
    const data = await getSheetData(sheetName);
    
    // Check if the table exists by looking for a row with the table name
    const tableExists = data.some((row) => row[0] === tableName);
    
    if (tableExists) {
      throw new Error(`Table ${tableName} already exists in sheet ${sheetName}`);
    }
    
    // Add the table name as a separator row
    await appendToSheet(sheetName, [[tableName]]);
    
    // Add the headers
    await appendToSheet(sheetName, [headers]);
    
    return { success: true, message: `Table ${tableName} created in sheet ${sheetName}` };
  } catch (error) {
    console.error(`Error creating table ${tableName} in sheet ${sheetName}:`, error);
    throw error;
  }
};

// Get data from a specific table in a sheet
export const getTableData = async (sheetName: string, tableName: string): Promise<string[][]> => {
  try {
    console.log(`Fetching table data for ${tableName} in sheet ${sheetName}`);
    const data = await getSheetData(sheetName);
    
    if (!data || data.length === 0) {
      console.error(`Sheet ${sheetName} is empty or does not exist`);
      throw new Error(`Sheet ${sheetName} is empty or does not exist`);
    }
    
    console.log(`Sheet ${sheetName} has ${data.length} rows`);
    
    // Try direct match first
    let tableStartIndex = -1;
    for (let i = 0; i < data.length; i++) {
      if (data[i] && data[i][0] === tableName) {
        console.log(`Found exact match for table ${tableName} at row ${i}`);
        tableStartIndex = i;
        break;
      }
    }
    
    // If no direct match, try case-insensitive match
    if (tableStartIndex === -1) {
      const normalizedTableName = tableName.trim().toLowerCase();
      for (let i = 0; i < data.length; i++) {
        if (data[i] && data[i][0] && data[i][0].trim().toLowerCase() === normalizedTableName) {
          console.log(`Found case-insensitive match for table ${tableName} at row ${i}: ${data[i][0]}`);
          tableStartIndex = i;
          break;
        }
      }
    }
    
    if (tableStartIndex === -1) {
      console.error(`Table ${tableName} not found in sheet ${sheetName}`);
      console.log('Available tables:');
      for (let i = 0; i < data.length; i++) {
        if (data[i] && data[i].length === 1 && data[i][0]) {
          console.log(`- ${data[i][0]} (row ${i})`);
        }
      }
      throw new Error(`Table ${tableName} not found in sheet ${sheetName}`);
    }
    
    // Find the table end index (next table start or end of data)
    let tableEndIndex = data.length;
    for (let i = tableStartIndex + 1; i < data.length; i++) {
      // If we find another row with just one cell, it's likely the next table
      if (data[i].length === 1 && data[i][0] !== '') {
        tableEndIndex = i;
        break;
      }
    }
    
    console.log(`Table ${tableName} spans from row ${tableStartIndex + 1} to ${tableEndIndex - 1}`);
    
    // Extract the table data (including headers)
    const tableData = data.slice(tableStartIndex + 1, tableEndIndex);
    
    return tableData;
  } catch (error) {
    console.error(`Error getting data from table ${tableName} in sheet ${sheetName}:`, error);
    throw error;
  }
};

// Add data to a specific table in a sheet
export const addToTable = async (sheetName: string, tableName: string, rowData: unknown[]) => {
  try {
    console.log(`Adding data to table ${tableName} in sheet ${sheetName}`);
    const data = await getSheetData(sheetName);
    
    if (!data || data.length === 0) {
      console.error(`Sheet ${sheetName} is empty or does not exist`);
      throw new Error(`Sheet ${sheetName} is empty or does not exist`);
    }
    
    // Find the exact table name and its end index
    let tableStartIndex = -1;
    let tableEndIndex = -1;
    
    // First pass: find the table start
    for (let i = 0; i < data.length; i++) {
      if (data[i] && data[i][0] === tableName) {
        tableStartIndex = i;
        break;
      }
    }
    
    // If no exact match found, try case-insensitive match
    if (tableStartIndex === -1) {
      const normalizedTableName = tableName.trim().toLowerCase();
      for (let i = 0; i < data.length; i++) {
        if (data[i] && data[i][0] && data[i][0].trim().toLowerCase() === normalizedTableName) {
          tableStartIndex = i;
          tableName = data[i][0]; // Use the exact table name from the sheet
          break;
        }
      }
    }
    
    if (tableStartIndex === -1) {
      throw new Error(`Table ${tableName} not found in sheet ${sheetName}`);
    }
    
    // Second pass: find the table end (next table start or end of data)
    for (let i = tableStartIndex + 1; i < data.length; i++) {
      if (data[i] && data[i].length === 1 && data[i][0] !== '') {
        tableEndIndex = i;
        break;
      }
    }
    
    if (tableEndIndex === -1) {
      tableEndIndex = data.length;
    }
    
    // Calculate the correct range for appending
    const range = `${sheetName}!A${tableEndIndex + 1}`;
    
    // Append the new row
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [rowData],
      },
    });
    
    return response.data;
  } catch (error) {
    console.error(`Error adding data to table ${tableName} in sheet ${sheetName}:`, error);
    throw error;
  }
};

// Delete a table from a sheet
export const deleteTable = async (sheetName: string, tableName: string) => {
  try {
    // Get the sheet ID first
    const spreadsheet = await getSpreadsheet();
    const sheet = spreadsheet.sheets?.find(
      (s) => s.properties?.title === sheetName
    );
    
    if (!sheet || !sheet.properties?.sheetId) {
      throw new Error(`Sheet ${sheetName} not found`);
    }
    
    const data = await getSheetData(sheetName);
    
    // Find the table start index
    let tableStartIndex = -1;
    for (let i = 0; i < data.length; i++) {
      if (data[i][0] === tableName) {
        tableStartIndex = i;
        break;
      }
    }
    
    if (tableStartIndex === -1) {
      throw new Error(`Table ${tableName} not found in sheet ${sheetName}`);
    }
    
    // Find the table end index (next table start or end of data)
    let tableEndIndex = data.length;
    for (let i = tableStartIndex + 1; i < data.length; i++) {
      // If we find another row with just one cell, it's likely the next table
      if (data[i].length === 1 && data[i][0] !== '') {
        tableEndIndex = i;
        break;
      }
    }
    
    // Delete the table rows
    const response = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: sheet.properties.sheetId,
                dimension: 'ROWS',
                startIndex: tableStartIndex,
                endIndex: tableEndIndex,
              },
            },
          },
        ],
      },
    });
    
    return response.data;
  } catch (error) {
    console.error(`Error deleting table ${tableName} from sheet ${sheetName}:`, error);
    throw error;
  }
};

// Update a specific row in a sheet
export const updateRow = async (sheetName: string, rowIndex: number, values: unknown[]) => {
  try {
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `${sheetName}!A${rowIndex + 1}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [values],
      },
    });
    return response.data;
  } catch (error) {
    console.error(`Error updating row in sheet ${sheetName}:`, error);
    throw error;
  }
};

// Rename a sheet
export const renameSheet = async (oldName: string, newName: string) => {
  try {
    // Get the sheet ID first
    const spreadsheet = await getSpreadsheet();
    const sheet = spreadsheet.sheets?.find(
      (s) => s.properties?.title === oldName
    );
    
    if (!sheet || !sheet.properties?.sheetId) {
      throw new Error(`Sheet ${oldName} not found`);
    }
    
    const response = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      requestBody: {
        requests: [
          {
            updateSheetProperties: {
              properties: {
                sheetId: sheet.properties.sheetId,
                title: newName,
              },
              fields: 'title',
            },
          },
        ],
      },
    });
    return response.data;
  } catch (error) {
    console.error(`Error renaming sheet from ${oldName} to ${newName}:`, error);
    throw error;
  }
}; 