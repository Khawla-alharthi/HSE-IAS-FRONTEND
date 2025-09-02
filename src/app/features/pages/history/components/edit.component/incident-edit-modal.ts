import { Component, Input, Output, EventEmitter, signal, OnChanges, SimpleChanges, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { IncidentRecord, TreeNodeData } from '../../../../../data-access/models/incident.model';
import { IncidentRepository } from '../../../../../data-access/repositories/incident.repository';
import { UpdateIncidentRequest } from '../../../../../data-access/dto/incident.dto';

@Component({
  selector: 'app-incident-edit-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './incident-edit-modal.html',
  styleUrls: ['./incident-edit-modal.css']
})
export class IncidentEditModalComponent implements OnChanges {
  @Input() incident: IncidentRecord | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<IncidentRecord>();

  isOpen = signal(false);
  isSaving = signal(false);
  isGeneratingDiagram = signal(false);
  formError = signal<string>('');
  diagramError = signal<string>('');
  editForm!: FormGroup;
  
  diagramData = signal<TreeNodeData[]>([]);
  editingNodeId = signal<number | null>(null);
  originalLevel = signal<number>(3);
  
  // Computed properties
  showDiagramSection = computed(() => {
    if (!this.editForm) return false;
    const description = this.editForm.get('description')?.value?.trim();
    return description && description.length > 10;
  });

  canRegenerateDiagram = computed(() => {
    if (!this.editForm) return false;
    const description = this.editForm.get('description')?.value?.trim();
    const level = this.editForm.get('analysisLevel')?.value;
    return description && description.length > 10 && level;
  });

  totalNodesCount = computed(() => {
    return this.diagramData().length;
  });

  rootNodesCount = computed(() => {
    return this.diagramData().filter(node => !node.parent).length;
  });

  constructor(
    private fb: FormBuilder,
    private incidentRepository: IncidentRepository
  ) {
    this.initializeForm();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['incident'] && this.incident) {
      this.isOpen.set(true);
      this.populateForm();
      this.loadDiagramData();
      this.originalLevel.set(this.extractLevelNumber(this.incident.analysisLevel));
    }
  }

  private initializeForm() {
    this.editForm = this.fb.group({
      title: [''],
      analysisLevel: ['Level 3 - Moderate Analysis', [Validators.required]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      details: ['']
    });
  }

  private populateForm() {
    if (this.incident) {
      this.editForm.patchValue({
        title: this.incident.title || '',
        analysisLevel: this.incident.analysisLevel || 'Level 3 - Moderate Analysis',
        description: this.incident.description || '',
        details: this.incident.details || ''
      });
    }
  }

  private loadDiagramData() {
    if (this.incident?.diagrams && this.incident.diagrams.length > 0) {
      try {
        const diagramJson = this.incident.diagrams[0].diagramJson;
        const parsedData = JSON.parse(diagramJson);
        this.diagramData.set(Array.isArray(parsedData) ? parsedData : []);
      } catch (error) {
        console.error('Error parsing diagram data:', error);
        this.diagramData.set([]);
      }
    } else {
      this.diagramData.set([]);
    }
  }

  private extractLevelNumber(analysisLevel?: string): number {
    if (!analysisLevel) return 3;
    const match = analysisLevel.match(/Level (\d+)/);
    return match ? parseInt(match[1], 10) : 3;
  }

  private getLevelFromNumber(level: number): string {
    switch (level) {
      case 1: return 'Level 1 - Basic Analysis';
      case 2: return 'Level 2 - Low Priority';
      case 3: return 'Level 3 - Moderate Analysis';
      case 4: return 'Level 4 - Detailed Analysis';
      case 5: return 'Level 5 - Comprehensive Analysis';
      default: return 'Level 3 - Moderate Analysis';
    }
  }

  async onLevelChange(event: any) {
    const newLevelString = event.target.value;
    const newLevel = this.extractLevelNumber(newLevelString);
    const originalLevel = this.originalLevel();
    
    // Auto-regenerate if level changed and we have existing data
    if (newLevel !== originalLevel && this.canRegenerateDiagram()) {
      setTimeout(() => {
        this.regenerateDiagram();
      }, 100);
    }
  }

  async regenerateDiagram() {
    if (!this.canRegenerateDiagram()) {
      this.diagramError.set('Please provide incident description and select a level first.');
      return;
    }

    this.isGeneratingDiagram.set(true);
    this.diagramError.set('');
    this.editingNodeId.set(null); // Stop any current editing

    try {
      const description = this.editForm.get('description')?.value?.trim();
      const analysisLevel = this.editForm.get('analysisLevel')?.value;
      const level = this.extractLevelNumber(analysisLevel);

      if (!description || description.length < 10) {
        throw new Error('Incident description must be at least 10 characters long.');
      }

      const newDiagramData = await firstValueFrom(
        this.incidentRepository.generateDiagram(description, level)
      );

      if (newDiagramData && newDiagramData.length > 0) {
        this.diagramData.set(newDiagramData);
        console.log('Diagram regenerated successfully');
      } else {
        this.diagramError.set('No diagram data was generated. Please try again.');
      }
    } catch (error) {
      console.error('Error generating diagram:', error);
      this.diagramError.set(
        error instanceof Error 
          ? error.message 
          : 'Failed to generate diagram. Please try again.'
      );
    } finally {
      this.isGeneratingDiagram.set(false);
    }
  }

  // Node editing methods
  startEditingNode(nodeKey: number) {
    this.editingNodeId.set(nodeKey);
  }

  stopEditingNode() {
    this.editingNodeId.set(null);
  }

  onKeyDown(event: KeyboardEvent, nodeKey: number, value: string) {
    if (event.key === 'Enter' && event.ctrlKey) {
      event.preventDefault();
      this.updateNodeText(nodeKey, value);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.stopEditingNode();
    }
  }

  updateNodeText(nodeKey: number, newText: string) {
    if (!newText || !newText.trim()) {
      this.diagramError.set('Node text cannot be empty.');
      return;
    }

    this.diagramData.update(nodes => 
      nodes.map(node => 
        node.key === nodeKey 
          ? { ...node, name: newText.trim() }
          : node
      )
    );
    
    this.stopEditingNode();
    this.diagramError.set(''); // Clear any errors
  }

  addNewNode() {
    const maxKey = Math.max(...this.diagramData().map(node => node.key), 0);
    const newNode: TreeNodeData = {
      key: maxKey + 1,
      name: 'New Analysis Point',
      parent: undefined // Make it a root node by default
    };

    this.diagramData.update(nodes => [...nodes, newNode]);
    
    // Start editing the new node immediately
    this.editingNodeId.set(newNode.key);
  }

  removeNode(nodeKey: number) {
    // Remove the node and all its children
    this.diagramData.update(nodes => {
      const nodesToRemove = this.getNodeAndChildren(nodeKey, nodes);
      return nodes.filter(node => !nodesToRemove.includes(node.key));
    });

    // Stop editing if we were editing this node
    if (this.editingNodeId() === nodeKey) {
      this.editingNodeId.set(null);
    }
  }

  private getNodeAndChildren(nodeKey: number, nodes: TreeNodeData[]): number[] {
    const result = [nodeKey];
    const children = nodes.filter(node => node.parent === nodeKey);
    
    for (const child of children) {
      result.push(...this.getNodeAndChildren(child.key, nodes));
    }
    
    return result;
  }

  isEditingNode(nodeKey: number): boolean {
    return this.editingNodeId() === nodeKey;
  }

  isRootNode(node: TreeNodeData): boolean {
    return !node.parent;
  }

  getNodeLevel(node: TreeNodeData): number {
    let level = 0;
    let currentNode = node;
    const nodes = this.diagramData();
    
    while (currentNode.parent) {
      level++;
      const parentNode = nodes.find(n => n.key === currentNode.parent);
      if (!parentNode) break;
      currentNode = parentNode;
    }
    
    return level;
  }

  getNodesByLevel(): TreeNodeData[][] {
    const nodesByLevel: { [level: number]: TreeNodeData[] } = {};
    
    this.diagramData().forEach(node => {
      const level = this.getNodeLevel(node);
      if (!nodesByLevel[level]) {
        nodesByLevel[level] = [];
      }
      nodesByLevel[level].push(node);
    });
    
    // Convert to array format for template
    const maxLevel = this.getMaxLevel();
    const result: TreeNodeData[][] = [];
    for (let i = 0; i <= maxLevel; i++) {
      result[i] = nodesByLevel[i] || [];
    }
    
    return result;
  }

  getMaxLevel(): number {
    return Math.max(...this.diagramData().map(node => this.getNodeLevel(node)), 0);
  }

  // Generate levels array for ngFor
  getLevelsArray(): number[] {
    const maxLevel = this.getMaxLevel();
    return Array.from({ length: maxLevel + 1 }, (_, i) => i);
  }

  async onSubmit() {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      this.formError.set('Please fix the form errors before saving.');
      return;
    }

    // Stop any current editing
    this.editingNodeId.set(null);

    // Validate diagram data
    if (this.totalNodesCount() > 0) {
      const hasInvalidNodes = this.diagramData().some(node => 
        !node.name || node.name.trim().length === 0
      );
      
      if (hasInvalidNodes) {
        this.formError.set('All diagram nodes must have valid text.');
        return;
      }
    }

    this.isSaving.set(true);
    this.formError.set('');

    try {
      const formValue = this.editForm.value;
      const updateRequest: UpdateIncidentRequest = {
        title: formValue.title?.trim() || undefined,
        description: formValue.description?.trim(),
        details: formValue.details?.trim() || undefined,
        analysisLevel: formValue.analysisLevel
      };

      // Remove undefined values
      Object.keys(updateRequest).forEach(key => {
        if (updateRequest[key as keyof UpdateIncidentRequest] === undefined) {
          delete updateRequest[key as keyof UpdateIncidentRequest];
        }
      });

      if (!this.incident?.id) {
        throw new Error('Incident ID is required for update');
      }

      // Update the incident via repository
      const updatedIncident = await firstValueFrom(
        this.incidentRepository.updateIncident(this.incident.id, updateRequest)
      );

      // If we have diagram changes, update the diagram
      if (this.incident.diagrams && this.incident.diagrams.length > 0 && this.totalNodesCount() > 0) {
        const diagramId = this.incident.diagrams[0].id;
        const diagramTitle = `${updatedIncident.title || 'Incident'} - Analysis Diagram`;
        
        await firstValueFrom(
          this.incidentRepository.updateDiagram(diagramId, diagramTitle, this.diagramData())
        );
      } else if (this.totalNodesCount() > 0) {
        // Create new diagram if none exists
        const diagramTitle = `${updatedIncident.title || 'Incident'} - Analysis Diagram`;
        await firstValueFrom(
          this.incidentRepository.createDiagram(updatedIncident.id, diagramTitle, this.diagramData())
        );
      }

      // Emit the updated incident
      this.save.emit(updatedIncident);
      this.closeModal();
    } catch (error) {
      console.error('Error saving incident:', error);
      this.formError.set(
        error instanceof Error 
          ? error.message 
          : 'Failed to save changes. Please try again.'
      );
    } finally {
      this.isSaving.set(false);
    }
  }

  closeModal() {
    this.isOpen.set(false);
    this.formError.set('');
    this.diagramError.set('');
    this.isSaving.set(false);
    this.isGeneratingDiagram.set(false);
    this.editingNodeId.set(null);
    this.diagramData.set([]);
    this.originalLevel.set(3);
    this.editForm.reset();
    this.close.emit();
  }

  getLevelDescription(levelString: string): string {
    const level = this.extractLevelNumber(levelString);
    switch (level) {
      case 1:
        return 'Basic analysis with minimal investigation';
      case 2:
        return 'Low priority incidents with limited business impact';
      case 3:
        return 'Medium priority incidents affecting normal operations';
      case 4:
        return 'High priority incidents with significant business impact';
      case 5:
        return 'Critical incidents requiring comprehensive analysis';
      default:
        return 'Select a level to see description';
    }
  }
}