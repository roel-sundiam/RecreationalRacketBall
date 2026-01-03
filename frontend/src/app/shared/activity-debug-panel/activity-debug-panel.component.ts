import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ActivityMonitorService, DebugInfo } from '../../services/activity-monitor.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-activity-debug-panel',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule],
  template: `
    <div class="debug-panel" *ngIf="debugInfo">
      <div class="debug-header">
        <h3>🔧 Activity Monitor Debug</h3>
        <button mat-icon-button (click)="toggleExpanded()">
          <mat-icon>{{ expanded ? 'expand_less' : 'expand_more' }}</mat-icon>
        </button>
      </div>

      <div class="debug-status">
        <div class="status-item" [class.connected]="debugInfo.websocketConnected">
          <mat-icon>{{ debugInfo.websocketConnected ? 'wifi' : 'wifi_off' }}</mat-icon>
          <span>WebSocket: {{ debugInfo.websocketConnected ? 'Connected' : 'Disconnected' }}</span>
        </div>

        <div class="status-item" [class.connected]="debugInfo.userAuthenticated">
          <mat-icon>{{ debugInfo.userAuthenticated ? 'verified_user' : 'person_off' }}</mat-icon>
          <span>Auth: {{ debugInfo.userAuthenticated ? 'Yes' : 'No' }}</span>
        </div>

        <div class="status-item" [class.connected]="debugInfo.isAdmin">
          <mat-icon>{{ debugInfo.isAdmin ? 'admin_panel_settings' : 'person' }}</mat-icon>
          <span>Admin: {{ debugInfo.isAdmin ? 'Yes' : 'No' }}</span>
        </div>

        <div class="status-item" [class.connected]="debugInfo.adminSubscribed">
          <mat-icon>{{ debugInfo.adminSubscribed ? 'notifications_active' : 'notifications_off' }}</mat-icon>
          <span>Subscribed: {{ debugInfo.adminSubscribed ? 'Yes' : 'No' }}</span>
        </div>
      </div>

      <div *ngIf="expanded" class="debug-details">
        <div class="debug-section">
          <h4>📋 Debug Logs (Last 20):</h4>
          <ul class="debug-logs">
            <li *ngFor="let log of debugInfo.debugLogs" [innerHTML]="log"></li>
          </ul>
          <p *ngIf="debugInfo.debugLogs.length === 0" class="no-data">No logs yet...</p>
        </div>

        <div class="debug-section" *ngIf="debugInfo.socketId">
          <h4>🔌 Socket ID:</h4>
          <p class="socket-id">{{ debugInfo.socketId }}</p>
        </div>

        <div class="debug-section" *ngIf="debugInfo.recentActivities.length > 0">
          <h4>📡 Received Activities (Last 10):</h4>
          <ul>
            <li *ngFor="let activity of debugInfo.recentActivities">{{ activity }}</li>
          </ul>
        </div>

        <div class="debug-section" *ngIf="debugInfo.recentEmissions.length > 0">
          <h4>📤 Emitted Events (Last 10):</h4>
          <ul>
            <li *ngFor="let emission of debugInfo.recentEmissions">{{ emission }}</li>
          </ul>
        </div>

        <div class="debug-section" *ngIf="debugInfo.lastError">
          <h4>❌ Last Error:</h4>
          <p class="error">{{ debugInfo.lastError }}</p>
        </div>

        <div class="debug-section" *ngIf="!debugInfo.websocketConnected">
          <h4>⚠️ Troubleshooting:</h4>
          <ul>
            <li>Check if backend is running (http://localhost:3000/health)</li>
            <li>Refresh the page to reconnect</li>
            <li>Check browser console for errors (F12)</li>
          </ul>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .debug-panel {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #1e1e1e;
      color: #fff;
      border: 2px solid #4CAF50;
      border-radius: 8px;
      padding: 16px;
      max-width: 400px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 9999;
      font-family: 'Courier New', monospace;
      font-size: 13px;
    }

    .debug-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      border-bottom: 1px solid #4CAF50;
      padding-bottom: 8px;
    }

    .debug-header h3 {
      margin: 0;
      font-size: 16px;
      color: #4CAF50;
    }

    .debug-status {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 12px;
    }

    .status-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px;
      background: #2a2a2a;
      border-radius: 4px;
      border-left: 3px solid #f44336;
    }

    .status-item.connected {
      border-left-color: #4CAF50;
    }

    .status-item mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: #f44336;
    }

    .status-item.connected mat-icon {
      color: #4CAF50;
    }

    .status-item span {
      font-size: 12px;
    }

    .debug-details {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid #4CAF50;
    }

    .debug-section {
      margin-bottom: 12px;
    }

    .debug-section h4 {
      margin: 0 0 8px 0;
      font-size: 14px;
      color: #4CAF50;
    }

    .debug-section ul {
      margin: 0;
      padding-left: 20px;
      list-style: none;
    }

    .debug-section li {
      font-size: 11px;
      padding: 4px 0;
      border-bottom: 1px solid #333;
      color: #b0b0b0;
    }

    .debug-section li:before {
      content: "▸ ";
      color: #4CAF50;
      font-weight: bold;
    }

    .error {
      color: #f44336;
      background: #2a0a0a;
      padding: 8px;
      border-radius: 4px;
      font-size: 11px;
    }

    .debug-logs {
      max-height: 200px;
      overflow-y: auto;
      background: #1a1a1a;
      padding: 8px;
      border-radius: 4px;
    }

    .debug-logs li {
      font-size: 10px;
      color: #90EE90;
      font-family: 'Courier New', monospace;
    }

    .socket-id {
      font-family: 'Courier New', monospace;
      font-size: 11px;
      color: #FFA500;
      background: #2a2a2a;
      padding: 8px;
      border-radius: 4px;
      word-break: break-all;
    }

    .no-data {
      color: #888;
      font-style: italic;
      font-size: 11px;
    }
  `]
})
export class ActivityDebugPanelComponent implements OnInit, OnDestroy {
  debugInfo: DebugInfo | null = null;
  expanded = false;
  private subscription?: Subscription;

  constructor(private activityMonitorService: ActivityMonitorService) {}

  ngOnInit(): void {
    this.subscription = this.activityMonitorService.debug$.subscribe(
      debug => this.debugInfo = debug
    );
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  toggleExpanded(): void {
    this.expanded = !this.expanded;
  }
}
