import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { InterventionService } from '../services/intervention.service';
import { ReferenceDataService, TypeIntervention, Urgence, ChaineProduction, Panne } from '../../../core/services/reference-data.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/services/auth.service';
import { EquipmentService } from '../../equipment/services/equipment.service';
import { DemandeIntervention, EquipementSummary, InterventionDto } from '../../../core/models';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { InterventionSuiviComponent } from '../intervention-suivi/intervention-suivi.component';
import { InterventionActionsComponent } from '../intervention-actions/intervention-actions.component';
import { AppIconComponent } from '../../../shared/components/app-icon/app-icon.component';

/** Statuses of the maintenance workflow (server-side ids). */
const STATUS = { A_TRAITER: 1, EN_COURS: 2, REALISEE: 3, CLOTUREE: 4, ANNULEE: 5 };

import { InterventionPhotosComponent } from '../intervention-photos/intervention-photos.component';
@Component({
  selector: 'app-intervention-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, PageHeaderComponent, InterventionSuiviComponent, InterventionActionsComponent, AppIconComponent, InterventionPhotosComponent],
  template: `
    <!-- Create / edit: side panel over the list, like every other form of the app -->
    <ng-container *ngIf="drawer">
      <div class="gm-backdrop" (click)="cancel()"></div>
      <aside class="gm-drawer" role="dialog" [attr.aria-label]="formTitle">
        <div class="gm-drawer-head">
          <div>
            <h2>{{ formTitle }}<span class="gm-code" *ngIf="intervention"> · {{ reference }}</span></h2>
            <div class="sub">{{ formSubtitle }}</div>
          </div>
          <button type="button" class="gm-icon-btn" (click)="cancel()" aria-label="Fermer"><app-icon name="close"></app-icon></button>
        </div>

        <form class="gm-drawer-body" [formGroup]="interventionForm" (ngSubmit)="onSubmit()" id="interventionForm">
          <div class="gm-note" *ngIf="lockReason"><app-icon name="info"></app-icon>{{ lockReason }}</div>
          <div class="gm-loading" *ngIf="loading"><span class="spinner"></span> Chargement…</div>

          <div class="gm-note ok" *ngIf="machineFromLink"><app-icon name="qr"></app-icon><span>Machine reconnue par son étiquette : <b>{{ machineFromLink }}</b>. Il reste à dire ce qui ne va pas.</span></div>
          <div class="gm-section-title">1 · Où se trouve le problème ?</div>
          <div class="gm-form">
            <div class="gm-field">
              <label for="idChaineProduction">Chaîne de production<span class="req" *ngIf="!isViewMode">*</span></label>
              <select id="idChaineProduction" formControlName="idChaineProduction">
                <option [ngValue]="null">Choisir la chaîne</option>
                <option *ngFor="let chaine of chainesProduction" [ngValue]="chaine.idChaineProduction">{{ chaine.libelle }}</option>
              </select>
              <span class="err" *ngIf="invalid('idChaineProduction')">Indiquez la chaîne concernée.</span>
            </div>
            <div class="gm-field">
              <label for="idEquipement">Machine concernée</label>
              <select id="idEquipement" formControlName="idEquipement">
                <option [ngValue]="null">{{ availableMachines.length ? 'Toute la chaîne / machine non identifiée' : 'Aucune machine enregistrée pour cette chaîne' }}</option>
                <option *ngFor="let m of availableMachines" [ngValue]="m.idEquipement">{{ m.codeEquipement }} — {{ m.designation }}</option>
              </select>
              <span class="hint">Si vous choisissez la machine, sa chaîne est remplie toute seule.</span>
            </div>
          </div>

          <div class="gm-section-title">2 · De quoi s'agit-il ?</div>
          <div class="gm-form">
            <div class="gm-field">
              <label for="idTypeIntervention">Type d'intervention<span class="req" *ngIf="!isViewMode">*</span></label>
              <select id="idTypeIntervention" formControlName="idTypeIntervention">
                <option [ngValue]="null">Choisir le type</option>
                <option *ngFor="let type of typesIntervention" [ngValue]="type.idTypeIntervention">{{ type.libelle }}</option>
              </select>
              <span class="hint" *ngIf="selectedType">{{ isPreventive ? "Entretien planifié : la production n'est pas arrêtée." : "Panne : la machine est comptée à l'arrêt jusqu'à la réparation." }}</span>
              <span class="err" *ngIf="invalid('idTypeIntervention')">Choisissez le type d'intervention.</span>
            </div>
            <div class="gm-field" *ngIf="!isPreventive">
              <label for="idPanne">Type de panne<span class="req" *ngIf="!isViewMode">*</span></label>
              <select id="idPanne" formControlName="idPanne">
                <option [ngValue]="null">Choisir le type de panne</option>
                <option *ngFor="let panne of pannes" [ngValue]="panne.idPanne">{{ panne.libelle }}</option>
              </select>
              <span class="err" *ngIf="invalid('idPanne')">Le type de panne est obligatoire pour une panne.</span>
            </div>
            <div class="gm-field full">
              <label>Urgence<span class="req" *ngIf="!isViewMode">*</span></label>
              <div class="chip-group" role="radiogroup">
                <label class="chip" *ngFor="let urgence of urgences" [attr.data-level]="urgenceLevel(urgence.libelle)"
                       [class.selected]="interventionForm.get('idUrgence')?.value === urgence.idUrgence">
                  <input type="radio" formControlName="idUrgence" [value]="urgence.idUrgence" />
                  {{ urgence.libelle }}
                </label>
              </div>
              <span class="hint">Haute : la production est bloquée. Normale : à traiter dans la journée. Basse : peut attendre.</span>
              <span class="err" *ngIf="invalid('idUrgence')">Indiquez le niveau d'urgence.</span>
            </div>
            <div class="gm-field full">
              <label for="titre">Titre<span class="req" *ngIf="!isViewMode">*</span></label>
              <input id="titre" type="text" formControlName="titre" maxlength="100" placeholder="Ex. : Fuite d'huile sous le carter de la presse P-12">
              <span class="hint" *ngIf="!isViewMode && !isEditMode && titreSuggere">Proposé à partir du type de panne et de la machine : vous pouvez le modifier.</span>
              <span class="err" *ngIf="invalid('titre')">Un titre de 3 caractères minimum est requis.</span>
            </div>
            <div class="gm-field full">
              <label for="description">Description du problème</label>
              <textarea id="description" formControlName="description" rows="4" maxlength="2000"
                        placeholder="Ce que vous avez constaté, depuis quand, dans quelles conditions…"></textarea>
              <span class="hint" *ngIf="!isViewMode">{{ (interventionForm.value.description || '').length }} / 2000 caractères</span>
            </div>
          </div>

          <div class="gm-section-title">3 · Pièce jointe (facultatif)</div>
          <div class="gm-field" *ngIf="!isViewMode">
            <input id="file" class="sr-label" type="file" (change)="onFileSelected($event)" [accept]="allowedExtensions.join(',')">
            <label for="file" class="btn btn-secondary file-btn"><app-icon name="upload"></app-icon> Ajouter une photo ou un document</label>
            <span class="file-none" *ngIf="!selectedFile">Aucun fichier choisi</span>
            <span class="hint">Une photo de la panne aide le technicien. PDF, Office, images ou archives, 10 Mo maximum.</span>
          </div>
          <div class="file-preview existing-file" *ngIf="existingFileName && !selectedFile">
            <div class="file-info"><app-icon name="file"></app-icon><span>{{ existingFileName }}</span></div>
            <button type="button" class="btn-remove" (click)="removeExistingFile()" title="Retirer la pièce jointe" *ngIf="!isViewMode"><app-icon name="close"></app-icon></button>
          </div>
          <div class="file-preview" *ngIf="selectedFile">
            <div class="file-info"><app-icon name="file"></app-icon><span>{{ selectedFile.name }}</span></div>
            <button type="button" class="btn-remove" (click)="removeFile()" title="Retirer"><app-icon name="close"></app-icon></button>
          </div>
        </form>

        <div class="gm-drawer-foot">
          <button type="button" class="btn btn-secondary" (click)="cancel()" [disabled]="saving">{{ isViewMode ? 'Fermer' : 'Annuler' }}</button>
          <button type="submit" form="interventionForm" class="btn btn-primary" *ngIf="!isViewMode" [disabled]="saving || loading">
            <span class="spinner spinner-sm" *ngIf="saving"></span>
            {{ isEditMode ? 'Enregistrer les modifications' : "Déclarer l'intervention" }}
          </button>
        </div>
      </aside>
    </ng-container>

    <div class="form-container" [class.view-mode]="isViewMode" *ngIf="!drawer">
      <app-page-header icon="interventions" [title]="formTitle" [subtitle]="formSubtitle">
        <div class="header-actions">
          <a class="btn btn-secondary" *ngIf="isViewMode && peutModifier" [routerLink]="['/interventions/edit', intervention!.idDemandeIntervention]"><app-icon name="edit"></app-icon> Modifier</a>
          <button class="btn btn-secondary" type="button" (click)="printForm()" *ngIf="isViewMode"><app-icon name="print"></app-icon> Imprimer</button>
          <button class="btn btn-secondary" type="button" (click)="cancel()"><app-icon name="chevron-left"></app-icon> {{ isViewMode ? 'Retour' : 'Annuler' }}</button>
        </div>
      </app-page-header>

      <!-- Read-only facts about an existing request -->
      <section class="facts-card" *ngIf="intervention">
        <div class="fact">
          <span class="fact-label">Référence</span>
          <span class="fact-value mono">{{ reference }}</span>
        </div>
        <div class="fact">
          <span class="fact-label">Déclarée le</span>
          <span class="fact-value">{{ intervention.dateCreation | date:'dd/MM/yyyy à HH:mm' }}</span>
        </div>
        <div class="fact">
          <span class="fact-label">Demandeur</span>
          <span class="fact-value">{{ intervention.demandeur?.prenom }} {{ intervention.demandeur?.nom }}</span>
        </div>
        <div class="fact">
          <span class="fact-label">Statut</span>
          <span class="status-tag" [attr.data-status]="intervention.statusId">{{ intervention.status?.statut }}</span>
        </div>
        <div class="fact">
          <span class="fact-label">Technicien</span>
          <span class="fact-value">{{ intervention.destinataire ? intervention.destinataire.prenom + ' ' + intervention.destinataire.nom : 'Non affecté' }}</span>
        </div>
        <div class="fact" *ngIf="$any(intervention).datePlanifiee">
          <span class="fact-label">Planifiée le</span>
          <span class="fact-value">{{ $any(intervention).datePlanifiee | date:'dd/MM/yyyy' }}<ng-container *ngIf="$any(intervention).planPreventif"> · {{ $any(intervention).planPreventif.code }}</ng-container></span>
        </div>
        <div class="fact">
          <span class="fact-label">Arrêt machine</span>
          <span class="fact-value" [class.stop]="intervention.machineArretee">{{ intervention.machineArretee ? 'Oui' : 'Non' }}</span>
        </div>
      </section>

      <!-- Next workflow step for the current user (assign, accept, complete, validate, cancel) -->
      <app-intervention-actions class="actions-block" *ngIf="intervention && isViewMode"
                                [intervention]="intervention"
                                (updated)="loadIntervention(intervention!.idDemandeIntervention)"
                                (released)="cancel()"></app-intervention-actions>

      <div class="lock-banner" *ngIf="lockReason && !isViewModeFromRoute">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
        {{ lockReason }}
      </div>

      <!-- Consultation: the request in a few lines (label and value), not a greyed-out form -->
      <section class="gm-card demande" *ngIf="isViewMode && intervention as i" aria-labelledby="demande-titre">
        <h2 id="demande-titre" class="demande-eyebrow">La demande</h2>
        <h3 class="demande-titre">{{ i.titre }}</h3>
        <p class="demande-desc" *ngIf="i.description">{{ i.description }}</p>
        <dl class="demande-grid">
          <div><dt>Machine</dt><dd>{{ i.equipement ? i.equipement.codeEquipement + ' — ' + i.equipement.designation : 'Toute la chaîne' }}</dd></div>
          <div><dt>Chaîne</dt><dd>{{ i.chaineProduction?.libelle || 'Non renseignée' }}</dd></div>
          <div><dt>Type</dt><dd>{{ i.typeIntervention?.libelle || 'Non renseigné' }}</dd></div>
          <div *ngIf="i.panne"><dt>Panne</dt><dd>{{ i.panne.libelle }}</dd></div>
          <div><dt>Urgence</dt><dd><span class="gm-tag" [ngClass]="urgenceTag(i.urgence?.libelle)">{{ i.urgence?.libelle || 'Normale' }}</span></dd></div>
          <div><dt>Pièce jointe</dt><dd>
            <button type="button" class="link-btn" *ngIf="existingFileName; else sansFichier" (click)="downloadExistingFile()"><app-icon name="download"></app-icon> {{ existingFileName }}</button>
            <ng-template #sansFichier>Aucune</ng-template>
          </dd></div>
        </dl>
        <div class="demande-report" *ngIf="i.compteRendu">
          <h3>Compte rendu du technicien</h3>
          <p>{{ i.compteRendu }}</p>
          <app-intervention-photos [interventionId]="i.idDemandeIntervention" [refresh]="i.statusId"></app-intervention-photos>
        </div>
      </section>

      <form [formGroup]="interventionForm" (ngSubmit)="onSubmit()" class="card" id="intervention-form-print" *ngIf="!isViewMode">
        <div class="card-body">

          <!-- 1. Where -->
          <div class="form-section">
            <h3 class="section-title"><span class="step">1</span> Localisation</h3>
            <div class="form-grid">
              <div class="form-group">
                <label for="idChaineProduction">Chaîne de production <span class="required" *ngIf="!isViewMode">*</span></label>
                <select id="idChaineProduction" formControlName="idChaineProduction" [class.error]="invalid('idChaineProduction')">
                  <option [ngValue]="null">Sélectionner une chaîne</option>
                  <option *ngFor="let chaine of chainesProduction" [ngValue]="chaine.idChaineProduction">{{ chaine.libelle }}</option>
                </select>
                <span class="error-message" *ngIf="invalid('idChaineProduction')">Indiquez la chaîne concernée.</span>
              </div>

              <div class="form-group">
                <label for="idEquipement">Machine concernée</label>
                <select id="idEquipement" formControlName="idEquipement">
                  <option [ngValue]="null">{{ availableMachines.length ? 'Toute la chaîne / machine non identifiée' : 'Aucune machine enregistrée pour cette chaîne' }}</option>
                  <option *ngFor="let m of availableMachines" [ngValue]="m.idEquipement">{{ m.codeEquipement }} — {{ m.designation }}</option>
                </select>
                <small class="form-text">Choisir la machine renseigne automatiquement sa chaîne.</small>
              </div>
            </div>
          </div>

          <!-- 2. What -->
          <div class="form-section">
            <h3 class="section-title"><span class="step">2</span> Nature de l'intervention</h3>
            <div class="form-grid">
              <div class="form-group">
                <label for="idTypeIntervention">Type d'intervention <span class="required" *ngIf="!isViewMode">*</span></label>
                <select id="idTypeIntervention" formControlName="idTypeIntervention" [class.error]="invalid('idTypeIntervention')">
                  <option [ngValue]="null">Sélectionner un type</option>
                  <option *ngFor="let type of typesIntervention" [ngValue]="type.idTypeIntervention">{{ type.libelle }}</option>
                </select>
                <small class="form-text impact" *ngIf="selectedType">
                  <span class="impact-dot" [class.stop]="!isPreventive"></span>
                  {{ isPreventive ? 'Maintenance planifiée : pas d\\'arrêt de production.' : 'Panne : la machine est considérée à l\\'arrêt jusqu\\'à la réparation.' }}
                </small>
              </div>

              <div class="form-group" *ngIf="!isPreventive">
                <label for="idPanne">Type de panne <span class="required" *ngIf="!isViewMode">*</span></label>
                <select id="idPanne" formControlName="idPanne" [class.error]="invalid('idPanne')">
                  <option [ngValue]="null">Sélectionner un type de panne</option>
                  <option *ngFor="let panne of pannes" [ngValue]="panne.idPanne">{{ panne.libelle }}</option>
                </select>
                <span class="error-message" *ngIf="invalid('idPanne')">Le type de panne est obligatoire pour une panne.</span>
              </div>
            </div>

            <div class="form-group">
              <label>Urgence <span class="required" *ngIf="!isViewMode">*</span></label>
              <div class="chip-group" role="radiogroup">
                <label class="chip" *ngFor="let urgence of urgences" [attr.data-level]="urgenceLevel(urgence.libelle)"
                       [class.selected]="interventionForm.get('idUrgence')?.value === urgence.idUrgence">
                  <input type="radio" formControlName="idUrgence" [value]="urgence.idUrgence" />
                  {{ urgence.libelle }}
                </label>
              </div>
              <span class="error-message" *ngIf="invalid('idUrgence')">Indiquez le niveau d'urgence.</span>
            </div>

            <div class="form-group">
              <label for="titre">Titre <span class="required" *ngIf="!isViewMode">*</span></label>
              <input id="titre" type="text" formControlName="titre" maxlength="100"
                     placeholder="Ex. : Fuite d'huile sous le carter de la presse P-12"
                     [class.error]="invalid('titre')" />
              <span class="error-message" *ngIf="invalid('titre')">Un titre de 3 caractères minimum est requis.</span>
            </div>

            <div class="form-group">
              <label for="description">Description du problème</label>
              <textarea id="description" formControlName="description" rows="4" maxlength="2000"
                        placeholder="Symptômes observés, depuis quand, conditions d'apparition…"></textarea>
              <small class="form-text counter" *ngIf="!isViewMode">{{ (interventionForm.value.description || '').length }} / 2000</small>
            </div>
          </div>

          <!-- Technician's report, once the job is done -->
          <div class="form-section" *ngIf="intervention?.compteRendu">
            <h3 class="section-title"><span class="step">✓</span> Compte rendu du technicien</h3>
            <p class="report">{{ intervention?.compteRendu }}</p>
            <app-intervention-photos [interventionId]="intervention!.idDemandeIntervention" [refresh]="intervention?.statusId"></app-intervention-photos>
          </div>

          <!-- 3. Attachment -->
          <div class="form-section">
            <h3 class="section-title"><span class="step">3</span> Pièce jointe de la demande</h3>
            <div class="form-group" *ngIf="!isViewMode">
              <input id="file" class="sr-label" type="file" (change)="onFileSelected($event)" [accept]="allowedExtensions.join(',')" />
              <label for="file" class="btn btn-secondary file-btn"><app-icon name="upload"></app-icon> Ajouter une photo ou un document</label>
              <span class="file-none" *ngIf="!selectedFile">Aucun fichier choisi</span>
              <small class="form-text">Photo de la panne, document… PDF, Office, images ou archives, 10 Mo maximum.</small>
            </div>

            <div *ngIf="existingFileName && !selectedFile" class="file-preview existing-file" [class.clickable]="isViewMode" (click)="isViewMode && downloadExistingFile()">
              <div class="file-info">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                </svg>
                <span>{{ existingFileName }}</span>
              </div>
              <button type="button" class="btn-download" (click)="downloadExistingFile(); $event.stopPropagation()" *ngIf="isViewMode">Télécharger</button>
              <button type="button" class="btn-remove" (click)="removeExistingFile()" title="Retirer la pièce jointe" *ngIf="!isViewMode">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <p class="empty-note" *ngIf="isViewMode && !existingFileName">Aucune pièce jointe.</p>

            <div *ngIf="selectedFile" class="file-preview">
              <div class="file-info">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                </svg>
                <span>{{ selectedFile.name }}</span>
              </div>
              <button type="button" class="btn-remove" (click)="removeFile()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
          </div>

          <div *ngIf="loading" class="loading-overlay">
            <span class="spinner"></span>
          </div>
        </div>

        <div class="card-footer" *ngIf="!isViewMode">
          <button type="button" class="btn btn-secondary" (click)="cancel()" [disabled]="saving">Annuler</button>
          <button type="submit" class="btn btn-primary" [disabled]="saving">
            {{ saving ? 'Enregistrement…' : (isEditMode ? 'Enregistrer les modifications' : 'Déclarer l\\'intervention') }}
          </button>
        </div>
      </form>

      <!-- Execution record: time, parts, checklist, analysis, cost, documents -->
      <app-intervention-suivi class="suivi-block" *ngIf="intervention?.idDemandeIntervention"
                              [interventionId]="intervention!.idDemandeIntervention" [version]="intervention?.statusId"
                              (changed)="loadIntervention(intervention!.idDemandeIntervention)"></app-intervention-suivi>
    </div>
  `,
  styles: [`
    .header-actions { display: flex; gap: 12px; align-items: center; }

    .suivi-block { display: block; margin-top: 16px; }
    .actions-block { margin-bottom: 16px; }
    @media print { .actions-block { display: none; } }
    @media print { .suivi-block { break-before: page; } }

    .demande { padding: 18px 20px; margin-bottom: 16px; }
    .demande-eyebrow { margin: 0; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); }
    .demande-titre { margin: 4px 0 0; font-size: 1.125rem; font-weight: 600; color: var(--text); }
    .demande-desc { margin: 6px 0 0; font-size: 0.9375rem; line-height: 1.55; color: var(--text); white-space: pre-line; }
    .demande-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px 24px; margin: 14px 0 0; padding-top: 12px; border-top: 1px solid var(--gray-100); }
    .demande-grid dt { font-size: 0.8125rem; color: var(--text-secondary); }
    .demande-grid dd { margin: 2px 0 0; font-size: 0.9rem; font-weight: 500; color: var(--text); overflow-wrap: anywhere; }
    .demande-report { margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--gray-100); }
    .demande-report h3 { margin: 0 0 4px; font-size: 0.875rem; font-weight: 600; }
    .demande-report p { margin: 0 0 8px; font-size: 0.9375rem; line-height: 1.55; white-space: pre-line; }
    .link-btn { display: inline-flex; align-items: center; gap: 6px; border: 0; background: none; padding: 0; min-height: 32px; font: inherit; font-weight: 500; color: var(--primary-700); cursor: pointer; text-align: left; }
    .link-btn:hover { text-decoration: underline; }
    @media (max-width: 900px) { .demande-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    @media (pointer: coarse) { .link-btn { min-height: 44px; } }
    .facts-card {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 0;
      margin-bottom: 16px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      box-shadow: var(--card-shadow);
    }

    .fact {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 14px 18px;
      border-left: 1px solid var(--border);
      min-width: 0;
    }

    .fact:first-child { border-left: 0; }

    .fact-label {
      font-size: 12px;
      font-weight: 500;
      color: var(--text-muted);
    }

    .fact-value {
      font-size: 14px;
      font-weight: 600;
      color: var(--text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .fact-value.mono { font-variant-numeric: tabular-nums; }
    .fact-value.stop { color: var(--error); }

    .status-tag {
      align-self: flex-start;
      padding: 2px 10px;
      border-radius: 999px;
      font-size: 12.5px;
      font-weight: 600;
      background: var(--gray-100);
      color: var(--gray-700);
    }

    .status-tag[data-status="1"] { background: var(--primary-50); color: var(--primary-700); }
    .status-tag[data-status="2"] { background: var(--warning-light); color: var(--warning-text); }
    .status-tag[data-status="3"] { background: var(--accent-50); color: var(--accent-700); }
    .status-tag[data-status="4"] { background: var(--success-light); color: var(--success-text); }
    .status-tag[data-status="5"] { background: var(--gray-100); color: var(--gray-600); }

    .lock-banner {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 16px;
      padding: 12px 16px;
      border-radius: 10px;
      background: var(--warning-light);
      border: 1px solid rgba(184, 110, 0, 0.25);
      color: var(--warning-text);
      font-size: 14px;
    }

    .form-section + .form-section {
      margin-top: 8px;
      padding-top: 20px;
      border-top: 1px solid var(--border);
    }

    .section-title {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 0 0 16px;
      font-size: 15px;
      font-weight: 600;
      color: var(--text);
    }

    .step {
      width: 24px;
      height: 24px;
      display: grid;
      place-items: center;
      border-radius: 50%;
      background: var(--primary-50);
      color: var(--primary-700);
      font-size: 12.5px;
      font-weight: 600;
    }

    .form-text.impact {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .impact-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--success);
      flex-shrink: 0;
    }

    .impact-dot.stop { background: var(--error); }

    .form-text.counter { align-self: flex-end; }

    .chip-group {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .chip {
      position: relative;
      display: inline-flex !important;
      align-items: center;
      height: 38px;
      padding: 0 16px !important;
      margin: 0 !important;
      border: 1px solid var(--border-strong);
      border-radius: 999px;
      background: var(--surface);
      color: var(--gray-700) !important;
      font-size: 14px !important;
      font-weight: 500 !important;
      cursor: pointer;
      transition: background-color 0.12s ease, border-color 0.12s ease, color 0.12s ease;
    }

    .chip input { position: absolute; opacity: 0; pointer-events: none; }
    .chip:hover { border-color: var(--primary-400); }

    .chip.selected { background: var(--primary-600); border-color: var(--primary-600); color: #fff !important; }
    .chip.selected[data-level="high"] { background: var(--error); border-color: var(--error); }
    .chip.selected[data-level="medium"] { background: var(--warning); border-color: var(--warning); }
    .chip.selected[data-level="low"] { background: var(--success); border-color: var(--success); }

    .view-mode .chip { cursor: default; }

    .report {
      margin: 0;
      padding: 14px 16px;
      border-radius: 10px;
      background: var(--success-light);
      color: var(--success-text);
      white-space: pre-wrap;
      line-height: 1.55;
    }

    .empty-note { margin: 0; color: var(--text-muted); font-size: 14px; }

    .file-btn { cursor: pointer; }
    .file-none { margin-left: 10px; font-size: 0.8125rem; color: var(--text-muted); }
    input.sr-label:focus-visible + .file-btn { outline: 2px solid var(--primary-600); outline-offset: 2px; }
    .file-preview {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-top: 12px;
      padding: 12px 16px;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: var(--gray-50);
    }

    .file-preview.clickable { cursor: pointer; }
    .file-preview.clickable:hover { border-color: var(--primary-400); }

    .file-info { display: flex; align-items: center; gap: 10px; min-width: 0; font-size: 14px; }
    .file-info span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    .btn-download, .btn-remove {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 32px;
      padding: 0 12px;
      border: 1px solid var(--border-strong);
      border-radius: 8px;
      background: var(--surface);
      color: var(--gray-700);
      font-size: 13px;
      cursor: pointer;
    }

    .btn-remove { width: 32px; padding: 0; justify-content: center; }
    .btn-remove:hover { background: var(--error-light); color: var(--error); border-color: transparent; }

    @media (max-width: 1100px) {
      .facts-card { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .fact:nth-child(4) { border-left: 0; }
      .fact:nth-child(n + 4) { border-top: 1px solid var(--border); }
    }

    @media (max-width: 600px) {
      .facts-card { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .fact { border-left: 0 !important; border-top: 1px solid var(--border); }
    }

    @media print {
      app-page-header, .btn-print, .btn-secondary, .btn-download, .btn-remove, .card-footer { display: none !important; }
      .card, .facts-card { box-shadow: none !important; border: 1px solid #ccc !important; }
    }
  `],
  styleUrls: ['../../../shared/styles/modern-form-design.scss']
})
export class InterventionFormComponent implements OnInit, OnDestroy {
  interventionForm: FormGroup;
  isEditMode = false;
  isViewMode = false;
  isViewModeFromRoute = false;
  /** Create / edit opened as a side panel over the list (child route of /interventions). */
  drawer = false;
  interventionId?: number;
  intervention?: DemandeIntervention;
  lockReason: string | null = null;
  loading = false;
  saving = false;
  selectedFile?: File;
  existingFileName?: string;
  removeExistingFileFlag = false;

  readonly allowedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.csv', '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.jfif', '.heic', '.heif', '.avif', '.tif', '.tiff', '.zip', '.rar', '.7z'];

  typesIntervention: TypeIntervention[] = [];
  urgences: Urgence[] = [];
  chainesProduction: ChaineProduction[] = [];
  pannes: Panne[] = [];
  machines: EquipementSummary[] = [];

  private subscriptions: Subscription[] = [];

  constructor(
    private fb: FormBuilder,
    private interventionService: InterventionService,
    private referenceDataService: ReferenceDataService,
    private equipmentService: EquipmentService,
    private notificationService: NotificationService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.interventionForm = this.fb.group({
      idChaineProduction: [null, Validators.required],
      idEquipement: [null],
      idTypeIntervention: [null, Validators.required],
      idPanne: [null, Validators.required],
      idUrgence: [null, Validators.required],
      titre: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      description: ['', Validators.maxLength(2000)]
    });
  }

  /** Same rule as the server and the list: supervisor until closed, requester until someone takes it on. */
  get peutModifier(): boolean {
    const i = this.intervention;
    if (!i) return false;
    const status = i.statusId ?? 1;
    if (status === 4 || status === 5) return false;
    const user = this.authService.currentUser;
    if (user?.role === 'Superviseur') return true;
    return i.demandeursID === user?.internalId && status === 1 && !i.datePriseEnCharge;
  }

  urgenceTag(libelle: string | undefined): string {
    const l = (libelle || '').toLowerCase();
    return l.includes('haut') || l.includes('urgent') ? 't-bad' : l.includes('norm') || l.includes('moy') ? 't-info' : 't-neutral';
  }

  get formTitle(): string {
    if (this.isViewMode) return 'Fiche intervention';
    return this.isEditMode ? "Modifier l'intervention" : 'Déclarer une intervention';
  }

  get formSubtitle(): string {
    return this.isEditMode || this.isViewMode
      ? 'Localisation, nature et suivi de la demande'
      : 'Signalez une panne ou demandez une maintenance : un superviseur l\'affectera à un technicien.';
  }

  get reference(): string {
    return this.intervention ? `INT-${String(this.intervention.idDemandeIntervention).padStart(4, '0')}` : '';
  }

  get selectedType(): TypeIntervention | undefined {
    const id = this.interventionForm.get('idTypeIntervention')?.value;
    return this.typesIntervention.find(t => t.idTypeIntervention === id);
  }

  /** Planned (preventive) work does not stop production and has no breakdown type. */
  get isPreventive(): boolean {
    const label = this.selectedType?.libelle ?? '';
    return label.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().includes('prevent');
  }

  /** Machines of the selected line, plus machines not attached to any line. */
  get availableMachines(): EquipementSummary[] {
    const chaine = this.interventionForm.get('idChaineProduction')?.value;
    return chaine ? this.machines.filter(m => !m.idChaineProduction || m.idChaineProduction === chaine) : this.machines;
  }

  ngOnInit(): void {
    this.loadReferenceData();
    this.watchBusinessRules();

    this.isViewModeFromRoute = this.route.snapshot.data['viewMode'] === true;
    this.drawer = this.route.snapshot.data['drawer'] === true;
    this.isViewMode = this.isViewModeFromRoute;

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = !this.isViewMode;
      this.interventionId = +id;
      this.loadIntervention(this.interventionId);
    }
    if (this.isViewMode) this.interventionForm.disable({ emitEvent: false });
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  invalid(control: string): boolean {
    const c = this.interventionForm.get(control);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  urgenceLevel(label: string): string {
    const l = label.toLowerCase();
    if (l.includes('haut') || l.includes('urgent') || l.includes('crit')) return 'high';
    if (l.includes('moy') || l.includes('norm')) return 'medium';
    return 'low';
  }

  private watchBusinessRules(): void {
    const type = this.interventionForm.get('idTypeIntervention')!;
    const panne = this.interventionForm.get('idPanne')!;
    const chaine = this.interventionForm.get('idChaineProduction')!;
    const machine = this.interventionForm.get('idEquipement')!;

    // Breakdown type only applies to corrective work
    this.subscriptions.push(type.valueChanges.subscribe(() => {
      if (this.isPreventive) {
        panne.clearValidators();
        panne.setValue(null, { emitEvent: false });
      } else {
        panne.setValidators(Validators.required);
      }
      panne.updateValueAndValidity({ emitEvent: false });
    }));

    // A machine belongs to one line: selecting it fills the line
    this.subscriptions.push(machine.valueChanges.subscribe(id => {
      const selected = this.machines.find(m => m.idEquipement === id);
      if (selected?.idChaineProduction && chaine.value !== selected.idChaineProduction) {
        chaine.setValue(selected.idChaineProduction, { emitEvent: false });
      }
    }));

    // Title proposed from the breakdown type and the machine, until the user writes their own
    const panneCtl = this.interventionForm.get('idPanne')!;
    this.subscriptions.push(panneCtl.valueChanges.subscribe(() => this.suggestTitle()));
    this.subscriptions.push(machine.valueChanges.subscribe(() => this.suggestTitle()));
    this.subscriptions.push(this.interventionForm.get('titre')!.valueChanges.subscribe(() => this.titreSuggere = false));

    // Changing the line drops a machine that is not on it
    this.subscriptions.push(chaine.valueChanges.subscribe(() => {
      const selected = this.machines.find(m => m.idEquipement === machine.value);
      if (selected && !this.availableMachines.includes(selected)) {
        machine.setValue(null, { emitEvent: false });
      }
    }));
  }

  /** True while the title is the one proposed by the form (the user has not typed their own). */
  titreSuggere = false;

  private get isCreation(): boolean { return !this.isEditMode && !this.isViewMode && !this.interventionId; }

  /**
   * Fewer choices for the person declaring: a breakdown is corrective work of normal urgency
   * unless they say otherwise. Whoever knows better changes it in one click.
   */
  private applyCreationDefaults(): void {
    if (!this.isCreation) return;
    const f = this.interventionForm;
    if (f.get('idTypeIntervention')?.value === null && this.typesIntervention.length) {
      const norm = (l: string) => l.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      const corrective = this.typesIntervention.find(t => norm(t.libelle).includes('correct'))
        ?? this.typesIntervention.find(t => norm(t.libelle).includes('depann'));
      if (corrective) f.get('idTypeIntervention')!.setValue(corrective.idTypeIntervention);
    }
    if (f.get('idUrgence')?.value === null && this.urgences.length) {
      const normale = this.urgences.find(u => this.urgenceLevel(u.libelle) === 'medium');
      if (normale) f.get('idUrgence')!.setValue(normale.idUrgence);
    }
  }

  /** "?machine=12" (QR label on the machine): the machine and its line are filled in. */
  private applyMachineFromLink(): void {
    if (!this.isCreation) return;
    const id = Number(this.route.snapshot.queryParamMap.get('machine'));
    if (id && this.machines.some(m => m.idEquipement === id)) {
      const selected = this.machines.find(m => m.idEquipement === id)!;
      if (selected.idChaineProduction) this.interventionForm.get('idChaineProduction')!.setValue(selected.idChaineProduction, { emitEvent: false });
      this.interventionForm.get('idEquipement')!.setValue(id);
      this.machineFromLink = `${selected.codeEquipement} — ${selected.designation}`;
    }
  }
  machineFromLink = '';

  /** Proposes "Casse aiguille — CB-04" while the user has not written a title of their own. */
  private suggestTitle(): void {
    if (!this.isCreation) return;
    const titre = this.interventionForm.get('titre')!;
    if (titre.value && !this.titreSuggere) return;
    const panne = this.pannes.find(p => p.idPanne === this.interventionForm.get('idPanne')?.value);
    const machine = this.machines.find(m => m.idEquipement === this.interventionForm.get('idEquipement')?.value);
    const chaine = this.chainesProduction.find(c => c.idChaineProduction === this.interventionForm.get('idChaineProduction')?.value);
    if (!panne) return;
    const lieu = machine ? machine.codeEquipement : chaine ? chaine.libelle : '';
    titre.setValue(`${panne.libelle}${lieu ? ' — ' + lieu : ''}`.slice(0, 100), { emitEvent: false });
    this.titreSuggere = true;
  }

  loadReferenceData(): void {
    this.referenceDataService.getTypesIntervention().subscribe({
      next: data => {
        this.typesIntervention = data;
        this.interventionForm.get('idTypeIntervention')?.updateValueAndValidity();
        this.applyCreationDefaults();
      },
      error: () => this.notificationService.error('Erreur', 'Impossible de charger les types')
    });
    this.referenceDataService.getUrgences().subscribe({
      next: data => { this.urgences = data; this.applyCreationDefaults(); },
      error: () => this.notificationService.error('Erreur', 'Impossible de charger les urgences')
    });
    this.referenceDataService.getChainesProduction().subscribe({
      next: data => this.chainesProduction = data,
      error: () => this.notificationService.error('Erreur', 'Impossible de charger les chaînes')
    });
    this.referenceDataService.getPannes().subscribe({
      next: data => this.pannes = data,
      error: () => this.notificationService.error('Erreur', 'Impossible de charger les pannes')
    });
    this.equipmentService.lookup().subscribe({
      next: data => { this.machines = data; this.applyMachineFromLink(); },
      error: () => this.machines = []
    });
  }

  loadIntervention(id: number): void {
    this.loading = true;
    this.interventionService.getIntervention(id).subscribe({
      next: (intervention) => {
        this.intervention = intervention;
        this.interventionForm.patchValue({
          idChaineProduction: intervention.chaineProduction?.idChaineProduction ?? null,
          idEquipement: intervention.idEquipement ?? null,
          idTypeIntervention: intervention.typeIntervention?.idTypeIntervention ?? null,
          idPanne: intervention.panne?.idPanne ?? null,
          idUrgence: intervention.urgence?.idUrgence ?? null,
          titre: intervention.titre,
          description: intervention.description ?? ''
        });
        this.existingFileName = intervention.fileName;
        this.applyEditPermissions(intervention);
        this.loading = false;
      },
      error: () => {
        this.notificationService.error('Erreur', 'Impossible de charger l\'intervention');
        this.loading = false;
        this.router.navigate(['/interventions']);
      }
    });
  }

  /** Mirrors the server rules so the user is told why a field cannot be changed. */
  private applyEditPermissions(intervention: DemandeIntervention): void {
    if (this.isViewMode) return;
    const user = this.authService.currentUser;
    const status = intervention.statusId ?? STATUS.A_TRAITER;
    const isOwner = intervention.demandeursID === user?.internalId;

    if (status === STATUS.CLOTUREE || status === STATUS.ANNULEE) {
      this.lockReason = 'Cette intervention est clôturée ou annulée : elle ne peut plus être modifiée.';
    } else if (user?.role !== 'Superviseur' && !(isOwner && status === STATUS.A_TRAITER && !intervention.datePriseEnCharge)) {
      this.lockReason = 'Cette demande a été prise en charge par un technicien : elle ne peut plus être modifiée.';
    }

    if (this.lockReason) {
      this.isViewMode = true;
      this.isEditMode = false;
      this.interventionForm.disable({ emitEvent: false });
    }
  }

  removeExistingFile(): void {
    this.existingFileName = undefined;
    this.removeExistingFileFlag = true;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      this.notificationService.warning('Fichier trop volumineux', 'La taille maximum est de 10 Mo.');
      input.value = '';
      return;
    }
    const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!this.allowedExtensions.includes(extension)) {
      this.notificationService.warning('Type de fichier non autorisé', 'Formats acceptés : PDF, Office, images, archives.');
      input.value = '';
      return;
    }
    this.selectedFile = file;
    this.removeExistingFileFlag = false;
  }

  removeFile(): void {
    this.selectedFile = undefined;
    const fileInput = document.getElementById('file') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }

  onSubmit(): void {
    if (this.interventionForm.invalid) {
      this.interventionForm.markAllAsTouched();
      this.notificationService.warning('Formulaire incomplet', 'Complétez les champs obligatoires signalés en rouge.');
      return;
    }

    this.saving = true;
    const v = this.interventionForm.getRawValue();
    const payload: InterventionDto = {
      titre: (v.titre || '').trim(),
      idChaineProduction: v.idChaineProduction,
      // 0 tells the server to detach the machine on update
      idEquipement: v.idEquipement ?? (this.isEditMode ? 0 : null),
      idTypeIntervention: v.idTypeIntervention,
      idPanne: this.isPreventive ? null : v.idPanne,
      idUrgence: v.idUrgence,
      description: (v.description || '').trim()
    };

    const onError = (err: any) => {
      this.notificationService.error('Enregistrement impossible', err?.error?.message || 'Vérifiez les informations saisies.');
      this.saving = false;
    };
    const onSuccess = (message: string) => {
      this.notificationService.success('Succès', message);
      this.router.navigate(['/interventions']);
    };

    if (this.isEditMode && this.interventionId) {
      if (this.removeExistingFileFlag && !this.selectedFile) {
        const formData = new FormData();
        formData.append('interventionData', JSON.stringify({ ...payload, idDemandeIntervention: this.interventionId }));
        formData.append('fileName', '');
        this.interventionService.updateInterventionWithFormData(this.interventionId, formData)
          .subscribe({ next: () => onSuccess('Intervention modifiée.'), error: onError });
      } else {
        this.interventionService.updateIntervention(this.interventionId, payload, this.selectedFile)
          .subscribe({ next: () => onSuccess('Intervention modifiée.'), error: onError });
      }
    } else {
      this.interventionService.createIntervention(payload, this.selectedFile)
        .subscribe({ next: () => onSuccess('Intervention déclarée. Les superviseurs ont été prévenus.'), error: onError });
    }
  }

  cancel(): void {
    this.router.navigate(['/interventions']);
  }

  downloadExistingFile(): void {
    if (!this.interventionId) return;
    this.interventionService.downloadFile(this.interventionId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = this.existingFileName || 'piece-jointe';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: () => this.notificationService.error('Erreur', 'Impossible de télécharger le fichier')
    });
  }

  printForm(): void {
    window.print();
  }
}
