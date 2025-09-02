import { Component, Input, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';

export type FieldType = 'text' | 'email' | 'password' | 'number' | 'textarea' | 'select';

@Component({
  selector: 'app-form-field',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FormFieldComponent),
      multi: true
    }
  ],
  templateUrl: './form-field.component.html',
  styleUrls: ['./form-field.component.css']
})
export class FormFieldComponent implements ControlValueAccessor {
  @Input() type: FieldType = 'text';
  @Input() label = '';
  @Input() placeholder = '';
  @Input() helpText = '';
  @Input() errorMessage = '';
  @Input() required = false;
  @Input() disabled = false;
  @Input() hasError = false;
  @Input() hasCustomError = false;
  
  // Number input specific
  @Input() min?: number;
  @Input() max?: number;
  @Input() step?: number;
  
  // Textarea specific
  @Input() rows = 3;
  
  // Select specific
  @Input() options: { value: any; label: string }[] = [];
  
  // Generated ID for accessibility
  id = `form-field-${Math.random().toString(36).substr(2, 9)}`;
  
  value: any = '';
  
  // ControlValueAccessor implementation
  private onChange = (value: any) => {};
  private onTouched = () => {};

  writeValue(value: any): void {
    this.value = value || '';
  }

  registerOnChange(fn: (value: any) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onInput(event: Event): void {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    let value: string | number = target.value;
    
    // Handle number inputs
    if (this.type === 'number' && value !== '') {
      value = Number(value);
    }
    
    this.value = value;
    this.onChange(value);
  }

  onBlur(): void {
    this.onTouched();
  }

  onFocus(): void {
    // Can be used for additional focus handling
  }
}