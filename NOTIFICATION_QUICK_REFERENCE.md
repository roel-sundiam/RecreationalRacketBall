# Notification System - Quick Reference Guide

**For Developers**: Use this guide when adding dialogs or notifications to the application.

---

## Import Services

```typescript
import { DialogService } from '../../services/dialog.service';
import { SnackbarService } from '../../services/snackbar.service';
```

```typescript
constructor(
  private dialogService: DialogService,
  private snackbarService: SnackbarService
) {}
```

---

## When to Use What

| Scenario | Use | Example |
|----------|-----|---------|
| Destructive action (delete, unrecord) | `dialogService.confirm()` with `type: 'danger'` | Delete item, unrecord payment |
| Important action (record, approve) | `dialogService.confirm()` with `type: 'info'` | Record payment, approve member |
| Caution action (cancel, deactivate) | `dialogService.confirm()` with `type: 'warning'` | Cancel request, deactivate category |
| Success feedback | `snackbarService.success()` | "Saved successfully" |
| Error feedback | `snackbarService.error()` | "Failed to load data" |
| Warning notification | `snackbarService.warning()` | "Payment due soon" |
| Info notification | `snackbarService.info()` | "Auto-refresh enabled" |
| Must acknowledge info | `dialogService.alert()` | "Request submitted" |

---

## DialogService Examples

### Basic Confirmation
```typescript
this.dialogService.confirm({
  title: 'Confirm Delete',
  message: 'Are you sure you want to delete this item?',
  type: 'danger',
  icon: 'delete',
  confirmText: 'Delete',
  cancelText: 'Cancel'
}).subscribe(confirmed => {
  if (confirmed) {
    this.deleteItem();
  }
});
```

### Alert Dialog
```typescript
this.dialogService.alert({
  title: 'Success',
  message: 'Your request has been submitted successfully',
  type: 'info',
  icon: 'check_circle',
  buttonText: 'OK'
}).subscribe(() => {
  this.router.navigate(['/my-requests']);
});
```

### Delete Confirmation (Shorthand)
```typescript
this.dialogService.delete({
  itemName: 'Poll Name'  // Auto-generates: "Are you sure you want to delete Poll Name?"
}).subscribe(confirmed => {
  if (confirmed) {
    this.deletePoll();
  }
});
```

### Multi-Line Details
```typescript
this.dialogService.confirm({
  title: 'Unrecord Payment',
  message: 'Are you sure you want to unrecord this payment?',
  details: [
    'Change status from "Recorded" back to "Completed"',
    'Remove it from the Court Usage Report',
    'Keep the payment as paid but no longer counted'
  ],
  type: 'warning',
  icon: 'undo',
  confirmText: 'Unrecord',
  cancelText: 'Cancel'
}).subscribe(confirmed => {
  if (confirmed) {
    this.unrecordPayment();
  }
});
```

---

## SnackbarService Examples

### Success Notification
```typescript
this.snackbarService.success('Payment recorded successfully');
```

### Error Notification
```typescript
this.snackbarService.error('Failed to load data. Please try again.');
```

### Warning with Action
```typescript
const ref = this.snackbarService.warning('Payment due tomorrow', 'View');
ref.onAction().subscribe(() => {
  this.router.navigate(['/payments']);
});
```

### Info Notification
```typescript
this.snackbarService.info('Auto-refresh enabled');
```

---

## Dialog Types & Colors

| Type | Header Color | Icon Color | Button Color | Use Case |
|------|-------------|-----------|--------------|----------|
| `info` | Light blue | Blue | Primary | General confirmations, info |
| `warning` | Light orange | Orange | Accent | Caution, requires consideration |
| `danger` | Light red | Red | Warn | Destructive actions, delete |

---

## Material Icons Reference

Common icons for dialogs:

| Action | Icon Name |
|--------|-----------|
| Delete | `delete` |
| Warning | `warning` |
| Error | `error` |
| Info | `info` |
| Success | `check_circle` |
| Undo | `undo` |
| Cancel | `cancel` |
| Receipt | `receipt` |
| Archive | `archive` |
| Notifications | `notifications` |

---

## Mobile Behavior

- **Desktop (≥768px)**: Center modal, max 500px width
- **Mobile (<768px)**: Bottom sheet, 100% width, 48px min button height
- **Animation**: Slide up on mobile (0.3s ease)
- **Motion**: Respects `prefers-reduced-motion`

---

## Keyboard Shortcuts

- **ESC**: Cancel/close dialog
- **Enter**: Confirm (if not focused on cancel button)
- **Tab**: Navigate between buttons

---

## DO's and DON'Ts

### ✅ DO
- Use `dialogService.confirm()` for destructive actions
- Use `snackbarService.success()/error()` for feedback
- Provide clear, specific button labels ("Delete Item" not "OK")
- Use multi-line `details` for complex confirmations
- Use appropriate dialog types (danger for delete, warning for caution)

### ❌ DON'T
- Don't use native `alert()` or `confirm()` - use services instead
- Don't use ambiguous button text ("Yes/No")
- Don't show multiple dialogs simultaneously
- Don't use emoji in messages (use Material Icons)
- Don't block with dialogs for non-critical info (use snackbars)

---

## Testing Checklist

When adding a new dialog:
- [ ] Test on desktop (Chrome, Firefox, Safari)
- [ ] Test on mobile (iOS Safari, Chrome Mobile)
- [ ] Test keyboard navigation (ESC, Enter, Tab)
- [ ] Test with screen reader (verify announcements)
- [ ] Verify button labels are clear and actionable
- [ ] Check mobile bottom sheet appearance
- [ ] Verify focus trap works (Tab doesn't escape dialog)

---

## Common Patterns

### Delete with API Call
```typescript
deleteItem(item: Item): void {
  this.dialogService.delete({
    itemName: item.name
  }).subscribe(confirmed => {
    if (!confirmed) return;

    this.http.delete(`/api/items/${item._id}`).subscribe({
      next: () => {
        this.snackbarService.success('Item deleted successfully');
        this.loadItems();
      },
      error: (err) => {
        this.snackbarService.error('Failed to delete item');
      }
    });
  });
}
```

### Update with Confirmation
```typescript
recordPayment(payment: Payment): void {
  this.dialogService.confirm({
    title: 'Record Payment',
    message: `Record payment ${payment.referenceNumber} in financial reports?`,
    type: 'info',
    icon: 'receipt',
    confirmText: 'Record',
    cancelText: 'Cancel'
  }).subscribe(confirmed => {
    if (!confirmed) return;

    this.http.put(`/api/payments/${payment._id}/record`, {}).subscribe({
      next: () => {
        this.snackbarService.success('Payment recorded successfully');
        this.loadPayments();
      },
      error: (err) => {
        this.snackbarService.error('Failed to record payment');
      }
    });
  });
}
```

### Success Alert with Navigation
```typescript
submitRequest(): void {
  this.http.post('/api/requests', this.form.value).subscribe({
    next: (response) => {
      this.dialogService.alert({
        title: 'Success',
        message: response.message,
        type: 'info',
        icon: 'check_circle'
      }).subscribe(() => {
        this.router.navigate(['/my-requests']);
      });
    },
    error: (err) => {
      this.snackbarService.error(err.error?.error || 'Failed to submit request');
    }
  });
}
```

---

## TypeScript Interfaces

```typescript
// DialogService interfaces
interface ConfirmDialogConfig {
  title: string;
  message: string;
  details?: string[];  // Multi-line bullet points
  type?: 'warning' | 'danger' | 'info';
  icon?: string;  // Material icon name
  confirmText?: string;  // Default: 'Confirm'
  cancelText?: string;   // Default: 'Cancel'
}

interface AlertDialogConfig {
  title: string;
  message: string;
  type?: 'info' | 'warning' | 'danger';
  icon?: string;
  buttonText?: string;  // Default: 'OK'
}

interface DeleteDialogConfig {
  title?: string;        // Default: 'Confirm Delete'
  message?: string;      // Auto-generated if not provided
  itemName?: string;     // Used in auto-generated message
  confirmText?: string;  // Default: 'Delete'
}
```

---

## Migration from Native Dialogs

### Before (Native)
```typescript
if (confirm('Are you sure?')) {
  this.deleteItem();
}
```

### After (Modern)
```typescript
this.dialogService.confirm({
  title: 'Confirm Delete',
  message: 'Are you sure you want to delete this item?',
  type: 'danger'
}).subscribe(confirmed => {
  if (confirmed) this.deleteItem();
});
```

---

For complete documentation, see `NOTIFICATION_SYSTEM_IMPLEMENTATION_COMPLETE.md`
