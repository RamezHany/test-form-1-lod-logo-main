import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

// Type for row data
type RowData = (string | number | boolean | null | undefined)[][];

// Export data to PDF
export const exportToPDF = (
  data: RowData,
  headers: string[],
  title: string,
  filename: string = 'export.pdf'
) => {
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(18);
  doc.text(title, 14, 22);
  
  // Add date
  doc.setFontSize(11);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
  
  // Table configuration
  const startY = 40;
  const margin = 14;
  const cellPadding = 5;
  const lineHeight = 10;
  const pageWidth = doc.internal.pageSize.getWidth();
  const tableWidth = pageWidth - 2 * margin;
  const colWidth = tableWidth / headers.length;
  
  // Draw headers
  doc.setFillColor(220, 220, 220);
  doc.rect(margin, startY, tableWidth, lineHeight, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  
  headers.forEach((header, i) => {
    doc.text(
      header,
      margin + i * colWidth + cellPadding,
      startY + lineHeight - cellPadding
    );
  });
  
  // Draw rows
  doc.setFont('helvetica', 'normal');
  let y = startY + lineHeight;
  
  data.forEach((row, rowIndex) => {
    // Check if we need a new page
    if (y > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      y = startY;
      
      // Redraw headers on new page
      doc.setFillColor(220, 220, 220);
      doc.rect(margin, y, tableWidth, lineHeight, 'F');
      doc.setFont('helvetica', 'bold');
      
      headers.forEach((header, i) => {
        doc.text(
          header,
          margin + i * colWidth + cellPadding,
          y + lineHeight - cellPadding
        );
      });
      
      doc.setFont('helvetica', 'normal');
      y += lineHeight;
    }
    
    // Draw row background (alternating colors)
    if (rowIndex % 2 === 0) {
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, y, tableWidth, lineHeight, 'F');
    }
    
    // Draw row data
    headers.forEach((_, i) => {
      const cellValue = row[i] ? row[i].toString() : '';
      doc.text(
        cellValue,
        margin + i * colWidth + cellPadding,
        y + lineHeight - cellPadding
      );
    });
    
    y += lineHeight;
  });
  
  // Save the PDF
  doc.save(filename);
};

// Export data to Excel (XLSX)
export const exportToExcel = (
  data: RowData,
  headers: string[],
  sheetName: string = 'Sheet1',
  filename: string = 'export.xlsx'
) => {
  // Prepare the worksheet data with headers
  const wsData = [headers, ...data];
  
  // Create a worksheet
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  
  // Create a workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  
  // Generate the Excel file
  XLSX.writeFile(wb, filename);
};

// Export data to CSV
export const exportToCSV = (
  data: RowData,
  headers: string[],
  filename: string = 'export.csv'
) => {
  // Prepare the worksheet data with headers
  const wsData = [headers, ...data];
  
  // Create a worksheet
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  
  // Generate the CSV content
  const csvContent = XLSX.utils.sheet_to_csv(ws);
  
  // Create a Blob with the CSV content
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  
  // Create a download link
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}; 