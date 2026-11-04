import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { fmtDate, fmtMoney } from '../../../shared/utils/gm-format';
import { EquipmentService } from '../services/equipment.service';
import { ReferenceDataService, EquipmentCriticite, EtatEquipement, FamilleEquipement, GroupeEquipement, ModeleEquipement, ChaineProduction } from '../../../core/services/reference-data.service';

/** Local yyyy-MM-dd (toISOString would shift the day in UTC+1). */
function toInputDate(date?: Date | string | null): string | null {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Build -> purchase -> installation -> commissioning, none in the future. */
function chronologyValidator(group: AbstractControl): ValidationErrors | null {
  const v = (name: string) => group.get(name)?.value as string | null;
  const today = toInputDate(new Date())!;
  const order: [string, string, string][] = [
    ['dateConstruction', 'dateAchat', "La date de fabrication doit précéder la date d'achat."],
    ['dateAchat', 'dateInstallation', "L'installation ne peut pas précéder l'achat."],
    ['dateInstallation', 'dateMiseEnService', "La mise en service ne peut pas précéder l'installation."],
    ['dateAchat', 'dateFinGarantie', "La fin de garantie doit être postérieure à l'achat."]
  ];
  for (const [before, after, message] of order) {
    if (v(before) && v(after) && v(before)! > v(after)!) return { chronology: message };
  }
  for (const name of ['dateConstruction', 'dateAchat', 'dateInstallation', 'dateMiseEnService']) {
    if (v(name) && v(name)! > today) return { chronology: 'Les dates de fabrication, achat, installation et mise en service ne peuvent pas être dans le futur.' };
  }
  return null;
}
import { NotificationService } from '../../../core/services/notification.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { AuthService } from '../../../core/services/auth.service';
import { AppIconComponent } from '../../../shared/components/app-icon/app-icon.component';
import { EquipementHistoriqueComponent } from '../equipement-historique/equipement-historique.component';

@Component({
  selector: 'app-equipment-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, PageHeaderComponent, AppIconComponent, EquipementHistoriqueComponent],
  template: `
    <!-- Create / edit: side panel over the list, like every other form of the app -->
    <ng-container *ngIf="drawer">
      <div class="gm-backdrop" (click)="cancel()"></div>
      <aside class="gm-drawer" role="dialog" [attr.aria-label]="formTitle">
        <div class="gm-drawer-head">
          <div>
            <h2>{{ formTitle }}</h2>
            <div class="sub">Les champs marqués * sont obligatoires. Le reste peut être complété plus tard.</div>
          </div>
          <button type="button" class="gm-icon-btn" (click)="cancel()" aria-label="Fermer"><app-icon name="close"></app-icon></button>
        </div>

        <form class="gm-drawer-body" [formGroup]="equipmentForm" (ngSubmit)="onSubmit()" id="equipmentForm">
          <div class="gm-loading" *ngIf="loading"><span class="spinner"></span> Chargement…</div>

          <div class="gm-section-title">Identification</div>
          <div class="gm-form">
            <div class="gm-field">
              <label for="codeEquipement">Code équipement<span class="req">*</span></label>
              <input id="codeEquipement" type="text" formControlName="codeEquipement" placeholder="Ex. PIQ-A-04">
              <span class="hint">Le code collé sur la machine, unique dans l'usine.</span>
              <span class="err" *ngIf="equipmentForm.get('codeEquipement')?.invalid && equipmentForm.get('codeEquipement')?.touched">Le code est requis.</span>
            </div>
            <div class="gm-field">
              <label for="designation">Désignation<span class="req">*</span></label>
              <input id="designation" type="text" formControlName="designation" placeholder="Ex. Piqueuse plate 1 aiguille">
              <span class="err" *ngIf="equipmentForm.get('designation')?.invalid && equipmentForm.get('designation')?.touched">La désignation est requise.</span>
            </div>
            <div class="gm-field">
              <label for="idFamille">Famille</label>
              <select id="idFamille" formControlName="idFamille">
                <option [value]="null">Choisir…</option>
                <option *ngFor="let famille of familles" [value]="famille.idFamille">{{ famille.nomFamille }}</option>
              </select>
            </div>
            <div class="gm-field">
              <label for="idModele">Modèle</label>
              <select id="idModele" formControlName="idModele">
                <option [value]="null">Choisir…</option>
                <option *ngFor="let modele of modeles" [value]="modele.idModele">{{ modele.nomModele }} {{ modele.marque ? '(' + modele.marque.nomMarque + ')' : '' }}</option>
              </select>
            </div>
            <div class="gm-field">
              <label for="idGroupe">Groupe</label>
              <select id="idGroupe" formControlName="idGroupe">
                <option [value]="null">Choisir…</option>
                <option *ngFor="let groupe of groupes" [value]="groupe.idGroupe">{{ groupe.nomGroupe }}</option>
              </select>
            </div>
            <div class="gm-field">
              <label for="numeroSerie">Numéro de série</label>
              <input id="numeroSerie" type="text" formControlName="numeroSerie">
            </div>
          </div>

          <div class="gm-section-title">Situation dans l'atelier</div>
          <div class="gm-form">
            <div class="gm-field">
              <label for="idChaineProduction">Chaîne de production</label>
              <select id="idChaineProduction" formControlName="idChaineProduction">
                <option [ngValue]="null">Non affectée</option>
                <option *ngFor="let chaine of chaines" [ngValue]="chaine.idChaineProduction">{{ chaine.libelle }}</option>
              </select>
              <span class="hint">Les demandes d'intervention sur cette machine reprennent cette chaîne.</span>
            </div>
            <div class="gm-field">
              <label for="idEtat">État</label>
              <select id="idEtat" formControlName="idEtat">
                <option [value]="null">Choisir…</option>
                <option *ngFor="let etat of etats" [value]="etat.idEtat">{{ etat.nomEtat }}</option>
              </select>
              <span class="hint">Passe tout seul « En panne » pendant une panne déclarée.</span>
            </div>
            <div class="gm-field">
              <label for="idCriticite">Criticité</label>
              <select id="idCriticite" formControlName="idCriticite">
                <option [value]="null">Choisir…</option>
                <option *ngFor="let criticite of criticites" [value]="criticite.idCriticite">{{ criticite.nomCriticite }}</option>
              </select>
              <span class="hint">Critique : son arrêt bloque la production de la chaîne.</span>
            </div>
          </div>

          <div class="gm-section-title">Dates et coût</div>
          <div class="gm-form">
            <div class="gm-field">
              <label for="dateConstruction">Date de fabrication</label>
              <input id="dateConstruction" type="date" formControlName="dateConstruction" [max]="dateValue('dateAchat') || today">
            </div>
            <div class="gm-field">
              <label for="dateAchat">Date d'achat</label>
              <input id="dateAchat" type="date" formControlName="dateAchat" [min]="dateValue('dateConstruction')" [max]="dateValue('dateInstallation') || today">
            </div>
            <div class="gm-field">
              <label for="dateInstallation">Date d'installation</label>
              <input id="dateInstallation" type="date" formControlName="dateInstallation" [min]="dateValue('dateAchat')" [max]="dateValue('dateMiseEnService') || today">
            </div>
            <div class="gm-field">
              <label for="dateMiseEnService">Date de mise en service</label>
              <input id="dateMiseEnService" type="date" formControlName="dateMiseEnService" [min]="dateValue('dateInstallation')" [max]="today">
            </div>
            <div class="gm-field">
              <label for="coutAchat">Coût d'achat (DT)</label>
              <input id="coutAchat" type="number" step="0.01" min="0" formControlName="coutAchat">
              <span class="err" *ngIf="equipmentForm.get('coutAchat')?.invalid">Le coût ne peut pas être négatif.</span>
            </div>
            <div class="gm-field">
              <label for="dateFinGarantie">Fin de garantie</label>
              <input id="dateFinGarantie" type="date" formControlName="dateFinGarantie" [min]="dateValue('dateAchat')">
              <span class="hint" *ngIf="garantie as g">{{ g }}</span>
            </div>
          </div>
          <div class="gm-error-box" *ngIf="equipmentForm.errors?.['chronology']"><app-icon name="alert"></app-icon>{{ equipmentForm.errors?.['chronology'] }}</div>

          <div class="gm-field">
            <label for="description">Description</label>
            <textarea id="description" formControlName="description" rows="3" placeholder="Emplacement précis, particularités, consignes…"></textarea>
          </div>
        </form>

        <div class="gm-drawer-foot">
          <button type="button" class="btn btn-secondary" (click)="cancel()" [disabled]="loading">Annuler</button>
          <button type="submit" form="equipmentForm" class="btn btn-primary" [disabled]="equipmentForm.invalid || loading">
            {{ isEditMode ? 'Enregistrer les modifications' : "Créer l'équipement" }}
          </button>
        </div>
      </aside>
    </ng-container>

    <div class="form-container" *ngIf="!drawer">
      <app-page-header icon="equipment" [title]="formTitle" subtitle="Identification, état et caractéristiques de l'équipement">
        <div class="header-actions">
          <a class="btn btn-primary" *ngIf="isViewMode && canEdit && equipmentId" [routerLink]="['/equipment/edit', equipmentId]"><app-icon name="edit"></app-icon> Modifier</a>
          <button class="btn btn-secondary" type="button" (click)="printForm()" *ngIf="isViewMode"><app-icon name="print"></app-icon> Imprimer</button>
          <button class="btn btn-secondary" (click)="cancel()">{{ isViewMode ? 'Retour' : 'Annuler' }}</button>
        </div>
      </app-page-header>

      <!-- A machine record has three views: its data, its maintenance history, its documents -->
      <div class="gm-tabs eq-tabs" *ngIf="isViewMode && equipmentId && canSeeHistory">
        <button [class.on]="onglet === 'fiche'" (click)="setOnglet('fiche')"><app-icon name="equipment"></app-icon> Fiche</button>
        <button [class.on]="onglet === 'historique'" (click)="setOnglet('historique')"><app-icon name="history"></app-icon> Historique et fiabilité</button>
        <button [class.on]="onglet === 'documents'" (click)="setOnglet('documents')"><app-icon name="file"></app-icon> Documents</button>
      </div>

      <app-equipement-historique *ngIf="isViewMode && equipmentId && onglet !== 'fiche'" [equipementId]="equipmentId" [mode]="onglet === 'documents' ? 'documents' : 'historique'"></app-equipement-historique>

      <!-- Consultation: a reading view (label and value), the form is only for editing -->
      <section class="gm-card fiche" *ngIf="isViewMode && onglet === 'fiche'" aria-label="Fiche de la machine">
        <div class="gm-loading" *ngIf="loading"><span class="spinner"></span> Chargement de la fiche…</div>
        <ng-container *ngIf="!loading">
          <div class="fiche-head">
            <div>
              <span class="gm-code code">{{ v('codeEquipement') }}</span>
              <h2>{{ v('designation') }}</h2>
              <p class="lieu">{{ nom(chaines, 'idChaineProduction', 'idChaineProduction', 'libelle') || 'Chaîne non renseignée' }}</p>
            </div>
            <div class="pills">
              <span class="gm-tag" [ngClass]="etatTone">{{ nom(etats, 'idEtat', 'idEtat', 'nomEtat') || 'État non renseigné' }}</span>
              <span class="gm-tag t-neutral" *ngIf="nom(criticites, 'idCriticite', 'idCriticite', 'nomCriticite') as c">Importance : {{ c }}</span>
            </div>
          </div>
          <div class="fiche-grid">
            <dl>
              <h3>Identification</h3>
              <div><dt>Famille</dt><dd>{{ nom(familles, 'idFamille', 'idFamille', 'nomFamille') || vide }}</dd></div>
              <div><dt>Modèle</dt><dd>{{ modeleLibelle || vide }}</dd></div>
              <div><dt>Groupe</dt><dd>{{ nom(groupes, 'idGroupe', 'idGroupe', 'nomGroupe') || vide }}</dd></div>
              <div><dt>Numéro de série</dt><dd>{{ v('numeroSerie') || vide }}</dd></div>
            </dl>
            <dl>
              <h3>Dates et coût</h3>
              <div><dt>Mise en service</dt><dd>{{ date('dateMiseEnService') }}</dd></div>
              <div><dt>Achat</dt><dd>{{ date('dateAchat') }}<ng-container *ngIf="v('coutAchat') !== null && v('coutAchat') !== ''"> · {{ montant(v('coutAchat')) }}</ng-container></dd></div>
              <div><dt>Installation</dt><dd>{{ date('dateInstallation') }}</dd></div>
              <div><dt>Fabrication</dt><dd>{{ date('dateConstruction') }}</dd></div>
              <div><dt>Garantie</dt><dd [class.expired]="garantieExpiree">{{ garantie || vide }}</dd></div>
            </dl>
          </div>
          <div class="fiche-desc" *ngIf="v('description')"><h3>Description</h3><p>{{ v('description') }}</p></div>
        </ng-container>
      </section>

      <form [formGroup]="equipmentForm" (ngSubmit)="onSubmit()" class="card" *ngIf="!isViewMode">
        <div class="card-body">
          <div class="form-grid">
            <div class="form-group">
              <label for="codeEquipement">Code équipement <span class="required">*</span></label>
              <input
                id="codeEquipement"
                type="text"
                formControlName="codeEquipement"
                [class.error]="equipmentForm.get('codeEquipement')?.invalid && equipmentForm.get('codeEquipement')?.touched"
              />
              <span class="error-message" *ngIf="equipmentForm.get('codeEquipement')?.invalid && equipmentForm.get('codeEquipement')?.touched">
                Le code est requis
              </span>
            </div>

            <div class="form-group">
              <label for="designation">Désignation <span class="required">*</span></label>
              <input
                id="designation"
                type="text"
                formControlName="designation"
                [class.error]="equipmentForm.get('designation')?.invalid && equipmentForm.get('designation')?.touched"
              />
              <span class="error-message" *ngIf="equipmentForm.get('designation')?.invalid && equipmentForm.get('designation')?.touched">
                La désignation est requise
              </span>
            </div>

            <div class="form-group">
              <label for="idCriticite">Criticité</label>
              <select id="idCriticite" formControlName="idCriticite">
                <option [value]="null">-- Sélectionner --</option>
                <option *ngFor="let criticite of criticites" [value]="criticite.idCriticite">
                  {{ criticite.nomCriticite }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label for="idEtat">État</label>
              <select id="idEtat" formControlName="idEtat">
                <option [value]="null">-- Sélectionner --</option>
                <option *ngFor="let etat of etats" [value]="etat.idEtat">
                  {{ etat.nomEtat }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label for="idFamille">Famille</label>
              <select id="idFamille" formControlName="idFamille">
                <option [value]="null">-- Sélectionner --</option>
                <option *ngFor="let famille of familles" [value]="famille.idFamille">
                  {{ famille.nomFamille }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label for="idChaineProduction">Chaîne de production</label>
              <select id="idChaineProduction" formControlName="idChaineProduction">
                <option [ngValue]="null">Non affectée</option>
                <option *ngFor="let chaine of chaines" [ngValue]="chaine.idChaineProduction">{{ chaine.libelle }}</option>
              </select>
              <small class="form-text">La chaîne où la machine est installée : les demandes d'intervention la reprennent automatiquement.</small>
            </div>

            <div class="form-group">
              <label for="idGroupe">Groupe</label>
              <select id="idGroupe" formControlName="idGroupe">
                <option [value]="null">-- Sélectionner --</option>
                <option *ngFor="let groupe of groupes" [value]="groupe.idGroupe">
                  {{ groupe.nomGroupe }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label for="idModele">Modèle</label>
              <select id="idModele" formControlName="idModele">
                <option [value]="null">-- Sélectionner --</option>
                <option *ngFor="let modele of modeles" [value]="modele.idModele">
                  {{ modele.nomModele }} {{ modele.marque ? '(' + modele.marque.nomMarque + ')' : '' }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label for="numeroSerie">Numéro de série</label>
              <input id="numeroSerie" type="text" formControlName="numeroSerie" />
            </div>

            <div class="form-group">
              <label for="dateConstruction">Date de fabrication</label>
              <input id="dateConstruction" type="date" formControlName="dateConstruction" [max]="dateValue('dateAchat') || today" />
            </div>

            <div class="form-group">
              <label for="dateAchat">Date d'achat</label>
              <input id="dateAchat" type="date" formControlName="dateAchat" [min]="dateValue('dateConstruction')" [max]="dateValue('dateInstallation') || today" />
            </div>

            <div class="form-group">
              <label for="dateInstallation">Date d'installation</label>
              <input id="dateInstallation" type="date" formControlName="dateInstallation" [min]="dateValue('dateAchat')" [max]="dateValue('dateMiseEnService') || today" />
            </div>

            <div class="form-group">
              <label for="dateMiseEnService">Date de mise en service</label>
              <input id="dateMiseEnService" type="date" formControlName="dateMiseEnService" [min]="dateValue('dateInstallation')" [max]="today" />
            </div>

            <div class="form-group">
              <label for="coutAchat">Coût d'achat (DT)</label>
              <input id="coutAchat" type="number" step="0.01" min="0" formControlName="coutAchat" />
              <span class="error-message" *ngIf="equipmentForm.get('coutAchat')?.invalid">Le coût ne peut pas être négatif.</span>
            </div>

            <div class="form-group">
              <label for="dateFinGarantie">Fin de garantie</label>
              <input id="dateFinGarantie" type="date" formControlName="dateFinGarantie" [min]="dateValue('dateAchat')" />
              <small class="warranty" *ngIf="garantie as g" [class.expired]="garantieExpiree">{{ g }}</small>
            </div>
          </div>

          <div class="form-error" *ngIf="equipmentForm.errors?.['chronology']">
            {{ equipmentForm.errors?.['chronology'] }}
          </div>

          <div class="form-group">
            <label for="description">Description</label>
            <textarea
              id="description"
              formControlName="description"
              rows="3"
              placeholder="Description de l'équipement..."
            ></textarea>
          </div>

          <div *ngIf="loading" class="loading-overlay">
            <span class="spinner"></span>
          </div>
        </div>

        <div class="card-footer">
          <button type="button" class="btn btn-secondary" (click)="cancel()" [disabled]="loading">
            {{ isViewMode ? 'Retour' : 'Annuler' }}
          </button>
          <button type="submit" class="btn btn-primary" [disabled]="equipmentForm.invalid || loading" *ngIf="!isViewMode">
            {{ isEditMode ? 'Mettre à jour' : 'Créer' }}
          </button>
        </div>
      </form>
    </div>
  `,
  styleUrls: ['../../../shared/styles/modern-form-design.scss'],
  styles: [`
    .eq-tabs { margin-bottom: 16px; } app-equipement-historique { margin-bottom: 16px; }
    .header-actions { display: flex; gap: 8px; flex-wrap: wrap; }
    .fiche { padding: 20px 24px; }
    .fiche-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; padding-bottom: 16px; border-bottom: 1px solid var(--border); }
    .fiche-head .code { font-size: 0.8125rem; color: var(--text-muted); }
    .fiche-head h2 { margin: 2px 0 2px; font-size: 1.25rem; font-weight: 600; }
    .fiche-head .lieu { margin: 0; color: var(--text-secondary); font-size: 0.875rem; }
    .pills { display: flex; gap: 6px; flex-wrap: wrap; }
    .fiche-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 32px; padding-top: 12px; }
    .fiche h3 { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); margin: 8px 0 6px; }
    dl { margin: 0; }
    dl > div { display: grid; grid-template-columns: 150px 1fr; gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--gray-100); font-size: 0.875rem; }
    dt { color: var(--text-secondary); }
    dd { margin: 0; color: var(--text); font-weight: 500; }
    dd.expired { color: var(--error-dark); }
    .fiche-desc { padding-top: 8px; }
    .fiche-desc p { margin: 0; font-size: 0.875rem; line-height: 1.55; color: var(--text); white-space: pre-line; }
    @media (max-width: 760px) { .fiche-grid { grid-template-columns: 1fr; } dl > div { grid-template-columns: 130px 1fr; } }
  `]

})
export class EquipmentFormComponent implements OnInit {

  get formTitle(): string {
    if (this.isViewMode) return 'Fiche équipement';
    return this.isEditMode ? "Modifier l'équipement" : 'Nouvel équipement';
  }
  equipmentForm: FormGroup;
  isEditMode = false;
  isViewMode = false;
  /** Create / edit opened as a side panel over the list (child route of /equipment). */
  drawer = false;
  equipmentId?: number;
  onglet: 'fiche' | 'historique' | 'documents' = 'fiche';

  /** Requesters only see the machine data; history and documents are for maintenance staff. */
  get canSeeHistory(): boolean { return this.auth.getCurrentUser()?.role !== 'Demandeur'; }

  setOnglet(o: 'fiche' | 'historique' | 'documents'): void {
    this.onglet = o;
    this.router.navigate([], { queryParams: { onglet: o === 'fiche' ? null : o }, replaceUrl: true });
  }
  loading = false;

  // Reference data
  criticites: EquipmentCriticite[] = [];
  etats: EtatEquipement[] = [];
  familles: FamilleEquipement[] = [];
  groupes: GroupeEquipement[] = [];
  modeles: ModeleEquipement[] = [];
  chaines: ChaineProduction[] = [];

  readonly today = toInputDate(new Date())!;
  readonly vide = 'Non renseigné';

  /** "Sous garantie jusqu'au 03/11/2027" or "Garantie expirée": computed here, not in the template. */
  get garantie(): string | null {
    const end = this.dateValue('dateFinGarantie');
    if (!end) return null;
    return end >= this.today ? `Sous garantie jusqu'au ${fmtDate(end)}` : 'Garantie expirée';
  }

  get garantieExpiree(): boolean {
    const end = this.dateValue('dateFinGarantie');
    return !!end && end < this.today;
  }

  get canEdit(): boolean { return this.auth.getCurrentUser()?.role === 'Superviseur'; }

  /** Value of a field for the reading view (the form is disabled there). */
  v(name: string): any { return this.equipmentForm.get(name)?.value ?? null; }

  date(name: string): string { const d = this.v(name); return d ? fmtDate(d) : this.vide; }

  montant(value: any): string { return fmtMoney(Number(value)); }

  /** Name of the selected item of a reference list. */
  nom(list: any[], control: string, idField: string, nameField: string): string {
    const id = this.v(control);
    if (id === null || id === undefined || id === '') return '';
    return list.find(x => String(x[idField]) === String(id))?.[nameField] ?? '';
  }

  get modeleLibelle(): string {
    const m: any = this.modeles.find(x => String(x.idModele) === String(this.v('idModele')));
    return m ? m.nomModele + (m.marque ? ` (${m.marque.nomMarque})` : '') : '';
  }

  get etatTone(): string {
    const n = this.nom(this.etats, 'idEtat', 'idEtat', 'nomEtat').toLowerCase();
    return n.includes('panne') ? 't-bad' : n.includes('maint') ? 't-warn' : n.includes('service') ? 't-ok' : 't-neutral';
  }

  dateValue(name: string): string | null {
    return this.equipmentForm.get(name)?.value || null;
  }

  constructor(
    private fb: FormBuilder,
    private equipmentService: EquipmentService,
    private referenceDataService: ReferenceDataService,
    private notificationService: NotificationService,
    private router: Router,
    private route: ActivatedRoute,
    private auth: AuthService
  ) {
    this.equipmentForm = this.fb.group({
      codeEquipement: ['', Validators.required],
      designation: ['', Validators.required],
      description: [''],
      idCriticite: [null],
      idEtat: [null],
      idFamille: [null],
      idGroupe: [null],
      idModele: [null],
      idChaineProduction: [null],
      numeroSerie: [''],
      dateInstallation: [null],
      dateMiseEnService: [null],
      dateAchat: [null],
      dateConstruction: [null],
      coutAchat: [null, Validators.min(0)],
      dateFinGarantie: [null]
    }, { validators: chronologyValidator });
  }

  ngOnInit(): void {
    this.loadReferenceData();
    
    // Check if view mode from route data
    this.isViewMode = this.route.snapshot.data['viewMode'] === true;
    this.drawer = this.route.snapshot.data['drawer'] === true;
    const onglet = this.route.snapshot.queryParamMap.get('onglet');
    if (onglet === 'historique' || onglet === 'documents') this.onglet = onglet;

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = !this.isViewMode;
      this.equipmentId = +id;
      this.loadEquipment(this.equipmentId);
      
      // Disable form in view mode
      if (this.isViewMode) {
        this.equipmentForm.disable();
      }
    }
  }

  loadReferenceData(): void {
    this.referenceDataService.getEquipmentCriticites().subscribe({
      next: (data) => this.criticites = data
    });

    this.referenceDataService.getEtatEquipements().subscribe({
      next: (data) => this.etats = data
    });

    this.referenceDataService.getFamillesEquipement().subscribe({
      next: (data) => this.familles = data
    });

    this.referenceDataService.getGroupesEquipement().subscribe({
      next: (data) => this.groupes = data
    });

    this.referenceDataService.getModelesEquipement().subscribe({
      next: (data) => this.modeles = data
    });

    this.referenceDataService.getChainesProduction().subscribe({
      next: (data) => this.chaines = data
    });
  }

  loadEquipment(id: number): void {
    this.loading = true;
    this.equipmentService.getEquipment(id).subscribe({
      next: (equipment) => {
        this.equipmentForm.patchValue({
          codeEquipement: equipment.codeEquipement,
          designation: equipment.designation,
          description: equipment.description,
          idCriticite: equipment.idCriticite,
          idEtat: equipment.idEtat,
          idFamille: equipment.idFamille,
          idGroupe: equipment.idGroupe,
          idModele: equipment.idModele,
          idChaineProduction: equipment.idChaineProduction ?? null,
          numeroSerie: equipment.numeroSerie,
          dateInstallation: this.formatDateForInput(equipment.dateInstallation),
          dateMiseEnService: this.formatDateForInput(equipment.dateMiseEnService),
          dateAchat: this.formatDateForInput(equipment.dateAchat),
          dateConstruction: this.formatDateForInput(equipment.dateConstruction),
          coutAchat: equipment.coutAchat,
          dateFinGarantie: this.formatDateForInput(equipment.dateFinGarantie)
        });
        this.loading = false;
      },
      error: () => {
        this.notificationService.error('Erreur', 'Impossible de charger l\'équipement');
        this.loading = false;
        this.router.navigate(['/equipment']);
      }
    });
  }

  onSubmit(): void {
    if (this.equipmentForm.invalid) {
      this.equipmentForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    const raw = this.equipmentForm.value;
    // "Under warranty" is derived from the warranty end date (the server does the same)
    const formValue = { ...raw, sousGarantie: !!raw.dateFinGarantie && raw.dateFinGarantie >= this.today };

    if (this.isEditMode && this.equipmentId) {
      this.equipmentService.updateEquipment(this.equipmentId, formValue).subscribe({
        next: () => {
          this.notificationService.success(
            'Succès',
            'Équipement modifié avec succès'
          );
          this.router.navigate(['/equipment']);
        },
        error: (err) => {
          this.notificationService.error('Enregistrement impossible', this.serverMessage(err, "Impossible de modifier l'équipement"));
          this.loading = false;
        }
      });
    } else {
      this.equipmentService.createEquipment(formValue).subscribe({
        next: () => {
          this.notificationService.success(
            'Succès',
            'Équipement créé avec succès'
          );
          this.router.navigate(['/equipment']);
        },
        error: (err) => {
          this.notificationService.error('Enregistrement impossible', this.serverMessage(err, "Impossible de créer l'équipement"));
          this.loading = false;
        }
      });
    }
  }

  cancel(): void {
    this.router.navigate(['/equipment']);
  }

  printForm(): void {
    window.print();
  }

  private formatDateForInput(date?: Date | string): string | null {
    return toInputDate(date);
  }

  private serverMessage(err: any, fallback: string): string {
    const e = err?.error;
    if (typeof e === 'string' && e.length < 300) return e;
    return e?.message || fallback;
  }
}
