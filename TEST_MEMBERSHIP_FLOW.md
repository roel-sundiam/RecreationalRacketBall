# Testing Self-Service Club Membership Flow

## Prerequisites
1. Backend running on `http://localhost:3000`
2. Frontend running on `http://localhost:4200`
3. At least one active club in the database
4. Test user account (non-admin)

## Test Scenario 1: Browse Available Clubs

### Steps:
1. Login as regular user (e.g., RoelSundiam/RT2Tennis)
2. Navigate to `/browse-clubs` or click "Browse More Clubs" from club selector
3. Verify you see clubs you're NOT a member of
4. Check that club details are displayed:
   - Club name
   - Location (city, province)
   - Member count
   - Membership fee
   - Operating hours
   - Street address

### Expected Results:
- ✅ Only active clubs shown
- ✅ Clubs you already belong to are NOT shown
- ✅ All club information displays correctly
- ✅ "Request Membership" button visible on each card

## Test Scenario 2: Request Membership

### Steps:
1. From browse clubs page, click "Request Membership" on a club
2. Wait for confirmation message
3. Verify redirect to `/my-requests`
4. Check the request appears in the list with "Pending" status

### Expected Results:
- ✅ Success message: "Membership request submitted successfully. Please wait for admin approval."
- ✅ Automatic redirect to "My Requests" page
- ✅ Request shows with yellow/accent "Pending" chip
- ✅ Request date displays correctly
- ✅ "Cancel Request" button is visible

### API Test (Optional):
```bash
# Get JWT token from localStorage in browser console
# Then test the endpoint:

curl -X POST http://localhost:3000/api/members/request \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"clubId": "CLUB_ID_HERE"}'
```

## Test Scenario 3: View My Requests

### Steps:
1. Navigate to `/my-requests`
2. Verify all your membership requests are listed
3. Check status indicators are correct
4. Try clicking different action buttons

### Expected Results:
- ✅ All requests displayed (pending, approved, rejected)
- ✅ Status colors correct:
  - Pending = Yellow/Accent
  - Approved = Green/Primary
  - Rejected = Red/Warn
- ✅ Approved requests show credit balance and seed points
- ✅ "Access Club" button appears for approved memberships

### API Test (Optional):
```bash
curl -X GET http://localhost:3000/api/members/my-requests \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Test Scenario 4: Cancel Pending Request

### Steps:
1. From "My Requests" page, find a pending request
2. Click "Cancel Request" button
3. Confirm the cancellation in the dialog
4. Verify request is removed from list

### Expected Results:
- ✅ Confirmation dialog appears
- ✅ Success message: "Membership request cancelled successfully"
- ✅ Request disappears from list
- ✅ Page reloads with updated data

### API Test (Optional):
```bash
curl -X DELETE http://localhost:3000/api/members/requests/MEMBERSHIP_ID/cancel \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Test Scenario 5: Admin Approval Flow

### Steps:
1. Login as club admin
2. Navigate to Admin → Member Management
3. Click "Pending Members" tab
4. Find the membership request
5. Click "Approve" button
6. Logout admin, login back as regular user
7. Navigate to `/my-requests`
8. Verify status changed to "Approved"
9. Click "Access Club" button

### Expected Results:
- ✅ Request appears in admin's pending list
- ✅ Admin can approve the request
- ✅ Status changes from "Pending" to "Approved"
- ✅ Green "Approved" chip displays
- ✅ Credit balance and seed points shown
- ✅ "Access Club" button redirects to club selector
- ✅ Club now appears in user's club selector

## Test Scenario 6: Duplicate Request Prevention

### Steps:
1. Request membership to a club
2. Try to request membership to the SAME club again
3. Verify error message

### Expected Results:
- ✅ Error message: "You already have a pending request for this club"
- ✅ Request is NOT created
- ✅ No duplicate entries in database

### API Test:
```bash
# Try requesting same club twice
curl -X POST http://localhost:3000/api/members/request \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"clubId": "SAME_CLUB_ID"}'
```

## Test Scenario 7: Inactive Club Rejection

### Steps:
1. Use platform admin to suspend a club
2. Try to request membership to the suspended club
3. Verify error message

### Expected Results:
- ✅ Error message: "This club is not accepting new members at this time"
- ✅ Request is NOT created
- ✅ Suspended clubs do NOT appear in browse list

## Test Scenario 8: Browse Button in Club Selector

### Steps:
1. Navigate to `/club-selector`
2. Scroll to bottom
3. Click "Browse More Clubs" button
4. Verify redirect to `/browse-clubs`

### Expected Results:
- ✅ "Browse More Clubs" button visible
- ✅ Button styled correctly (stroked outline, primary color)
- ✅ Redirects to browse clubs page

## Test Scenario 9: Empty States

### Test 9a: No Available Clubs
1. Join all active clubs in the system
2. Navigate to `/browse-clubs`
3. Verify empty state message

**Expected:**
- ✅ Tennis icon displayed
- ✅ Message: "No clubs available"
- ✅ "You are already a member of all active clubs!"
- ✅ "View My Clubs" button

### Test 9b: No Membership Requests
1. Cancel all pending requests
2. Leave all clubs (as admin)
3. Navigate to `/my-requests`
4. Verify empty state message

**Expected:**
- ✅ Assignment icon displayed
- ✅ Message: "No membership requests"
- ✅ "Browse Available Clubs" button

## Test Scenario 10: Mobile Responsiveness

### Steps:
1. Resize browser to mobile width (e.g., 375px)
2. Test all pages:
   - Browse clubs
   - My requests
   - Club selector

### Expected Results:
- ✅ Cards stack vertically
- ✅ Buttons remain full-width and min 48px height
- ✅ Text remains readable (min 16px)
- ✅ No horizontal scrolling
- ✅ All features accessible on mobile

## Database Verification

### Check ClubMembership Collection
```javascript
// In MongoDB shell or Compass
db.clubmemberships.find({
  userId: ObjectId("USER_ID_HERE")
}).pretty()
```

**Verify:**
- ✅ Status = 'pending' for new requests
- ✅ Role = 'member'
- ✅ creditBalance = club's initialCreditBalance
- ✅ seedPoints = 0
- ✅ joinedAt timestamp is correct

## Performance Testing

### Page Load Times
- Browse clubs: Should load < 2 seconds
- My requests: Should load < 1 second
- Request submission: Should complete < 1 second

### Concurrent Requests
1. Open multiple browser tabs
2. Submit requests from different tabs simultaneously
3. Verify no race conditions or duplicate requests

## Error Handling Tests

### Test Invalid Club ID
```bash
curl -X POST http://localhost:3000/api/members/request \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"clubId": "invalid_id"}'
```
**Expected:** 404 error "Club not found"

### Test Missing Club ID
```bash
curl -X POST http://localhost:3000/api/members/request \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```
**Expected:** 400 error "Club ID is required"

### Test Unauthorized Access
```bash
curl -X GET http://localhost:3000/api/members/my-requests
```
**Expected:** 401 error "Authentication required"

## Browser Compatibility

Test on:
- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)
- ✅ Mobile Safari (iOS)
- ✅ Mobile Chrome (Android)

## Accessibility Testing

1. Test keyboard navigation (Tab, Enter, Escape)
2. Test screen reader compatibility
3. Verify color contrast ratios
4. Check ARIA labels on buttons

## Summary Checklist

### Backend
- [ ] All API endpoints return correct responses
- [ ] Error handling works correctly
- [ ] Database records created properly
- [ ] No duplicate requests allowed
- [ ] Active club validation works

### Frontend
- [ ] Browse clubs displays correctly
- [ ] Request membership flow works
- [ ] My requests page displays all statuses
- [ ] Cancel request works
- [ ] Empty states display correctly
- [ ] Loading states work
- [ ] Mobile responsive
- [ ] All navigation links work

### Integration
- [ ] Complete user journey works end-to-end
- [ ] Admin approval updates status correctly
- [ ] Approved clubs appear in club selector
- [ ] Browse button visible in club selector

### Edge Cases
- [ ] Duplicate request prevention
- [ ] Inactive club rejection
- [ ] Cancel approved request fails
- [ ] Invalid IDs handled gracefully

## Test Data Setup

### Create Test Club (as superadmin)
```bash
POST /api/clubs/register
{
  "name": "Suburbia Club",
  "contactEmail": "suburbia@example.com",
  "contactPhone": "+63 123 456 7890",
  "address": {
    "street": "123 Suburbia Street",
    "city": "San Fernando",
    "province": "Pampanga",
    "postalCode": "2000",
    "country": "Philippines"
  },
  "coordinates": {
    "latitude": 15.087,
    "longitude": 120.6285
  },
  "primaryColor": "#1976d2",
  "accentColor": "#ff4081"
}
```

### Create Test User
Use existing test user: **RoelSundiam** / **RT2Tennis**

## Troubleshooting

### Issue: "No clubs available"
- Check if any clubs have status = 'active'
- Verify user isn't already a member of all clubs

### Issue: Request not showing in admin panel
- Verify request status is 'pending'
- Check clubId matches admin's club context
- Refresh admin panel

### Issue: Cannot cancel request
- Verify request status is 'pending'
- Check if user owns the request
- Verify membershipId is correct

### Issue: Frontend build fails
- Run `npm install --force` in frontend directory
- Clear cache: `rm -rf node_modules/.cache`
- Rebuild: `ng build --configuration=development`

## Success Criteria

All tests pass when:
1. ✅ Users can browse clubs they don't belong to
2. ✅ Users can request membership with one click
3. ✅ Requests appear in admin's pending list
4. ✅ Admin can approve requests
5. ✅ Approved clubs appear in user's club selector
6. ✅ Users can track all their requests
7. ✅ Users can cancel pending requests
8. ✅ No platform admin intervention needed

**Date:** February 1, 2026
**Status:** Ready for Testing
