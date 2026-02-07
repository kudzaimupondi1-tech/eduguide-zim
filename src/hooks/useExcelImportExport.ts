import { useState } from 'react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

export interface ExcelColumn {
  key: string;
  header: string;
  required?: boolean;
}

export function useExcelImportExport<T extends Record<string, any>>() {
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const exportToExcel = (
    data: T[],
    columns: ExcelColumn[],
    filename: string
  ) => {
    setIsExporting(true);
    try {
      // Transform data to match column headers
      const exportData = data.map((item) => {
        const row: Record<string, any> = {};
        columns.forEach((col) => {
          const value = item[col.key];
          // Handle arrays
          if (Array.isArray(value)) {
            row[col.header] = value.join(', ');
          } else if (value === null || value === undefined) {
            row[col.header] = '';
          } else {
            row[col.header] = value;
          }
        });
        return row;
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');

      // Auto-size columns
      const maxWidths = columns.map((col) => ({
        wch: Math.max(
          col.header.length,
          ...exportData.map((row) => String(row[col.header] || '').length)
        ) + 2,
      }));
      worksheet['!cols'] = maxWidths;

      XLSX.writeFile(workbook, `${filename}.xlsx`);
      toast.success(`Exported ${data.length} records to Excel`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  const importFromExcel = async (
    file: File,
    columns: ExcelColumn[],
    onImport: (data: Partial<T>[]) => Promise<void>
  ): Promise<void> => {
    setIsImporting(true);
    try {
      const reader = new FileReader();
      
      return new Promise((resolve, reject) => {
        reader.onload = async (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, any>[];

            // Map headers back to keys
            const importData: Partial<T>[] = jsonData.map((row) => {
              const item: Record<string, any> = {};
              columns.forEach((col) => {
                const value = row[col.header];
                if (value !== undefined && value !== '') {
                  // Handle comma-separated arrays
                  if (typeof value === 'string' && value.includes(',') && col.key.includes('_')) {
                    item[col.key] = value.split(',').map((s: string) => s.trim());
                  } else {
                    item[col.key] = value;
                  }
                }
              });
              return item as Partial<T>;
            });

            // Validate required fields
            const missingRequired = columns.filter((col) => col.required);
            const invalidRows = importData.filter((item, idx) => {
              return missingRequired.some((col) => !item[col.key as keyof T]);
            });

            if (invalidRows.length > 0) {
              toast.error(`${invalidRows.length} rows missing required fields`);
            }

            const validData = importData.filter((item) => {
              return !missingRequired.some((col) => !item[col.key as keyof T]);
            });

            if (validData.length > 0) {
              await onImport(validData);
              toast.success(`Imported ${validData.length} records`);
            }

            setIsImporting(false);
            resolve();
          } catch (error) {
            console.error('Import parse error:', error);
            toast.error('Failed to parse Excel file');
            setIsImporting(false);
            reject(error);
          }
        };

        reader.onerror = () => {
          toast.error('Failed to read file');
          setIsImporting(false);
          reject(new Error('Failed to read file'));
        };

        reader.readAsArrayBuffer(file);
      });
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import data');
      setIsImporting(false);
      throw error;
    }
  };

  const downloadTemplate = (columns: ExcelColumn[], filename: string) => {
    const templateRow: Record<string, string> = {};
    columns.forEach((col) => {
      templateRow[col.header] = col.required ? '(Required)' : '(Optional)';
    });

    const worksheet = XLSX.utils.json_to_sheet([templateRow]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');

    const maxWidths = columns.map((col) => ({ wch: col.header.length + 10 }));
    worksheet['!cols'] = maxWidths;

    XLSX.writeFile(workbook, `${filename}_template.xlsx`);
    toast.success('Template downloaded');
  };

  return {
    exportToExcel,
    importFromExcel,
    downloadTemplate,
    isImporting,
    isExporting,
  };
}
