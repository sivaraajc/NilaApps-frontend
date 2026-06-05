import { Routes } from '@angular/router';
import { BuilderPageComponent } from './builder/builder-page.component';

export const routes: Routes = [
  { path: '', component: BuilderPageComponent },
  { path: '**', redirectTo: '' },
];
