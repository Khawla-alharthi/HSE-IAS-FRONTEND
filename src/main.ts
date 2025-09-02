import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { App } from './app/app';
import { routes } from './app/app.routes';

bootstrapApplication(App, {
  providers: [
    // Router configuration
    provideRouter(routes),
    
    // HTTP client for API calls
    provideHttpClient(),
    
    // Animations support
    importProvidersFrom(BrowserAnimationsModule),
    
    // Add other global providers here as needed
    // provideStore(), // if using NgRx
    // provideEffects(), // if using NgRx Effects
  ]
}).catch(err => console.error(err));