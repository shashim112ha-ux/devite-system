import { Project, SyntaxKind } from 'ts-morph';
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
  if (!prop) return;
  if (!prop.isKind(SyntaxKind.PropertyAssignment)) return;
  const initializer = prop.getInitializerIfKind(SyntaxKind.CallExpression);
  if (!initializer) return;

  const inputCall = initializer.getExpression().asKind(SyntaxKind.CallExpression);
  if (inputCall && inputCall.getExpression().getText().endsWith('.input')) {
    const args = inputCall.getArguments();
    if (args.length > 0) {
      const zObject = args[0];
      if (zObject.isKind(SyntaxKind.CallExpression) && zObject.getExpression().getText() === 'z.object') {
        const objArg = zObject.getArguments()[0];
        if (objArg && objArg.isKind(SyntaxKind.ObjectLiteralExpression)) {
           // check if page exists
           if (!objArg.getProperty('page')) {
             objArg.addPropertyAssignment({ name: 'page', initializer: 'z.number().optional().default(1)' });
             objArg.addPropertyAssignment({ name: 'limit', initializer: 'z.number().optional().default(20)' });
           }
        }
      }
    }
  }

  const queryArgs = initializer.getArguments();
  if (queryArgs.length === 0) return;
  const arrowFunc = queryArgs[0].asKind(SyntaxKind.ArrowFunction);
  if (!arrowFunc) return;
  
  const body = arrowFunc.getBody();
  if (body.isKind(SyntaxKind.Block)) {
    // We can inject: 
    // const page = input?.page || 1;
    // const limit = input?.limit || 20;
    // const skip = (page - 1) * limit;
    
    // Instead of doing deep AST replacement for the return statement,
    // which is super complex since each query is different, I will just do a string replacement on the block text!
  }
}

['getDetailedSalesLog', 'getDetailedExpenses', 'getInventory', 'getAuditLogs', 'getAttendance', 'getPayrollList', 'getShiftReports', 'getBackupLogs'].forEach(addPagination);

project.saveSync();
console.log('Added pagination inputs');
