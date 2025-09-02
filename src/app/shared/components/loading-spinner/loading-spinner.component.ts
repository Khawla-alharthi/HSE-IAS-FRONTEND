// src/app/shared/components/loading-spinner/loading-spinner.component.ts
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type SpinnerSize = 'sm' | 'md' | 'lg';
export type SpinnerColor = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loading-spinner.component.html',
  styleUrls: ['./loading-spinner.component.css']
})

export class LoadingSpinnerComponent {
  @Input() size: SpinnerSize = 'md';
  @Input() color: SpinnerColor = 'primary';
  @Input() message = 'Loading...';
  @Input() showMessage = true;
  @Input() overlay = false;
  @Input() fullscreen = false;

  get containerClass(): string {
    const classes = [];
    if (this.overlay) classes.push('loading-spinner--overlay');
    if (this.fullscreen) classes.push('loading-spinner--fullscreen');
    return classes.join(' ');
  }

  get spinnerClass(): string {
    return `spinner-border-${this.size} text-${this.color}`;
  }
}