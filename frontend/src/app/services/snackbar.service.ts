import { Injectable } from '@angular/core';
import { MatSnackBar, MatSnackBarRef, TextOnlySnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class SnackbarService {
  constructor(private snackBar: MatSnackBar) {}

  /**
   * Show a success notification (green, 3 seconds)
   * @param message Success message to display
   * @param action Optional action button text (default: 'Close')
   * @returns MatSnackBarRef for handling action events
   */
  success(message: string, action: string = 'Close'): MatSnackBarRef<TextOnlySnackBar> {
    return this.snackBar.open(message, action, {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: ['snackbar-success'],
      politeness: 'polite'
    });
  }

  /**
   * Show an error notification (red, 5 seconds)
   * @param message Error message to display
   * @param action Optional action button text (default: 'Close')
   * @returns MatSnackBarRef for handling action events
   */
  error(message: string, action: string = 'Close'): MatSnackBarRef<TextOnlySnackBar> {
    return this.snackBar.open(message, action, {
      duration: 5000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: ['snackbar-error'],
      politeness: 'assertive'
    });
  }

  /**
   * Show a warning notification (orange, 4 seconds)
   * @param message Warning message to display
   * @param action Optional action button text (default: 'Close')
   * @returns MatSnackBarRef for handling action events
   */
  warning(message: string, action: string = 'Close'): MatSnackBarRef<TextOnlySnackBar> {
    return this.snackBar.open(message, action, {
      duration: 4000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: ['snackbar-warning'],
      politeness: 'polite'
    });
  }

  /**
   * Show an info notification (blue, 3 seconds)
   * @param message Info message to display
   * @param action Optional action button text (default: 'Close')
   * @returns MatSnackBarRef for handling action events
   */
  info(message: string, action: string = 'Close'): MatSnackBarRef<TextOnlySnackBar> {
    return this.snackBar.open(message, action, {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: ['snackbar-info'],
      politeness: 'polite'
    });
  }

  /**
   * Show a custom notification with full control
   * @param message Message to display
   * @param action Action button text
   * @param config Custom MatSnackBarConfig
   * @returns MatSnackBarRef for handling action events
   */
  custom(message: string, action: string, config: MatSnackBarConfig): MatSnackBarRef<TextOnlySnackBar> {
    return this.snackBar.open(message, action, config);
  }
}
