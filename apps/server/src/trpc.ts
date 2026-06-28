import { initTRPC } from '@trpc/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

export const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'devite_super_secret_key';

export const createContext = ({ req, res }: any) => {
  let user: any = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      user = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      // Invalid token
    }
  }
  return {
    req,
    res,
    prisma,
    user,
  };
};

const t = initTRPC.context<ReturnType<typeof createContext>>().create();

export const router = t.router;

export const performanceMetrics: Record<string, { totalTime: number; count: number; avgTime: number }> = {};
export const errorLogs: Array<{ time: Date; operation: string; message: string }> = [];

const timingMiddleware = t.middleware(async ({ path, type, next }) => {
  const start = Date.now();
  try {
    const result = await next();
    const duration = Date.now() - start;
    
    if (!performanceMetrics[path]) {
      performanceMetrics[path] = { totalTime: 0, count: 0, avgTime: 0 };
    }
    performanceMetrics[path].totalTime += duration;
    performanceMetrics[path].count++;
    performanceMetrics[path].avgTime = performanceMetrics[path].totalTime / performanceMetrics[path].count;
    
    return result;
  } catch (err: any) {
    const duration = Date.now() - start;
    if (!performanceMetrics[path]) {
      performanceMetrics[path] = { totalTime: 0, count: 0, avgTime: 0 };
    }
    performanceMetrics[path].totalTime += duration;
    performanceMetrics[path].count++;
    performanceMetrics[path].avgTime = performanceMetrics[path].totalTime / performanceMetrics[path].count;

    errorLogs.unshift({
      time: new Date(),
      operation: path,
      message: err.message || 'Unknown error'
    });
    if (errorLogs.length > 10) errorLogs.pop();

    throw err;
  }
});

export const publicProcedure = t.procedure.use(timingMiddleware);

const isAuthed = t.middleware(({ next, ctx }) => {
  if (!ctx.user) {
    throw new Error('غير مصرح بالدخول - يجب تسجيل الدخول أولاً');
  }
  return next({
    ctx: {
      user: ctx.user,
    },
  });
});

export const protectedProcedure = publicProcedure.use(isAuthed);

export const requireRoles = (roles: string[]) => {
  return t.middleware(({ next, ctx }) => {
    if (!ctx.user) {
      throw new Error('غير مصرح بالدخول - يجب تسجيل الدخول أولاً');
    }
    if (!roles.includes(ctx.user.role)) {
      throw new Error('ليس لديك الصلاحية الكافية للقيام بهذا الإجراء');
    }
    return next({
      ctx: {
        user: ctx.user,
      },
    });
  });
};

export const adminProcedure = publicProcedure.use(isAuthed).use(requireRoles(['ADMIN']));
export const managerProcedure = publicProcedure.use(isAuthed).use(requireRoles(['ADMIN', 'MANAGER']));
export const cashierProcedure = publicProcedure.use(isAuthed).use(requireRoles(['ADMIN', 'MANAGER', 'CASHIER', 'STAFF', 'INVESTOR_STAFF']));
export const kitchenProcedure = publicProcedure.use(isAuthed).use(requireRoles(['ADMIN', 'MANAGER', 'KITCHEN', 'STAFF', 'INVESTOR_STAFF', 'CASHIER']));
export const staffProcedure = publicProcedure.use(isAuthed).use(requireRoles(['ADMIN', 'MANAGER', 'STAFF', 'CASHIER', 'KITCHEN', 'INVESTOR_STAFF']));
export const investorProcedure = publicProcedure.use(isAuthed).use(requireRoles(['ADMIN', 'MANAGER', 'INVESTOR', 'INVESTOR_STAFF']));
