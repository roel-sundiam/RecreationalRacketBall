import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';

@Component({
  selector: 'app-tennis-ball-machine-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatListModule
  ],
  templateUrl: './tennis-ball-machine-dialog.component.html',
  styleUrls: ['./tennis-ball-machine-dialog.component.scss']
})
export class TennisBallMachineDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<TennisBallMachineDialogComponent>
  ) {}

  close(): void {
    this.dialogRef.close();
  }
}
