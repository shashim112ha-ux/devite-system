# Devite Control System: Full Features Implementation Plan

This plan outlines the steps to build and integrate the requested features (Dashboard, Reports, Inventory, Staff, Kitchen KDS, Offers, and Role-Based Access Control) to make the Devite system fully functional and reliant on real database data.

## User Review Required
> [!IMPORTANT]
> This is a large update that will introduce several new screens and modify the backend TRPC router. 
> Please review the proposed approach below. Once you approve, I will begin execution step-by-step.

## Open Questions
1. **Charts Library**: For reports, I plan to use `recharts` to render the charts. Is this acceptable?
2. **Export functionality**: For PDF/Excel exports, I will implement a client-side CSV export (which opens in Excel). For PDF, I can use `window.print()` tailored for a report layout, or generate a PDF using a library like `jspdf`. I will start with CSV export for data and `window.print()` for visual PDF reports unless you have a specific preference.

## Proposed Changes

---

### 1. Backend (TRPC Router Updates)
I will modify `apps/server/src/router.ts` to replace all dummy data with real aggregations and add missing endpoints.

#### [MODIFY] `router.ts`
- **Dashboard Stats**: Update `getAdvancedStats` to calculate real net profit (Sales - Total Costs from ingredients), find the actual top-selling product, calculate peak hours from order timestamps, and calculate accurate average prep time based on `updatedAt - createdAt` for ready orders.
- **Reports**: Add `getReportData` (daily, weekly, monthly, quarterly) returning grouped sales data for charts.
- **Inventory**: Add CRUD operations (`getInventory`, `addInventoryItem`, `updateInventoryItem`). Low stock will be determined if `quantity <= minThreshold`.
- **Staff**: Add CRUD operations (`getStaff`, `addStaff`, `updateStaff`), and attendance endpoints (`checkIn`, `checkOut`, `getAttendance`).
- **Kitchen**: Add `getKitchenOrders` and `updateOrderStatus`.
- **Offers**: Add CRUD operations (`createOffer`, `updateOffer`, `deleteOffer`).

---

### 2. Dashboard Analytics & Reports UI
Connect the frontend to the new real TRPC endpoints.

#### [MODIFY] `apps/web/src/app/dashboard/page.tsx`
- Replace dummy stats with `trpc.getAdvancedStats.useQuery()`.

#### [MODIFY] `apps/web/src/app/reports/page.tsx`
- Install `recharts` library for rendering charts.
- Create a visual dashboard showing Daily/Weekly/Monthly metrics.
- Add "Export to CSV" and "Export to PDF" buttons.

---

### 3. Inventory Management UI
Build a dedicated page to manage raw materials and stock levels.

#### [MODIFY/NEW] `apps/web/src/app/inventory/page.tsx`
- Table displaying all items, quantities, and units.
- Visual indicators (Red/Yellow/Green) for low stock (`quantity <= minThreshold`).
- Modal to "Add Item" or "Restock".
- Note: *Auto-deduction upon ordering is already implemented in the backend, but we will test it to ensure it works accurately.*

---

### 4. Staff Management UI
Build a page for HR and employee tracking.

#### [MODIFY/NEW] `apps/web/src/app/staff/page.tsx`
- List of employees with roles (Manager, Cashier, Kitchen, etc.).
- Modal to Add new employees with specific roles and salaries.
- Section to view Attendance records (Check In / Check Out times) and calculate hours.

---

### 5. Kitchen Display System (KDS)
Build a specialized screen for the kitchen staff.

#### [MODIFY/NEW] `apps/web/src/app/kitchen/page.tsx`
- Kanban-style board with columns: `الطلبات الجديدة` (New), `قيد التحضير` (Preparing), `جاهزة` (Ready).
- Show customer notes and required modifications (Sugar, Ice, Addons).
- Buttons to quickly move orders between states.

---

### 6. Offers Management UI
Make the offers section dynamic.

#### [NEW] `apps/web/src/app/offers/page.tsx`
- Create an interface to view active/inactive offers.
- Form to add new offers (Title, Discount %, Dates, linking to Products).

---

### 7. Role-Based Access Control (RBAC)
Ensure security and restricted views.

#### [MODIFY] `apps/web/src/app/layout.tsx` or Page Components
- Add a client-side state/context to track the logged-in user's role.
- Redirect users based on role (e.g., if role is `KITCHEN`, redirect to `/kitchen` and block `/dashboard`).
- Hide sidebar navigation items based on role.

## Verification Plan
### Automated Tests
- Restart the TRPC server to ensure no syntax or type errors.
- Ensure Prisma schema is fully synced.

### Manual Verification
- Log in as ADMIN and navigate to all new pages.
- Create an order from the POS and verify that:
  - It appears in the Kitchen display.
  - The inventory stock decreases based on the product's recipe.
  - The Dashboard sales and profit numbers update immediately.
- Export a CSV report and verify data format.
