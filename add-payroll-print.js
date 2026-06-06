const fs = require('fs');
const path = 'd:/devite/apps/web/src/app/payroll/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add Printer to lucide-react imports if not there
if (!content.includes('Printer,')) {
    content = content.replace('Calculator,', 'Calculator, Printer,');
}

// 2. Add print ref and print hook
content = content.replace(
  /const \[noteVal, setNoteVal\] = useState\(""\);/,
  `const [noteVal, setNoteVal] = useState("");\n  const [printRow, setPrintRow] = useState<any>(null);\n  const printRef = React.useRef<HTMLDivElement>(null);\n  const handlePrint = useReactToPrint({ contentRef: printRef, documentTitle: "Salary_Slip" });`
);

// 3. Import React and useReactToPrint
if (!content.includes('useReactToPrint')) {
  content = content.replace(
    /import \{ useState, useEffect \} from "react";/,
    'import React, { useState, useEffect } from "react";\nimport { useReactToPrint } from "react-to-print";'
  );
}

// 4. Add print button in the actions column
content = content.replace(
  /<button onClick=\{\(\) => startEdit\(row\)\}[\s\S]*?<\/button>/,
  '<button onClick={() => startEdit(row)} className="p-2 text-brand-orange hover:bg-white/5 rounded-lg tooltip" title="تعديل الإضافات/الخصومات"><Calculator size={18} /></button>\n                            <button onClick={() => { setPrintRow(row); setTimeout(handlePrint, 100); }} className="p-2 text-blue-400 hover:bg-white/5 rounded-lg" title="طباعة تقرير الراتب"><Printer size={18} /></button>'
);

// 5. Add the hidden print component
const printComponent = `
      {/* Hidden Print Area */}
      <div className="hidden">
        <div ref={printRef} className="p-8 bg-white text-black max-w-[800px] mx-auto" style={{ direction: 'rtl' }}>
          {printRow && (
            <>
              <div className="text-center border-b pb-6 mb-6 border-gray-200">
                <h1 className="text-3xl font-black mb-2">Devite System</h1>
                <h2 className="text-xl text-gray-600">تقرير وتفاصيل الراتب - كشف حساب</h2>
                <p className="text-sm mt-2 text-gray-500">للفترة من {new Date(printRow.startDate).toLocaleDateString('ar-SA')} إلى {new Date(printRow.endDate).toLocaleDateString('ar-SA')}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <p className="text-sm text-gray-500 mb-1">بيانات الموظف</p>
                  <p className="font-bold text-lg">{printRow.user.name}</p>
                  <p className="text-gray-600">{printRow.user.phone}</p>
                  <p className="text-brand-orange font-bold text-sm mt-1">{printRow.user.role}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <p className="text-sm text-gray-500 mb-1">حالة التقرير</p>
                  <p className={\`font-bold text-lg \${printRow.status === 'PAID' ? 'text-green-600' : 'text-brand-orange'}\`}>
                    {printRow.status === 'PAID' ? 'مدفوع' : 'مسودة'}
                  </p>
                  <p className="text-gray-600 mt-1">تاريخ الإصدار: {new Date().toLocaleDateString('ar-SA')}</p>
                </div>
              </div>

              <table className="w-full mb-8 text-right border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-3 border border-gray-200">البند</th>
                    <th className="p-3 border border-gray-200 w-32">المبلغ (د.ب)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="p-3 border border-gray-200 font-bold">الراتب الأساسي</td>
                    <td className="p-3 border border-gray-200 font-bold">{printRow.basicSalary.toFixed(3)}</td>
                  </tr>
                  <tr>
                    <td className="p-3 border border-gray-200 text-green-600">بدل إضافي (أوفرتايم)</td>
                    <td className="p-3 border border-gray-200 text-green-600">+{printRow.overtimePay.toFixed(3)}</td>
                  </tr>
                  <tr>
                    <td className="p-3 border border-gray-200 text-green-600">مكافآت وإضافات إدارية</td>
                    <td className="p-3 border border-gray-200 text-green-600">+{printRow.bonuses.toFixed(3)}</td>
                  </tr>
                  <tr>
                    <td className="p-3 border border-gray-200 text-red-600">خصومات إدارية (يدوية)</td>
                    <td className="p-3 border border-gray-200 text-red-600">-{printRow.manualDeductions?.toFixed(3) || '0.000'}</td>
                  </tr>
                  <tr>
                    <td className="p-3 border border-gray-200 text-red-600">سلفيات مستقطعة</td>
                    <td className="p-3 border border-gray-200 text-red-600">-{printRow.advances.toFixed(3)}</td>
                  </tr>
                  <tr>
                    <td className="p-3 border border-gray-200 text-red-600">خصومات النظام التأخيرات/الغياب</td>
                    <td className="p-3 border border-gray-200 text-red-600">-{printRow.deductions.toFixed(3)}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-black text-lg">
                    <td className="p-4 border border-gray-200">صافي الراتب المستحق</td>
                    <td className="p-4 border border-gray-200">{printRow.netSalary.toFixed(3)}</td>
                  </tr>
                </tfoot>
              </table>

              {printRow.notes && (
                <div className="mb-8 p-4 bg-yellow-50 rounded-lg border border-yellow-100">
                  <h3 className="font-bold mb-2">ملاحظات إدارية:</h3>
                  <p className="text-gray-700">{printRow.notes}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-8 mt-12 pt-12 border-t border-gray-200 text-center">
                <div>
                  <p className="font-bold mb-8">توقيع الموظف</p>
                  <div className="border-b-2 border-gray-300 w-48 mx-auto"></div>
                </div>
                <div>
                  <p className="font-bold mb-8">اعتماد الإدارة</p>
                  <div className="border-b-2 border-gray-300 w-48 mx-auto"></div>
                </div>
              </div>
              
              <style type="text/css" media="print">
                {\`
                  @page { size: A4; margin: 20mm; }
                  @media print {
                    body { background: white; color: black; }
                  }
                \`}
              </style>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
`;

content = content.replace(/<\/div>\s*<\/div>\s*\);\s*\}/, printComponent);

fs.writeFileSync(path, content);
console.log('Added Print Salary feature!');
