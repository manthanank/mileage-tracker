import { Component, inject, signal, effect, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { VehicleService } from '../../../services/vehicle';
import { DocumentService } from '../../../services/document';

@Component({
  selector: 'app-garage',
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './garage.html',
  styleUrl: './garage.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GarageComponent {
  private readonly vehicleService = inject(VehicleService);
  private readonly documentService = inject(DocumentService);
  private readonly fb = inject(FormBuilder);

  protected readonly activeVehicle = this.vehicleService.activeVehicle;

  // Signals
  protected readonly documents = signal<any[]>([]);
  protected readonly isAddingDoc = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly isLoading = signal(false);

  private selectedFile: File | null = null;

  // Form definition
  protected readonly docForm = this.fb.group({
    name: ['', [Validators.required]],
    type: ['RC', [Validators.required]],
    documentNumber: [''],
    expiryDate: [''],
    cost: ['0'], // Auto sync expense
    remindBeforeDays: [15, [Validators.required, Validators.min(1)]],
    notes: [''],
  });

  constructor() {
    effect(() => {
      const active = this.activeVehicle();
      if (active) {
        this.loadDocuments(active._id);
      } else {
        this.documents.set([]);
      }
    });
  }

  private loadDocuments(vehicleId: string) {
    this.isLoading.set(true);
    this.documentService.getDocuments(vehicleId).subscribe({
      next: (res) => {
        if (res.success) {
          this.documents.set(res.data);
        }
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  protected showAddForm() {
    this.isAddingDoc.set(true);
    this.errorMessage.set(null);
    this.selectedFile = null;
  }

  protected hideAddForm() {
    this.isAddingDoc.set(false);
    this.docForm.reset({
      type: 'RC',
      cost: '0',
      remindBeforeDays: 15,
    });
  }

  protected onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
    }
  }

  protected onSubmit() {
    if (this.docForm.invalid) {
      this.docForm.markAllAsTouched();
      return;
    }

    if (!this.selectedFile) {
      this.errorMessage.set('Please select a document file to upload (Image or PDF).');
      return;
    }

    const active = this.activeVehicle();
    if (!active) return;

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const raw = this.docForm.value;
    const formData = new FormData();
    formData.append('vehicleId', active._id);
    formData.append('name', raw.name || '');
    formData.append('type', raw.type || '');
    formData.append('documentNumber', raw.documentNumber || '');
    formData.append('remindBeforeDays', String(raw.remindBeforeDays));
    formData.append('notes', raw.notes || '');
    
    if (raw.expiryDate) {
      formData.append('expiryDate', raw.expiryDate);
    }
    if (raw.cost && Number(raw.cost) > 0) {
      formData.append('cost', String(raw.cost));
    }
    formData.append('document', this.selectedFile);

    this.documentService.createDocument(formData).subscribe({
      next: (res) => {
        if (res.success) {
          this.hideAddForm();
          this.loadDocuments(active._id);
        }
        this.isSubmitting.set(false);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.error || 'Failed to upload document.');
      },
    });
  }

  protected deleteDoc(id: string) {
    if (confirm('Are you sure you want to delete this document? Any associated expense will be deleted too.')) {
      this.documentService.deleteDocument(id).subscribe({
        next: () => {
          const active = this.activeVehicle();
          if (active) this.loadDocuments(active._id);
        },
      });
    }
  }

  protected getValidityDays(expiryDateStr: string): number | null {
    if (!expiryDateStr) return null;
    const expiry = new Date(expiryDateStr).getTime();
    const today = new Date().setHours(0, 0, 0, 0);
    const diff = expiry - today;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  protected getValidityStatus(expiryDateStr: string, remindBeforeDays: number): { text: string; colorClass: string } {
    const days = this.getValidityDays(expiryDateStr);
    if (days === null) return { text: 'No Expiry', colorClass: 'text-slate-400 bg-slate-800/40 border-slate-700/50' };
    if (days <= 0) return { text: 'Expired', colorClass: 'text-rose-400 bg-rose-500/10 border-rose-500/20' };
    if (days <= remindBeforeDays) return { text: 'Expiring Soon', colorClass: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' };
    return { text: `${days} Days Valid`, colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
  }

  protected getDocumentUrl(path: string): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `http://localhost:3000/uploads/${path}`;
  }
}
