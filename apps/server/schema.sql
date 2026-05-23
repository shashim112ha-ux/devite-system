-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "oldPrice" DOUBLE PRECISION,
    "discount" INTEGER,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'DISCOUNT',
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'CASHIER',
    "jobDescription" TEXT,
    "imageUrl" TEXT,
    "salary" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hourlyRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "shiftType" TEXT,
    "employmentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "branchId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL,
    "prepTime" INTEGER NOT NULL DEFAULT 5,
    "image" TEXT,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "unavailableReason" TEXT,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "minThreshold" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "supplier" TEXT,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "branchId" TEXT,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryAuditLog" (
    "id" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "oldQuantity" DOUBLE PRECISION NOT NULL,
    "newQuantity" DOUBLE PRECISION NOT NULL,
    "oldPrice" DOUBLE PRECISION NOT NULL,
    "newPrice" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseRecord" (
    "id" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL,
    "supplier" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductIngredient" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "amountRequired" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ProductIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "orderNumber" INTEGER NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "paymentMethod" TEXT NOT NULL DEFAULT 'CASH',
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "estimatedTime" INTEGER NOT NULL DEFAULT 15,
    "isUrgent" BOOLEAN NOT NULL DEFAULT false,
    "isVIP" BOOLEAN NOT NULL DEFAULT false,
    "customerId" TEXT,
    "customerPhone" TEXT,
    "cashierId" TEXT,
    "whatsappStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "branchId" TEXT,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "size" TEXT,
    "sugar" TEXT,
    "ice" TEXT,
    "addons" TEXT,
    "notes" TEXT,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "checkIn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkOut" TIMESTAMP(3),
    "reason" TEXT,
    "editedById" TEXT,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Investor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "capital" DOUBLE PRECISION NOT NULL,
    "sharePercentage" DOUBLE PRECISION NOT NULL,
    "totalWithdrawn" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "entryDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Investor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supplier" TEXT,
    "receiptUrl" TEXT,
    "purpose" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentMethod" TEXT NOT NULL DEFAULT 'CASH',
    "accountPaidFrom" TEXT,
    "accountId" TEXT,
    "inventoryItemId" TEXT,
    "recordedById" TEXT,
    "branchId" TEXT,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "id" TEXT NOT NULL,
    "storeName" TEXT NOT NULL DEFAULT 'Devite ERP',
    "currency" TEXT NOT NULL DEFAULT '╪».╪ذ',
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 10.0,
    "defaultPrepTime" INTEGER NOT NULL DEFAULT 15,
    "logoUrl" TEXT,
    "whatsappEnabled" BOOLEAN NOT NULL DEFAULT false,
    "whatsappPhone" TEXT,
    "whatsappOrderMsg" TEXT DEFAULT '┘à╪▒╪ص╪ذ╪د┘ï ╪ذ┘â! ╪╖┘╪ذ┘â ╪▒┘é┘à {{orderNumber}} ╪ش╪د╪▒┘è ╪ز╪ص╪╢┘è╪▒┘ç ╪د┘╪ت┘. ╪د┘╪ح╪ش┘à╪د┘┘è: {{total}}',
    "whatsappReadyMsg" TEXT DEFAULT '┘à╪▒╪ص╪ذ╪د┘ï! ╪╖┘╪ذ┘â ╪▒┘é┘à {{orderNumber}} ╪ش╪د┘ç╪▓ ┘┘╪د╪│╪ز┘╪د┘à. ┘╪ز┘à┘┘ë ┘┘â ┘è┘ê┘à╪د┘ï ╪│╪╣┘è╪»╪د┘ï!',
    "whatsappShiftMsg" TEXT DEFAULT '╪ز┘é╪▒┘è╪▒ ╪د┘╪┤┘╪ز: ╪د┘┘à╪ذ┘è╪╣╪د╪ز {{income}}╪î ╪د┘┘à╪╡╪▒┘ê┘╪د╪ز {{expenses}}╪î ╪د┘╪╡╪د┘┘è {{net}}.',

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderTimelineStep" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "staffId" TEXT,
    "durationSeconds" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "OrderTimelineStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payroll" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "presenceDays" INTEGER NOT NULL DEFAULT 0,
    "absenceDays" INTEGER NOT NULL DEFAULT 0,
    "workHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overtimeHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "delayHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "basicSalary" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overtimePay" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bonuses" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "manualDeductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "advances" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netSalary" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "paymentDate" TIMESTAMP(3),
    "notes" TEXT,
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payroll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfitDistribution" (
    "id" TEXT NOT NULL,
    "netProfit" DOUBLE PRECISION NOT NULL,
    "devDeduction" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maintDeduction" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "emergencyDeduction" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "stockDeduction" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "marketingDeduction" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDeductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "distributableProfit" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfitDistribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestorPayout" (
    "id" TEXT NOT NULL,
    "distributionId" TEXT NOT NULL,
    "investorId" TEXT NOT NULL,
    "investorName" TEXT NOT NULL,
    "capitalShare" DOUBLE PRECISION NOT NULL,
    "sharePercentage" DOUBLE PRECISION NOT NULL,
    "netProfitShare" DOUBLE PRECISION NOT NULL,
    "deductionsShare" DOUBLE PRECISION NOT NULL,
    "amountPaid" DOUBLE PRECISION NOT NULL,
    "growthRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvestorPayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftReport" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cashierId" TEXT NOT NULL,
    "dailyIncome" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "profit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expenses" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "losses" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netProfit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "operatingCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cashAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cardAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "difference" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mostConsumedMaterial" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "managerNotes" TEXT,
    "cleanlinessInternal" BOOLEAN NOT NULL DEFAULT true,
    "cleanlinessExternal" BOOLEAN NOT NULL DEFAULT true,
    "waterInternal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "waterExternal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "petrolQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gasQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "electricityStatus" BOOLEAN NOT NULL DEFAULT true,
    "fridgeStatus" BOOLEAN NOT NULL DEFAULT true,
    "blenderStatus" BOOLEAN NOT NULL DEFAULT true,
    "iceMachineStatus" BOOLEAN NOT NULL DEFAULT true,
    "cupsQuantity" INTEGER NOT NULL DEFAULT 0,
    "lidsQuantity" INTEGER NOT NULL DEFAULT 0,
    "napkinsQuantity" INTEGER NOT NULL DEFAULT 0,
    "glovesQuantity" INTEGER NOT NULL DEFAULT 0,
    "masksQuantity" INTEGER NOT NULL DEFAULT 0,
    "bagsQuantity" INTEGER NOT NULL DEFAULT 0,
    "cleaningToolsStatus" BOOLEAN NOT NULL DEFAULT true,
    "presentStaff" TEXT NOT NULL DEFAULT '[]',
    "absentStaff" TEXT NOT NULL DEFAULT '[]',
    "lateStaff" TEXT NOT NULL DEFAULT '[]',
    "ordersCount" INTEGER NOT NULL DEFAULT 0,
    "avgPrepTime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fastestOrderTime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "slowestOrderTime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "delayedOrdersCount" INTEGER NOT NULL DEFAULT 0,
    "cancelledOrdersCount" INTEGER NOT NULL DEFAULT 0,
    "branchId" TEXT,

    CONSTRAINT "ShiftReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeFeedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "adminReply" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'CASH',
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "branchId" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BranchLocation" (
    "id" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT '┘à┘à┘┘â╪ر ╪د┘╪ذ╪ص╪▒┘è┘',
    "governorate" TEXT,
    "branchName" TEXT NOT NULL,
    "address" TEXT,
    "googleMapsUrl" TEXT,
    "branchNumber" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BranchLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "senderName" TEXT,
    "senderPhone" TEXT,
    "senderRole" TEXT NOT NULL DEFAULT 'CUSTOMER',
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "adminReply" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftSchedule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "shiftName" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "officialNumber" TEXT,
    "accessToken" TEXT,
    "phoneNumberId" TEXT,
    "managerNumbers" TEXT,
    "supervisorNumbers" TEXT,
    "investorNumbers" TEXT,
    "headManagerNumber" TEXT,
    "notifyOrderCreated" BOOLEAN NOT NULL DEFAULT true,
    "notifyOrderReady" BOOLEAN NOT NULL DEFAULT true,
    "notifyOrderCancelled" BOOLEAN NOT NULL DEFAULT true,
    "notifyShiftReport" BOOLEAN NOT NULL DEFAULT true,
    "notifyDailyReport" BOOLEAN NOT NULL DEFAULT false,
    "notifyLowInventory" BOOLEAN NOT NULL DEFAULT true,
    "notifyLargeExpense" BOOLEAN NOT NULL DEFAULT true,
    "notifyInvestorReport" BOOLEAN NOT NULL DEFAULT false,
    "largeExpenseThreshold" DOUBLE PRECISION NOT NULL DEFAULT 20.0,
    "lowInventoryRepeatDaily" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppTemplate" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "variables" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppLog" (
    "id" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "messageType" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,

    CONSTRAINT "WhatsAppLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_phone_key" ON "Customer"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_name_key" ON "InventoryItem"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppTemplate_type_key" ON "WhatsAppTemplate"("type");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "BranchLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "BranchLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryAuditLog" ADD CONSTRAINT "InventoryAuditLog_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRecord" ADD CONSTRAINT "PurchaseRecord_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductIngredient" ADD CONSTRAINT "ProductIngredient_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductIngredient" ADD CONSTRAINT "ProductIngredient_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_cashierId_fkey" FOREIGN KEY ("cashierId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "BranchLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_editedById_fkey" FOREIGN KEY ("editedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "BranchLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderTimelineStep" ADD CONSTRAINT "OrderTimelineStep_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payroll" ADD CONSTRAINT "Payroll_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestorPayout" ADD CONSTRAINT "InvestorPayout_distributionId_fkey" FOREIGN KEY ("distributionId") REFERENCES "ProfitDistribution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftReport" ADD CONSTRAINT "ShiftReport_cashierId_fkey" FOREIGN KEY ("cashierId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftReport" ADD CONSTRAINT "ShiftReport_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "BranchLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeFeedback" ADD CONSTRAINT "EmployeeFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "BranchLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftSchedule" ADD CONSTRAINT "ShiftSchedule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppLog" ADD CONSTRAINT "WhatsAppLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

