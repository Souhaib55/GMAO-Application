import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-stock',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1>Stock / Achat</h1>
          <p>Gestion du stock et des achats</p>
        </div>
        <button class="btn btn-primary">
          Nouvel Article
        </button>
      </div>

      <div class="card">
        <div class="card-body">
          <div class="empty-state">
            <p>Module en cours de développement</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-container {
      max-width: 1400px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 2rem;

      h1 {
        font-size: 1.875rem;
        margin-bottom: 0.5rem;
      }

      p {
        margin: 0;
        color: var(--gray-600);
      }
    }

    .empty-state {
      padding: 3rem;
      text-align: center;
      color: var(--gray-500);
    }

    @media (max-width: 768px) {
      .page-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
      }
    }
  `]
})
export class StockComponent {}
