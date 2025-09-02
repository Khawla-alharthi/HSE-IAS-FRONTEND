import { Component, Input, Output, EventEmitter, signal, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IncidentRecord } from '../../../../../data-access/models/incident.model';

@Component({
  selector: 'app-incident-view-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './incident-view-modal.html',
  styleUrls: ['./incident-view-modal.css']
})
export class IncidentViewModalComponent implements OnChanges {
  @Input() incident: IncidentRecord | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() edit = new EventEmitter<IncidentRecord>();

  isOpen = signal(false);

  ngOnChanges(changes: SimpleChanges) {
    if (changes['incident']) {
      this.isOpen.set(!!this.incident);
    }
  }

  closeModal() {
    this.isOpen.set(false);
    this.close.emit();
  }

  onEdit() {
    if (this.incident) {
      this.edit.emit(this.incident);
    }
  }

  getIncidentLevelBadgeClass(level: string | undefined): string {
    if (!level) return 'badge-secondary';
    
    const levelNum = parseInt(level);
    switch (levelNum) {
      case 1:
      case 2:
        return 'badge-info';
      case 3:
        return 'badge-warning';
      case 4:
      case 5:
        return 'badge-danger';
      default:
        return 'badge-secondary';
    }
  }

  formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  hasMetadata(): boolean {
    return !!(this.incident?.id || this.incident?.userName || this.incident?.user);
  }
}