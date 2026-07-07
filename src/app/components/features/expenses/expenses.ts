import { Component, inject, signal, effect, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe, DecimalPipe } from '@angular/common';
import { VehicleService } from '../../../services/vehicle';
import { ExpenseService } from '../../../services/expense';
import { AnalyticsService } from '../../../services/analytics';

@Component({
  selector: 'app-expenses',
  imports: [ReactiveFormsModule, DatePipe, DecimalPipe],
  templateUrl: './expenses.html',
  styleUrl: './expenses.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpensesComponent {
  private readonly vehicleService = inject(VehicleService);
  private readonly expenseService = inject(ExpenseService);
  private readonly analyticsService = inject(AnalyticsService);
  private readonly fb = inject(FormBuilder);

  protected readonly activeVehicle = this.vehicleService.activeVehicle;

  // Signals
  protected readonly expenses = signal<any[]>([]);
  protected readonly summary = signal<any>({ totalExpense: 0, breakdown: [] });
  protected readonly isAddingExpense = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly isLoading = signal(false);

  private selectedFile: File | null = null;

  // Form definition
  protected readonly expenseForm = this.fb.group({
    date: [new Date().toISOString().substring(0, 10), [Validators.required]],
    category: ['Parking', [Validators.required]],
    amount: ['', [Validators.required, Validators.min(1)]],
    odometer: [''],
    notes: [''],
  });

  constructor() {
    effect(() => {
      const active = this.activeVehicle();
      if (active) {
        this.loadExpenseData(active._id);
      } else {
        this.expenses.set([]);
        this.summary.set({ totalExpense: 0, breakdown: [] });
      }
    });
  }

  private loadExpenseData(vehicleId: string) {
    this.isLoading.set(true);
    this.expenseService.getExpenses(vehicleId).subscribe({
      next: (res) => {
        if (res.success) this.expenses.set(res.data);
      },
    });
    this.expenseService.getExpenseSummary(vehicleId).subscribe({
      next: (res) => {
        if (res.success) this.summary.set(res.data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  protected showAddForm() {
    this.isAddingExpense.set(true);
    this.errorMessage.set(null);
    this.selectedFile = null;
  }

  protected hideAddForm() {
    this.isAddingExpense.set(false);
    this.expenseForm.reset({
      category: 'Parking',
      date: new Date().toISOString().substring(0, 10),
    });
  }

  protected onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
    }
  }

  protected onSubmit() {
    if (this.expenseForm.invalid) {
      this.expenseForm.markAllAsTouched();
      return;
    }

    const active = this.activeVehicle();
    if (!active) return;

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const raw = this.expenseForm.value;
    const formData = new FormData();
    formData.append('vehicleId', active._id);
    formData.append('date', raw.date || '');
    formData.append('category', raw.category || '');
    formData.append('amount', String(raw.amount));
    
    if (raw.odometer) {
      formData.append('odometer', String(raw.odometer));
    }
    formData.append('notes', raw.notes || '');

    if (this.selectedFile) {
      formData.append('receiptPhoto', this.selectedFile);
    }

    this.expenseService.createExpense(formData).subscribe({
      next: (res) => {
        if (res.success) {
          this.hideAddForm();
          this.loadExpenseData(active._id);
        }
        this.isSubmitting.set(false);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.error || 'Failed to record expense log.');
      },
    });
  }

  protected deleteExpense(id: string) {
    if (confirm('Are you sure you want to delete this expense?')) {
      this.expenseService.deleteExpense(id).subscribe({
        next: () => {
          const active = this.activeVehicle();
          if (active) this.loadExpenseData(active._id);
        },
        error: (err) => alert(err.error?.error || 'Failed to delete expense.'),
      });
    }
  }

  protected downloadCSVReport() {
    const active = this.activeVehicle();
    if (!active) return;

    this.analyticsService.downloadReport(active._id, 'expenses').subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${active.name.replace(/\s+/g, '_')}_expense_report.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
    });
  }

  protected getReceiptUrl(path: string): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `http://localhost:3000/uploads/${path}`;
  }
}
