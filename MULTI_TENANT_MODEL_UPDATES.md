# Multi-Tenant Model Updates - Checklist

## Status: Phase 2 - Model Updates

### ✅ Completed Models
- [x] User.ts - Added platformRole field, kept legacy fields for migration
- [x] Reservation.ts - Added clubId, updated indexes to be club-scoped
- [x] Payment.ts - Added clubId, updated indexes to be club-scoped

### ⏳ Models Requiring clubId Field

Add `clubId` field after schema definition starts, update all indexes to include `clubId`:

```typescript
clubId: {
  type: Schema.Types.ObjectId,
  ref: 'Club',
  required: [true, 'Club ID is required'],
  index: true
},
```

#### Critical Models (Financial/Core Features)
- [ ] CreditTransaction.ts - Add clubId, update indexes
- [ ] Expense.ts - Add clubId, update indexes
- [ ] ExpenseCategory.ts - Add clubId, update indexes

#### Feature Models
- [ ] Poll.ts - Add clubId, update indexes (Open Play events)
- [ ] Announcement.ts - Add clubId, update indexes
- [ ] Suggestion.ts - Add clubId, update indexes
- [ ] GalleryImage.ts - Add clubId, update indexes

#### Tournament/Match Models
- [ ] Tournament.ts - Add clubId, update indexes
- [ ] Player.ts - Add clubId, update indexes
- [ ] SeedingPoint.ts - Add clubId, update indexes
- [ ] ResurfacingContribution.ts - Add clubId, update indexes

#### Chat Models
- [ ] ChatRoom.ts - Add clubId, update indexes
- [ ] ChatMessage.ts - Add clubId, update indexes
- [ ] ChatParticipant.ts - Add clubId, update indexes

#### Other Models
- [ ] CourtUsageReport.ts - Add clubId, update indexes
- [ ] PushSubscription.ts - Add clubId, update indexes
- [ ] AnnouncementRead.ts - Add clubId, update indexes
- [ ] ImpersonationLog.ts - Keep as platform-level (no clubId needed)
- [ ] Analytics.ts - Keep as platform-level or add clubId for per-club analytics

### Pre-save Validation Pattern

Add to all models with clubId:

```typescript
schema.pre('save', function(next) {
  if (!this.clubId) {
    return next(new Error('Club ID is required'));
  }
  next();
});
```

### Index Update Pattern

Change from:
```typescript
schema.index({ userId: 1, createdAt: -1 });
```

To:
```typescript
schema.index({ clubId: 1, userId: 1, createdAt: -1 });
```

## Migration Script Requirements

The migration script (Phase 3) will:
1. Create default "Rich Town 2 Tennis Club"
2. Add clubId to ALL existing documents in database
3. Update database indexes
4. Migrate users to ClubMembership model
5. Verify data integrity

## Notes

- All club-specific data must be scoped by clubId
- Platform-level features (ImpersonationLog, platform admin actions) should NOT have clubId
- Indexes must be updated to prevent cross-club data leakage
- Migration script is critical before any model updates take effect
