import { Project, SyntaxKind, TypeGuards } from 'ts-morph';
import path from 'path';

const project = new Project();
const routerPath = path.resolve(__dirname, '../apps/server/src/router.ts');
const sourceFile = project.addSourceFileAtPath(routerPath);

function addPagination(queryName) {
  const routerDec = sourceFile.getVariableDeclaration('appRouter');
  if (!routerDec) return;
  const routerCall = routerDec.getInitializerIfKind(SyntaxKind.CallExpression);
  if (!routerCall) return;
  const routerObj = routerCall.getArguments()[0].asKind(SyntaxKind.ObjectLiteralExpression);
  if (!routerObj) return;

  const prop = routerObj.getProperty(queryName);
  if (!prop) {
    console.log(`Could not find ${queryName}`);
    return;
  }

  // Expect prop to be a PropertyAssignment: queryName: someProcedure.input(...).query(...)
  if (!prop.isKind(SyntaxKind.PropertyAssignment)) return;
  const initializer = prop.getInitializerIfKind(SyntaxKind.CallExpression);
  if (!initializer) return;
  
  // It is usually .query(...)
  const isQuery = initializer.getExpression().getText().endsWith('.query');
  if (!isQuery) return;

  // Let's just output it to see if we can manipulate it
  console.log(`Found ${queryName}`);
}

['getDetailedSalesLog', 'getDetailedExpenses', 'getInventory', 'getAuditLogs', 'getAttendance', 'getPayrollList', 'getShiftReports', 'getBackupLogs'].forEach(addPagination);

project.saveSync();
console.log('Done');
