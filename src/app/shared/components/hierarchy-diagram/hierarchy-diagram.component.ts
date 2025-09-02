import { Component, Input, OnInit, OnDestroy, ElementRef, ViewChild, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as go from 'gojs';
import { TreeNodeData } from '../../../data-access/models/incident.model';

export interface DiagramOptions {
  readonly?: boolean;
  showExportButton?: boolean;
  height?: string;
  background?: string;
  enablePanning?: boolean;
  enableZooming?: boolean;
}

@Component({
  selector: 'app-hierarchy-diagram',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hierarchy-diagram.component.html',
  styleUrls: ['./hierarchy-diagram.component.css']
})
export class HierarchyDiagramComponent implements OnInit, OnDestroy {
  @Input() data: TreeNodeData[] = [];
  @Input() options: DiagramOptions = {};
  @Input() loading = false;
  @Output() diagramReady = new EventEmitter<void>();
  @Output() exportRequested = new EventEmitter<void>();

  @ViewChild('diagramDiv', { static: true }) diagramDiv!: ElementRef;

  private diagram!: go.Diagram;
  private resizeObserver?: ResizeObserver;
  isInitialized = false;

  // Color palette for different levels - Updated with better colors
  private levelColors = [
    '#E3F2FD', // Level 1 - Light Blue
    '#F3E5F5', // Level 2 - Light Purple
    '#E8F5E8', // Level 3 - Light Green
    '#FFF3E0', // Level 4 - Light Orange
    '#FCE4EC', // Level 5 - Light Pink
    '#F1F8E9', // Level 6 - Light Lime
    '#E0F2F1', // Level 7 - Light Teal
    '#FFF8E1'  // Level 8 - Light Yellow
  ];

  ngOnInit() {
    this.initializeDiagram();
    this.setupResizeObserver();
  }

  ngOnDestroy() {
    if (this.diagram) {
      this.diagram.div = null;
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  private initializeDiagram() {
    const $ = go.GraphObject.make;

    // Create the diagram
    this.diagram = $(go.Diagram, this.diagramDiv.nativeElement, {
      initialAutoScale: go.Diagram.UniformToFill,
      contentAlignment: go.Spot.Center,
      layout: $(go.TreeLayout, {
        angle: 90, // Vertical layout
        layerSpacing: 35,
        nodeSpacing: 10,
        alignment: go.TreeLayout.AlignmentCenterChildren
      }),
      // Interaction settings based on options
      allowMove: !this.options.readonly,
      allowCopy: !this.options.readonly,
      allowDelete: !this.options.readonly,
      allowSelect: true,
      hasHorizontalScrollbar: this.options.enablePanning !== false,
      hasVerticalScrollbar: this.options.enablePanning !== false,
      allowZoom: this.options.enableZooming !== false,
      allowHorizontalScroll: this.options.enablePanning !== false,
      allowVerticalScroll: this.options.enablePanning !== false
    });

    // Define node template with level-based coloring
    this.diagram.nodeTemplate = $(
      go.Node,
      'Auto',
      $(go.Shape, 'RoundedRectangle', 
        { 
          strokeWidth: 2,
          stroke: '#333',
          minSize: new go.Size(120, 40)
        },
        new go.Binding('fill', 'displayLevel', (displayLevel) => {
          if (displayLevel === 0) return '#4A90E2'; // Root node - always blue
          return this.levelColors[(displayLevel - 1) % this.levelColors.length] || '#E3F2FD';
        })
      ),
      $(go.TextBlock, 
        { 
          margin: 12,
          font: 'bold 11px sans-serif',
          maxSize: new go.Size(200, NaN),
          wrap: go.TextBlock.WrapFit,
          textAlign: 'center'
        }, 
        new go.Binding('text', 'name'),
        new go.Binding('stroke', 'displayLevel', (displayLevel) => 
          displayLevel === 0 ? 'white' : '#333'
        )
      )
    );

    // Define link template
    this.diagram.linkTemplate = $(
      go.Link,
      { 
        routing: go.Link.Orthogonal, 
        corner: 8,
        selectable: false
      },
      $(go.Shape, { 
        strokeWidth: 2, 
        stroke: '#666'
      }),
      $(go.Shape, { 
        toArrow: 'Standard', 
        stroke: '#666',
        fill: '#666'
      })
    );

    // Set initial data if provided
    if (this.data && this.data.length > 0) {
      this.updateDiagram(this.data);
    }

    this.isInitialized = true;
    this.diagramReady.emit();
  }

  private setupResizeObserver() {
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        if (this.diagram) {
          this.diagram.requestUpdate();
        }
      });
      this.resizeObserver.observe(this.diagramDiv.nativeElement);
    }
  }

  // Public method to update diagram data
  updateDiagram(data: TreeNodeData[]) {
    if (!this.diagram || !data) return;

    // Assign proper display levels to data for correct coloring
    const dataWithDisplayLevels = this.assignDisplayLevels([...data]);
    
    // Update the diagram model
    this.diagram.model = new go.TreeModel(dataWithDisplayLevels);
    
    // Auto-fit the diagram
    setTimeout(() => {
      if (this.diagram) {
        this.diagram.zoomToFit();
      }
    }, 100);
  }

  // NEW: Assign display levels where root = 0, user levels start from 1
  private assignDisplayLevels(data: TreeNodeData[]): (TreeNodeData & { displayLevel: number })[] {
    const nodeMap = new Map<number, TreeNodeData & { displayLevel: number }>();
    
    // Create a map of all nodes with displayLevel property
    data.forEach(node => nodeMap.set(node.key, { ...node, displayLevel: 0 }));
    
    // Find root node and assign display levels starting from 0
    const root = data.find(node => !node.parent);
    if (root) {
      this.assignDisplayLevelRecursive(root.key, 0, nodeMap);
    }
    
    return Array.from(nodeMap.values());
  }

  // NEW: Recursively assign display levels (0 for root, 1+ for user levels)
  private assignDisplayLevelRecursive(nodeKey: number, displayLevel: number, nodeMap: Map<number, TreeNodeData & { displayLevel: number }>) {
    const node = nodeMap.get(nodeKey);
    if (node) {
      node.displayLevel = displayLevel;
      
      // Find children and assign next display level
      nodeMap.forEach(child => {
        if (child.parent === nodeKey) {
          this.assignDisplayLevelRecursive(child.key, displayLevel + 1, nodeMap);
        }
      });
    }
  }

  // DEPRECATED: Keep old method for backward compatibility but don't use it
  private assignLevels(data: TreeNodeData[]): TreeNodeData[] {
    // This method is now deprecated - use assignDisplayLevels instead
    console.warn('assignLevels is deprecated, use assignDisplayLevels instead');
    return this.assignDisplayLevels(data);
  }

  // Export diagram functionality
  exportDiagram() {
    if (!this.isInitialized || !this.diagram) {
      console.warn('Diagram not ready for export');
      return;
    }

    this.exportRequested.emit();

    const svg = this.diagram.makeSvg({
      scale: 1,
      background: 'white',
      padding: new go.Margin(10)
    });

    if (!svg) {
      console.error('Failed to generate diagram SVG');
      return;
    }

    // Create and trigger download
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    // Create download link
    const link = document.createElement('a');
    link.href = url;
    link.download = `incident-diagram-${Date.now()}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Cleanup
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  // Method to print diagram (for PDF export) - UPDATED
  printDiagram(incident?: string, level?: number) {
    if (!this.isInitialized || !this.diagram) {
      console.warn('Diagram not ready for printing');
      return;
    }

    const svg = this.diagram.makeSvg({
      scale: 1,
      background: 'white',
      padding: new go.Margin(10)
    });

    if (!svg) {
      console.error('Failed to generate diagram SVG');
      return;
    }

    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>HSE Incident Analysis${incident ? ' - ' + incident : ''}</title>
            <style>
              body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
              .header { text-align: center; margin-bottom: 20px; }
              .incident-info { margin-bottom: 20px; }
              .legend { 
                margin: 20px 0; 
                padding: 15px; 
                background: #f5f5f5; 
                border-radius: 5px; 
              }
              .legend-item { 
                display: inline-block; 
                margin: 5px 10px; 
                padding: 5px 10px; 
                border: 1px solid #333; 
                border-radius: 3px; 
                font-size: 12px; 
              }
              img { max-width: 100%; height: auto; }
              @media print {
                body { margin: 0; }
                .header, .incident-info, .legend { page-break-inside: avoid; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>HSE Incident Analysis Report</h1>
            </div>
            ${incident ? `
            <div class="incident-info">
              <p><strong>Incident:</strong> ${incident}</p>
              ${level ? `<p><strong>Analysis Level:</strong> ${level} (Total Levels: ${level + 1})</p>` : ''}
              <p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
            ` : ''}
            <div class="legend">
              <strong>Level Color Legend:</strong><br>
              <span class="legend-item" style="background: #4A90E2; color: white;">Root Node (Incident)</span>
              ${this.generateLegendItems(level || 5)}
            </div>
            <img src="${url}" alt="Cause-Effect Diagram" />
            <div style="margin-top: 20px; font-size: 12px; color: #666;">
              <p><strong>Note:</strong> User-specified level ${level || 5} creates ${(level || 5) + 1} total levels in the diagram (1 root + ${level || 5} analysis levels).</p>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      
      setTimeout(() => {
        printWindow.print();
      }, 500);

      printWindow.onafterprint = () => {
        URL.revokeObjectURL(url);
        printWindow.close();
      };
      
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 30000);
    }
  }

  // UPDATED: Generate legend items for print - now shows correct user levels
  private generateLegendItems(maxUserLevel: number): string {
    let legend = '';
    for (let userLevel = 1; userLevel <= maxUserLevel; userLevel++) {
      const color = this.levelColors[(userLevel - 1) % this.levelColors.length];
      legend += `<span class="legend-item" style="background: ${color};">User Level ${userLevel}</span>`;
    }
    return legend;
  }

  // Utility methods for external control
  zoomToFit() {
    if (this.diagram) {
      this.diagram.zoomToFit();
    }
  }

  resetZoom() {
    if (this.diagram) {
      this.diagram.scale = 1;
      this.diagram.position = new go.Point(0, 0);
    }
  }

  centerDiagram() {
    if (this.diagram) {
      this.diagram.centerRect(this.diagram.documentBounds);
    }
  }
}