import { Component, signal, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SeoService } from './services/seo';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private readonly seoService = inject(SeoService);
  protected readonly title = signal('mileage-tracker');

  ngOnInit() {
    this.seoService.init();
  }
}
