# RT2 Pickleball Club - Payment References & Filtering Logic

## Search Results Summary

All references to "RT2 Pickleball Club" and payment/completion logic found in the workspace.

---

## 1. Payment Filtering by Club & Status - Scripts

### **backfillCourtUsageForClub.ts**
**File:** [backend/src/scripts/backfillCourtUsageForClub.ts](backend/src/scripts/backfillCourtUsageForClub.ts)

**Line 10:** Club name pattern definition
```typescript
const clubNamePattern = /RT2 Pickleball Club/i;
```

**Lines 14-19:** Database connection
```typescript
const club = await Club.findOne({ name: clubNamePattern });
```

**Lines 25-28:** Payment filtering logic - **Completed payments for RT2 club**
```typescript
const payments = await Payment.find({
  clubId: club._id,
  status: "record",
  paymentType: "court_usage",
}).populate("userId", "fullName");
```

**Key Logic:**
- Finds club by name pattern (case-insensitive)
- Filters payments by:
  - `clubId`: RT2 Pickleball Club's ID
  - `status`: "record" (recorded/completed payments)
  - `paymentType`: "court_usage" (excludes membership fees and tournament entries)
- Returns recorded court usage payments only
- Populates user information for payment records

---

### **rebuildCourtUsageForClub.ts**
**File:** [backend/src/scripts/rebuildCourtUsageForClub.ts](backend/src/scripts/rebuildCourtUsageForClub.ts)

**Line 10:** Same club pattern
```typescript
const clubNamePattern = /RT2 Pickleball Club/i;
```

**Lines 25-28:** Identical payment filter
```typescript
const payments = await Payment.find({
  clubId: club._id,
  status: "record",
  paymentType: "court_usage",
}).populate("userId", "fullName");
```

**Aggregation Logic (Lines 38-46):**
- Maps payments by member name and usage date
- Tracks payment metadata (member name, year)
- Extracts payment dates from:
  1. `payment.paymentDate` (preferred)
  2. `payment.metadata?.courtUsageDate` (fallback)
  3. `payment.createdAt` (final fallback)

---

## 2. Payment Counting & Aggregation - Backend Controller

### **paymentController.ts**
**File:** [backend/src/controllers/paymentController.ts](backend/src/controllers/paymentController.ts)

**Lines 2000-2023:** Completed payment count logic
```typescript
const completedFilter: any = { status: "completed" };
if (req.clubId) {
  completedFilter.clubId = req.clubId;
}
if (req.user.role === "member") {
  completedFilter.userId = req.user._id.toString();
}
const completedCount = await Payment.countDocuments(completedFilter);
console.log("🔍 Completed payments for user:", completedCount);
```

**Key Features:**
- Counts completed payments per user/club
- Respects role-based filtering (members only see their own)
- Administrators can filter by clubId and status

---

## 3. Payment Aggregation & Reporting - Report Controller

### **reportController.ts**
**File:** [backend/src/controllers/reportController.ts](backend/src/controllers/reportController.ts)

#### **Lines 75-97:** Revenue calculation from completed payments
```typescript
Payment.aggregate([
  {
    $match: {
      status: "completed",
      createdAt: { $gte: startDate, $lte: endDate },
    },
  },
  {
    $group: {
      _id: null,
      totalRevenue: { $sum: "$amount" },
      totalPayments: { $sum: 1 },
    },
  },
]),
```

#### **Lines 190-210:** Status distribution aggregation
```typescript
{
  $group: {
    _id: groupByField,
    count: { $sum: 1 },
    completed: {
      $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
    },
    cancelled: {
      $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
    },
  },
}
```

#### **Lines 1877-1884:** Recorded payment totals
```typescript
const recordedPayments = await Payment.find({
  status: "record",
  paymentMethod: { $ne: "coins" },
  paymentType: { $ne: "membership_fee" },
  paymentDate: { $gte: yearStart, $lte: yearEnd },
});

const totalRecordedAmount = recordedPayments.reduce(
  (sum: number, payment: any) => sum + payment.amount,
  0,
);
```

**Key Queries:**
- Revenue filtered by `status: "completed"`
- Date range filtering using `paymentDate` (for recently completed payments)
- Excludes membership fees and coins
- Aggregates total amounts and counts by status

#### **Lines 2409-2430:** Service fee calculation from recorded payments
```typescript
const recordedPayments = await Payment.find({
  status: "record",
  paymentMethod: { $ne: "coins" },
});

const serviceablePayments = await Payment.find({
  status: "record",
  paymentMethod: { $ne: "coins" },
});

let totalServiceFees = serviceablePayments.reduce(
  (sum: number, payment: any) => {
    return sum + payment.amount * serviceFeePercentage;
  },
  0,
);
```

---

## 4. Database Indexes for Payment Filtering

### **Payment.ts Model**
**File:** [backend/src/models/Payment.ts](backend/src/models/Payment.ts)

**Lines 230-235:** Club-scoped indexes for efficient querying
```typescript
paymentSchema.index({ clubId: 1, pollId: 1, status: 1 }); // For Open Play payments
paymentSchema.index({ clubId: 1, paymentDate: -1, status: 1 });
paymentSchema.index({ clubId: 1, status: 1, paymentMethod: 1 });
paymentSchema.index({ clubId: 1, paymentType: 1, status: 1 }); // For filtering by payment type
paymentSchema.index({ clubId: 1, userId: 1, paymentType: 1, membershipYear: 1 }); // For membership fee queries
```

**Key Optimization:**
- All indexes lead with `clubId` (multi-tenant isolation)
- Combined with `status` for quick filtering of completed/recorded payments
- Includes `paymentDate` for chronological sorting of recent payments

---

## 5. Payment Status Aggregation Function

### **Payment.ts Static Method**
**File:** [backend/src/models/Payment.ts](backend/src/models/Payment.ts#L490-L540)

**Lines 490-540:** `getPaymentStats()` static method
```typescript
paymentSchema.statics.getPaymentStats = async function(startDate?: Date, endDate?: Date) {
  const matchStage: any = {};
  
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = startDate;
    if (endDate) matchStage.createdAt.$lte = endDate;
  }
  
  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalPayments: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        completedPayments: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        completedAmount: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] }
        },
        pendingPayments: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
        },
        pendingAmount: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0] }
        },
        avgPaymentAmount: { $avg: '$amount' }
      }
    }
  ]);
  
  return stats[0] || { /* defaults */ };
};
```

**Returns:**
- `completedPayments`: Count of completed payment records
- `completedAmount`: Total amount from completed payments
- `pendingPayments`: Count of pending payments
- `pendingAmount`: Total pending amount
- `avgPaymentAmount`: Average payment amount

---

## 6. Frontend Payment Summaries - Court Receipts Report

### **court-receipts-report.component.ts**
**File:** [frontend/src/app/components/court-receipts-report/court-receipts-report.component.ts](frontend/src/app/components/court-receipts-report/court-receipts-report.component.ts#L2650-L2680)

**Lines 2652-2656:** Frontend payment filtering
```typescript
const params = {
  status: 'completed',
  limit: '1000', // Get all completed payments ready for recording
};

this.http
  .get<{ success: boolean; data: PaymentRecord[] }>(`${this.baseUrl}/payments`, { params })
```

**Payment Processing:**
- Filters for `status: 'completed'`
- Fetches up to 1000 completed payment records
- Displays in court receipts interface
- Separates manual payments from reservation-based payments
- Shows open play event payments separately

---

## 7. Payment Routes - Debug Endpoint

### **paymentRoutes.ts**
**File:** [backend/src/routes/paymentRoutes.ts](backend/src/routes/paymentRoutes.ts#L430-L445)

**Lines 434-439:** Completed payment debug query
```typescript
const completedPayments = await Payment.find({
  userId: superadmin._id.toString(),
  status: "completed",
});

console.log("🔧 DEBUG: Completed payments:", completedPayments.length);
```

---

## 8. Payment Status Values in Database Schema

### **Reservation.ts Model**
**File:** [backend/src/models/Reservation.ts](backend/src/models/Reservation.ts#L78)
```typescript
paymentStatus: 'pending' | 'paid' | 'overdue' | 'not_applicable';
```

### **Payment.ts Model**
**File:** [backend/src/models/Payment.ts](backend/src/models/Payment.ts#L12)
```typescript
status: 'pending' | 'completed' | 'failed' | 'refunded' | 'record';
```

---

## 9. Payment Date Tracking

### **Payment.ts Pre-save Middleware**
**File:** [backend/src/models/Payment.ts](backend/src/models/Payment.ts#L237-L290)

**Lines 287-289:** Auto-set payment date on completion
```typescript
if ((payment.isNew || payment.isModified('status')) && 
    payment.status === 'completed' && 
    !payment.paymentDate) {
  payment.paymentDate = new Date();
}
```

**Importance:**
- `paymentDate` is used for reporting instead of `createdAt`
- Ensures newly completed payments appear immediately in reports
- Used for filtering completed payments in date ranges

---

## 10. Configuration File References

### **backend/.env**
**File:** [backend/.env](backend/.env)
- Contains database connection for payment queries
- Environment-specific API endpoints

### **Netlify Configuration**
**File:** [frontend/ngsw-config.json](frontend/ngsw-config.json#L107)
```json
"https://tennis-club-rt2-backend.onrender.com/api/payments/**"
```
- Service worker caching configuration for RT2 payment API

---

## Summary: Complete Payment Filtering Logic for RT2 Pickleball Club

### **Filtering Criteria**
1. **By Club:** `clubId` matches RT2 Pickleball Club's MongoDB ObjectId
2. **By Status:** 
   - `status: "completed"` - approved/processed payments
   - `status: "record"` - recorded payments for financial reports
3. **By Type:**
   - `paymentType: "court_usage"` - court reservation payments
   - Excludes membership fees and tournament entries
4. **By Date:** 
   - `paymentDate` (preferred) or `createdAt` (fallback)
   - Date range filtering for reporting periods

### **Aggregation Queries**
- **Count of completed payments** - for dashboard summaries
- **Total completed amount** - revenue calculation
- **Payment distribution by status** - analytics
- **Service fee calculation** - 20% of recorded payments
- **Member court usage totals** - for court usage reports

### **Database Optimization**
- Composite indexes lead with `clubId` for multi-tenant isolation
- Combined indexes with `status` for fast completed payment queries
- `paymentDate` DESC for chronological sorting of recent payments

### **Frontend Display**
- Court receipts report filters by `status: "completed"`
- Payment status badges show on reservations
- Payment summaries grouped by method and date

