import React from 'react';
import { FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import Button from '../components/ui/Button';

export default function ExcelTool(){
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Excel Tool 📊</h1>
        <p className="text-gray-600">Import and export data using Excel files</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
        <div className="text-center">
          <FileSpreadsheet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Excel Tool Coming Soon</h2>
          <p className="text-gray-600">
            This feature is under development and will be available in a future update.
          </p>
        </div>
      </div>
    </div>
  );
}
