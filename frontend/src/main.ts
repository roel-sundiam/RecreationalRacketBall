import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { environment } from './environments/environment';

if (environment.production) {
  const noop = () => {};
  console.log = noop;
  console.warn = noop;
  console.debug = noop;
  console.info = noop;
}

// Clear any invalid localStorage data immediately
try {
  const userString = localStorage.getItem('user');
  if (userString === 'undefined' || userString === 'null' || userString === null) {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  }
} catch (error) {
  localStorage.clear();
}

bootstrapApplication(App, appConfig)
  .then(() => {
  })
  .catch((err) => {
    console.error('🚀 main.ts: Bootstrap error:', err);
  });
