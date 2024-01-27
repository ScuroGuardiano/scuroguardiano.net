import { provideHttpClient, withFetch } from '@angular/common/http';
import { ApplicationConfig, isDevMode } from '@angular/core';
import { provideClientHydration } from '@angular/platform-browser';
import { provideFileRouter } from '@analogjs/router';
import { TranslocoHttpLoader } from './transloco-loader';
import { provideTransloco } from '@ngneat/transloco';
import { provideTranslocoLocale } from '@ngneat/transloco-locale';

export const appConfig: ApplicationConfig = {
  providers: [
    provideFileRouter(),
    provideHttpClient(withFetch()),
    provideClientHydration(),
    provideHttpClient(),
    provideTransloco({
      config: {
        availableLangs: ['pl', 'en'],
        fallbackLang: 'en',
        defaultLang: 'pl',
        // Remove this option if your application doesn't support changing language in runtime.
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
      },
      loader: TranslocoHttpLoader
    }),
    provideTranslocoLocale({
      langToLocaleMapping: {
        en: 'en-US',
        pl: 'pl-PL'
      }
    })
  ],
};
