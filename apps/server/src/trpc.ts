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
export const publicProcedure = t.procedure;

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

export const protectedProcedure = t.procedure.use(isAuthed);

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

export const adminProcedure = t.procedure.use(isAuthed).use(requireRoles(['ADMIN']));
export const managerProcedure = t.procedure.use(isAuthed).use(requireRoles(['ADMIN', 'MANAGER']));
export const cashierProcedure = t.procedure.use(isAuthed).use(requireRoles(['ADMIN', 'MANAGER', 'CASHIER']));
export const kitchenProcedure = t.procedure.use(isAuthed).use(requireRoles(['ADMIN', 'MANAGER', 'KITCHEN']));
export const staffProcedure = t.procedure.use(isAuthed).use(requireRoles(['ADMIN', 'MANAGER', 'STAFF', 'CASHIER', 'KITCHEN', 'INVESTOR_STAFF']));
export const investorProcedure = t.procedure.use(isAuthed).use(requireRoles(['ADMIN', 'MANAGER', 'INVESTOR', 'INVESTOR_STAFF']));

