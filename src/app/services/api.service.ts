import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AvailableContentResponse,
  LearningPath,
} from '../models/learning-path.models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly base = '/api';

  constructor(private readonly http: HttpClient) {}

  getComponents(): Observable<AvailableContentResponse> {
    return this.http.get<AvailableContentResponse>(`${this.base}/components`);
  }

  saveLearningPath(path: LearningPath): Observable<LearningPath> {
    return this.http.post<LearningPath>(`${this.base}/learning-paths`, path);
  }

  getLearningPath(id: string): Observable<LearningPath> {
    return this.http.get<LearningPath>(`${this.base}/learning-paths/${id}`);
  }
}
