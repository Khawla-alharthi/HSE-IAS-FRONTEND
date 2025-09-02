// main.page.ts
import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { IncidentRepository } from '../../../data-access/repositories/incident.repository';
import { TreeNodeData, IncidentRecord } from '../../../data-access/models/incident.model';
import { CreateIncidentRequest } from '../../../data-access/dto/incident.dto';

import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { FormFieldComponent } from '../../../shared/components/form-field/form-field.component';
import { HierarchyDiagramComponent } from '../../../shared/components/hierarchy-diagram/hierarchy-diagram.component';

@Component({
  selector: 'app-main',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LoadingSpinnerComponent,
    FormFieldComponent,
    HierarchyDiagramComponent
  ],
  templateUrl: './main.page.html',
  styleUrls: ['./main.page.css']
})
export class MainPage implements OnInit {
  @ViewChild(HierarchyDiagramComponent) diagramComponent!: HierarchyDiagramComponent;

  incidentForm: FormGroup;
  diagramData: TreeNodeData[] = [];
  isGenerating = false;
  isSaving = false;
  showDiagram = false;
  errorMessage = '';
  successMessage = '';

  levelOptions = [
    { value: 3, label: '3 - Basic Analysis' },
    { value: 4, label: '4 - Detailed Analysis' },
    { value: 5, label: '5 - Comprehensive Analysis' }
  ];

  diagramOptions = {
    readonly: false,
    showExportButton: true,
    height: '500px',
    background: '#f8f9fa',
    enablePanning: true,
    enableZooming: true
  };

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private incidentRepository: IncidentRepository,
    private router: Router
  ) {
    this.incidentForm = this.createForm();
  }

  ngOnInit(): void {
    // Check authentication
    if (!this.authService.isAuthenticated) {
      this.router.navigate(['/login']);
      return;
    }

    // Reset form and state
    this.resetForm();
  }

  private createForm(): FormGroup {
    return this.formBuilder.group({
      incident: ['', [Validators.required, Validators.minLength(10)]],
      level: [3, [Validators.required, Validators.min(3), Validators.max(5)]],
      title: [''],
      notes: ['']
    });
  }

  private resetForm(): void {
    this.incidentForm.reset({
      incident: '',
      level: 3,
      title: '',
      notes: ''
    });
    this.diagramData = [];
    this.showDiagram = false;
    this.errorMessage = '';
    this.successMessage = '';
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.incidentForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.incidentForm.get(fieldName);
    if (!field || !field.errors) return '';

    if (field.errors['required']) return `${fieldName} is required`;
    if (field.errors['minlength']) {
      const minLength = field.errors['minlength'].requiredLength;
      return `${fieldName} must be at least ${minLength} characters`;
    }
    if (field.errors['min']) return `Level must be at least ${field.errors['min'].min}`;
    if (field.errors['max']) return `Level must be at most ${field.errors['max'].max}`;

    return 'Invalid value';
  }

  onGenerateDiagram(): void {
    if (!this.incidentForm.valid) {
      this.markFormGroupTouched();
      return;
    }

    this.isGenerating = true;
    this.errorMessage = '';
    this.successMessage = '';

    const { incident, level } = this.incidentForm.value;

    this.incidentRepository.generateDiagram(incident, level).subscribe({
      next: (data) => {
        this.diagramData = data;
        this.showDiagram = true;
        this.isGenerating = false;
        
        // Auto-generate title if not provided
        if (!this.incidentForm.get('title')?.value) {
          this.incidentForm.patchValue({
            title: this.generateTitleFromIncident(incident)
          });
        }

        // Scroll to diagram after it's rendered
        setTimeout(() => {
          this.scrollToDiagram();
        }, 100);
      },
      error: (error) => {
        this.isGenerating = false;
        this.errorMessage = error.message || 'Failed to generate diagram. Please try again.';
      }
    });
  }

  onSaveIncident(): void {
    if (!this.incidentForm.valid || !this.diagramData.length) {
      this.markFormGroupTouched();
      return;
    }

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      this.errorMessage = 'User not authenticated';
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    // Map form data to match your CreateIncidentRequest DTO structure
    const createDto: CreateIncidentRequest = {
      userName: currentUser.userName, // This gets passed separately, but included for completeness
      title: this.incidentForm.get('title')?.value || this.generateTitleFromIncident(this.incidentForm.get('incident')?.value),
      description: this.incidentForm.get('incident')?.value, // Map 'incident' field to 'description'
      details: this.incidentForm.get('notes')?.value || undefined,
      analysisLevel: this.mapLevelToAnalysisLevel(this.incidentForm.get('level')?.value || 3)
    };

    // Use the exact method signature from your repository: saveIncident(userName: string, dto: CreateIncidentRequest)
    this.incidentRepository.saveIncident(currentUser.userName, createDto).subscribe({
      next: (savedRecord) => {
        this.isSaving = false;
        this.successMessage = 'Incident analysis saved successfully!';
        
        // Reset form after successful save
        setTimeout(() => {
          this.resetForm();
        }, 2000);
      },
      error: (error) => {
        this.isSaving = false;
        this.errorMessage = error.message || 'Failed to save incident. Please try again.';
      }
    });
  }

  onNewAnalysis(): void {
    this.resetForm();
  }

  onExportDiagram(): void {
    if (this.diagramComponent) {
      const { incident, level } = this.incidentForm.value;
      this.diagramComponent.printDiagram(incident, level);
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.incidentForm.controls).forEach(key => {
      this.incidentForm.get(key)?.markAsTouched();
    });
  }

  private generateTitleFromIncident(incident: string): string {
    const words = incident.split(' ').slice(0, 4);
    return words.join(' ') + (incident.split(' ').length > 4 ? '...' : '');
  }

  private mapLevelToAnalysisLevel(level: number): string {
    const levelMap: { [key: number]: string } = {
      3: 'Level 3 - Basic Analysis',
      4: 'Level 4 - Detailed Analysis', 
      5: 'Level 5 - Comprehensive Analysis'
    };
    return levelMap[level] || 'Level 3 - Basic Analysis';
  }

  private scrollToDiagram(): void {
    const diagramElement = document.querySelector('.diagram-section');
    if (diagramElement) {
      diagramElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  onDiagramReady(): void {
    // Called when diagram is fully initialized
    console.log('Diagram is ready');
  }

  fillSampleData(type: 'fire' | 'slip' | 'chemical'): void {
    const sampleData = {
      fire: {
        incident: 'Fire started in electrical control panel due to overloaded circuit during night shift operations',
        level: 4,
        title: 'Electrical Panel Fire',
        notes: 'Consider electrical system upgrade and load balancing improvements'
      },
      slip: {
        incident: 'Employee slipped on wet floor near loading dock entrance during morning delivery',
        level: 3,
        title: 'Loading Dock Slip Incident',
        notes: 'Weather conditions and floor drainage should be evaluated'
      },
      chemical: {
        incident: 'Chemical spill occurred during transfer process in laboratory due to container failure',
        level: 4,
        title: 'Laboratory Chemical Spill',
        notes: 'Review container inspection procedures and transfer protocols'
      }
    };

    const data = sampleData[type];
    this.incidentForm.patchValue(data);
    
    // Mark fields as touched to show they're filled
    Object.keys(this.incidentForm.controls).forEach(key => {
      this.incidentForm.get(key)?.markAsTouched();
    });

    // Auto-generate diagram after a short delay
    setTimeout(() => {
      if (this.incidentForm.valid) {
        this.onGenerateDiagram();
      }
    }, 500);
  }

  // Convenience getters for template
  get currentUser() {
    return this.authService.getCurrentUser();
  }

  get canSave(): boolean {
    return this.incidentForm.valid && this.diagramData.length > 0 && !this.isSaving;
  }

  get canGenerate(): boolean {
    const incident = this.incidentForm.get('incident');
    const level = this.incidentForm.get('level');
    return !!(incident?.valid && level?.valid) && !this.isGenerating;
  }
}