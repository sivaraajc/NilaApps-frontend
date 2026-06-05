import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BuilderPageComponent } from './builder-page.component';
import { BuilderStateService } from './builder-state.service';

describe('BuilderPageComponent', () => {
  let fixture: ComponentFixture<BuilderPageComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BuilderPageComponent],
      providers: [BuilderStateService, provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function flushInitialRequests(pathNodes: unknown[] = []): void {
    httpMock.expectOne('/api/components').flush({ items: [], totalCount: 0 });
    httpMock.expectOne('/api/learning-paths/lp-sat-adaptive-001').flush({
      id: 'lp-sat-adaptive-001',
      name: 'Test',
      status: 'draft',
      nodes: pathNodes,
      edges: [],
    });
  }

  it('should create', () => {
    fixture = TestBed.createComponent(BuilderPageComponent);
    fixture.detectChanges();
    flushInitialRequests();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should load path nodes from API', () => {
    fixture = TestBed.createComponent(BuilderPageComponent);
    fixture.detectChanges();
    flushInitialRequests([
      {
        id: 'node-start',
        componentId: 'system-start',
        type: 'start',
        label: 'Start',
        position: { x: 100, y: 100 },
      },
    ]);
    expect(fixture.componentInstance.state.nodes().length).toBe(10);
    expect(fixture.componentInstance.state.nodes().some((n) => n.type === 'start')).toBeTrue();
    expect(fixture.componentInstance.state.nodes().some((n) => n.type === 'end')).toBeTrue();
    expect(
      fixture.componentInstance.state.nodes().some((n) => n.config?.isGroup),
    ).toBeTrue();
  });
});
