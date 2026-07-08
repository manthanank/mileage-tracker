import { Injectable, inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter, map, mergeMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class SeoService {
  private readonly titleService = inject(Title);
  private readonly metaService = inject(Meta);
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);

  init() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => this.activatedRoute),
      map(route => {
        while (route.firstChild) route = route.firstChild;
        return route;
      }),
      filter(route => route.outlet === 'primary'),
      mergeMap(route => route.data)
    ).subscribe(data => {
      const title = data['title'] ? `${data['title']} | DrivePulse` : 'DrivePulse | Smart AI Vehicle Tracker';
      const description = data['description'] || 'DrivePulse is a premium vehicle mileage tracker, trip telemetry logger, expense monitor, and maintenance forecaster powered by Google Gemini AI.';
      
      this.titleService.setTitle(title);
      this.updateMetaTags(description, title);
    });
  }

  private updateMetaTags(description: string, title: string) {
    // Basic Meta Tags
    this.metaService.updateTag({ name: 'description', content: description });
    this.metaService.updateTag({ name: 'robots', content: 'index, follow' });
    this.metaService.updateTag({ name: 'author', content: 'DrivePulse Team' });
    this.metaService.updateTag({ name: 'keywords', content: 'mileage tracker, vehicle tracking, trip telemetry, fuel logs, vehicle expenses, maintenance scheduler, Google Gemini AI, car diagnostic tools' });

    // Open Graph / Facebook
    this.metaService.updateTag({ property: 'og:title', content: title });
    this.metaService.updateTag({ property: 'og:description', content: description });
    this.metaService.updateTag({ property: 'og:type', content: 'website' });
    this.metaService.updateTag({ property: 'og:url', content: typeof window !== 'undefined' ? window.location.href : 'https://mileage-tracker-application.vercel.app' });
    this.metaService.updateTag({ property: 'og:image', content: 'https://mileage-tracker-application.vercel.app/og-image.png' });

    // Twitter
    this.metaService.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.metaService.updateTag({ name: 'twitter:title', content: title });
    this.metaService.updateTag({ name: 'twitter:description', content: description });
    this.metaService.updateTag({ name: 'twitter:image', content: 'https://mileage-tracker-application.vercel.app/og-image.png' });
  }
}
