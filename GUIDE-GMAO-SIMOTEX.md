# SIMOTEX GMAO — Complete guide to the application

This guide explains what every part of the application does, what every number means and how it is calculated, and how the application is built. Part A is for presenting the application to SIMOTEX. Part B is the technical side.

Screen names and labels are written in French, exactly as they appear in the application, so you can point at them during a demo.

---

## Contents

**Part A — Using and explaining the application**

1. What a GMAO is, in one minute
2. Units and abbreviations (h, DT, DT/h, OT, MTTR…)
3. The three roles
4. The core workflow: life of an intervention
5. Tableau de bord (dashboard)
6. Planning
7. Interventions
8. Maintenance préventive
9. Équipements
10. Techniciens
11. Magasin (store)
12. Achats (purchasing)
13. Budgets
14. Explorateur de données
15. Rapports (Power BI)
16. Paramètres (settings), Journal, Notifications
17. How the modules feed each other
18. Glossary of every KPI and how it is calculated
19. Questions the client may ask

**Part B — Technical side**

20. Architecture overview
21. Technologies used, and what each term means
22. Backend: projects, controllers, services
23. Frontend: structure, services, guards, interceptors
24. Security
25. A request from click to database (technical workflow)
26. Database and migrations
27. Background jobs
28. Tests
29. Deployment
30. Technical glossary

---

# PART A — USING AND EXPLAINING THE APPLICATION

## 1. What a GMAO is, in one minute

**GMAO** = *Gestion de Maintenance Assistée par Ordinateur* (in English: CMMS, Computerized Maintenance Management System).

In a textile factory, machines (sewing machines, cutting tables, steam irons, compressors…) break down or need regular servicing. Without software, breakdowns are reported by phone, nobody knows who is working on what, spare parts run out without warning, and nobody can say how much maintenance really costs.

The GMAO answers four questions:

| Question | Where in the app |
|---|---|
| What is broken right now, and who is fixing it? | Interventions, Planning, Tableau de bord |
| What servicing must be done, and when? | Maintenance préventive |
| Do we have the parts, and what must we order? | Magasin, Achats |
| How much does maintenance cost, and is it improving? | Tableau de bord, Budgets, Explorateur, Rapports |

---

## 2. Units and abbreviations

| You see | It means | Example |
|---|---|---|
| **h** | hours | "253 h" of downtime = 253 hours of machine stop in total |
| **min** | minutes | a time entry of 45 min |
| **j** | *jours* (days) | "dans 6 j" = in 6 days; "7 j / 30 j / 90 j / 12 mois" = period selector |
| **DT** | **Dinar tunisien**, the currency. Every amount in the app is in DT. | "Coût de maintenance 4 008 DT" |
| **DT/h** | **dinars per hour**: the hourly cost of a technician (*taux horaire*). It is used to turn hours of work into money. | 12,5 DT/h × 2 h of work = 25 DT of labour |
| **k DT** | thousands of dinars | "4,0 k" in the cost donut = 4 000 DT |
| **%** | percentage | availability 99 % |
| **pt** | percentage **point**: the difference between two percentages | 98 % → 99 % = "+1 pt" (not "+1 %") |
| **OT** | *Ordre de Travail* (work order) = one intervention | |
| **INT-0042** | the reference number of intervention 42 | |
| **PM-0004** | the code of preventive plan 4 | |
| **DA-2026-0007** | *Demande d'Achat* (purchase request) 7 of 2026 | |
| **BC-2026-0055** | *Bon de Commande* (purchase order) 55 of 2026 | |
| **MTTR** | *Mean Time To Repair*: average repair time | see §18 |
| **MTBF** | *Mean Time Between Failures*: average running time between two breakdowns | see §18 |

Number format is French: a comma for decimals (12,5) and a space for thousands (4 008).

---

## 3. The three roles

Every account has exactly one role. The menu, the pages and the buttons adapt to it, and the server checks it again on every action, so hiding a button is never the only protection.

| Role (name in the app) | Who at SIMOTEX | What they do | What they see |
|---|---|---|---|
| **Superviseur** | Maintenance manager | Assigns work, validates finished work, manages plans, store, purchasing, budgets, users and settings | Everything |
| **Utilisateur** = **Technicien** | Maintenance technicians | Accept or refuse their interventions, log time and parts, write the report, mark the work done, request purchases | Their own interventions and planning, préventif (read), équipements (read), magasin, achats (their own requests) |
| **Demandeur** | Production line heads (*chefs de chaîne*) | Declare breakdowns and requests, follow them | Their own requests only, and their personal dashboard |

> The technician role is called "Utilisateur" in the database for historical reasons. On screens it is explained as "Techniciens (rôle Utilisateur)".

---

## 4. The core workflow: life of an intervention

This is the heart of the application. An intervention (OT) always goes through these **statuses**:

```
 ① À traiter ──► ② En cours ──► ③ Réalisée ──► ④ Clôturée
      │                              │
      │                              └──► back to ② (Renvoyer au technicien)
      └──────────────► ⑤ Annulée (possible until closure)
```

### Step by step

| # | Who | Action in the app | Status after | What happens automatically |
|---|---|---|---|---|
| 1 | Demandeur (or Superviseur) | **Déclarer une panne / Nouvelle intervention**: chooses the line (*chaîne*), the machine, the type, the breakdown type, the urgency, a title and a description, and can attach a photo | **À traiter** | Supervisors get a notification. If it is a breakdown (not preventive), the machine switches to **"En panne"**. Journal entry "Déclaration". |
| 2 | Superviseur | On the intervention page, "À faire" card: **Affecter un technicien** | still À traiter (assigned) | The technician gets a notification. Journal "Affectation". |
| 3a | Technicien | **Accepter et démarrer** | **En cours** | Supervisors and the requester are notified ("prise en charge"). Start of the repair clock (used for MTTR). |
| 3b | Technicien | or **Refuser** with a reason (unavailable, missing skill, missing part…) | back to À traiter, unassigned | Supervisors are notified with the reason; the supervisor reassigns. |
| 4 | Technicien | In **Suivi des travaux**: logs time (*Temps passé*), takes parts from the store (*Sortir du magasin*), ticks the checklist, writes cause and remedy | En cours | Each part taken leaves the store stock immediately. Labour cost is computed from time × hourly rate. |
| 5 | Technicien | **Marquer comme réalisée** with a **compte rendu** (work report, at least 10 characters) | **Réalisée** | Supervisors are notified "attend votre validation". The machine goes back to **"En service"**. |
| 6a | Superviseur | Reads the report, then **Valider et clôturer** | **Clôturée** | Technician and requester notified. The intervention is locked (no more edits). |
| 6b | Superviseur | or **Renvoyer au technicien** if the work is not satisfactory | back to **En cours** | Technician notified "à reprendre". |
| — | Superviseur (any time), or Demandeur (only while nobody started it) | **Annuler cette intervention** with a reason | **Annulée** | Parts already taken are **returned to stock** automatically; machine state is recalculated. |

### Rules the application enforces (good to tell the client)

- Only the **assigned technician** can start and finish an intervention.
- Only a **supervisor** can close it.
- A report is **mandatory** to finish.
- A requester can edit or cancel their request **only before** a technician starts it.
- Time entries: the end cannot be in the future, and a technician **cannot log two overlapping periods** (they cannot be in two places at once).
- Deleting an intervention (supervisor only) also returns its parts to stock. Cancelling is preferred, because it keeps a trace.
- Every step is written in the **Journal d'activité** (who, what, when).

### Machine state ("État")

- A **breakdown** (any type that is not "préventive") with an identified machine sets the machine to **En panne** while the intervention is open.
- When no open breakdown remains on the machine (finished, closed or cancelled), it goes back to **En service**.
- Preventive work does **not** stop the machine.

---

## 5. Tableau de bord (dashboard)

The dashboard is different for each role.

### 5.1 Supervisor dashboard ("Pilotage de la maintenance")

**Filters at the top:**

- **Période**: 7 j, 30 j, 90 j, 12 mois.
- **Chaîne**: one production line, or all.
- **Équipement**: one machine, or all.
- **Exporter**: downloads the figures as a CSV file, which opens in Excel.

Each figure is compared with the **previous period of the same length**, for example the last 30 days vs the 30 days before. The small coloured badge shows the change: green = better, red = worse.

**The 6 key figures (KPI cards).** Each one has a **"?"** button that shows its explanation in the app.

| Card | What it tells the client | How it is calculated |
|---|---|---|
| **Disponibilité du parc** | % of the time the machines **could produce** | `1 − (downtime hours ÷ (number of machines × hours in the period))`. Example: 38 machines × 30 days × 24 h = 27 360 machine-hours. With 253 h of downtime, availability = 1 − 253/27 360 = **99,1 %**. Only breakdowns on an **identified machine** count, because a breakdown on "the whole line" cannot be attributed to one machine. |
| **Heures d'arrêt** | Total hours machines were **stopped** by breakdowns | For each breakdown: from **declaration** until **completion** (or until now if still open), counted only inside the period. The hint shows the number of breakdowns declared. |
| **Temps moyen de réparation** (MTTR) | How long a repair takes on average | Average of (completion time − start of work) for the breakdowns **completed** in the period. Lower is better. The small line under it shows the **MTBF**. |
| ↳ **MTBF** | How long machines run between breakdowns on average | `(machines × hours − downtime) ÷ number of breakdowns declared`. Higher is better. |
| **Respect du préventif** | Is the planned servicing done on time? | Preventive jobs **due** in the period that were done **within 2 days** of their planned date, ÷ all preventive jobs due. Target: **90 %**. Click to open Préventif. |
| **Interventions ouvertes** | The current backlog (work not finished) | Count of interventions in status À traiter or En cours. **"En retard"** = open preventive jobs past their date, plus open breakdowns older than 48 h. Click to open the filtered list. |
| **Coût de maintenance** | How much maintenance cost in the period | **Labour** (hours logged × technician's hourly rate in DT/h) + **parts** (quantity × unit price at the moment they left the store) + **subcontracting** (external cost entered on the intervention). The bar compares it to the **budget** for the same period. Click to open Budgets. |

**The cards below:**

| Card | Meaning |
|---|---|
| **À traiter maintenant** | Action list: machines stopped, preventive jobs late, requests without a technician. The coloured tag says why; the right column says since when. Click a line to open the intervention. |
| **Interventions déclarées et réalisées** | Two curves per day/week: requests declared vs completed. If "declared" stays above "completed", the backlog grows. |
| **Heures d'arrêt par chaîne** | Which production lines lost the most hours. Click a line to filter the whole dashboard on it. |
| **Pannes les plus fréquentes** | A ranking of breakdown types (Pareto). Fixing the top 2–3 causes usually removes most breakdowns. |
| **Répartition des coûts** | A donut: labour / parts / subcontracting. The centre shows the total in thousands of DT. The subtitle gives the **share of preventive work** in labour hours. |
| **Machines les plus pénalisantes** | The machines with the most downtime hours, number of breakdowns, and hours stopped. Click to open the machine's history. |
| **Alertes** | Points that need a decision: machines stopped, requests without a technician, preventive late, items out of stock / under threshold, late deliveries, purchase requests to approve. Each line opens the right list, already filtered. |

### 5.2 Technician dashboard ("Votre journée de travail")

| Card | Meaning |
|---|---|
| **En cours** | Interventions the technician has started |
| **À démarrer** | Assigned to them, not started yet |
| **Prévues aujourd'hui** (+ "en retard") | Planned for today; "late" = planned date passed and not finished |
| **Heures cette semaine** | Time they logged since Monday |
| **Réalisées sur 30 jours** | Jobs they finished in the last 30 days |
| **Mes interventions** | Their open jobs, with stopped machines and urgent jobs first. Tags: "Arrêt" (machine stopped), "Préventif", urgency. |

### 5.3 Requester dashboard ("Suivi de vos demandes")

| Card | Meaning |
|---|---|
| **Prises en charge** | Their requests a technician is working on |
| **En attente** | Not started yet |
| **Réalisées, à valider** | Work finished, waiting for the supervisor's validation |
| **Réalisées sur 30 jours** | Finished in the last 30 days |
| **Mes demandes en cours** | Their open requests with status and technician |

---

## 6. Planning

**Who:** Superviseur and Technicien. A technician sees only their own jobs.

**What it shows:** a **monthly calendar** of interventions.

- Each intervention is placed on its **planned date** (preventive jobs, or a date set by the supervisor). If there is none, it is placed on its **declaration date** (breakdowns).
- Each badge has the **status colour**: blue = À traiter, orange = En cours, coral = Réalisée, green = Clôturée, red = Annulée.
- A day shows 2 interventions. If there are more, **"+N"** opens the full list of that day.
- Click a badge to open the **side panel**:
  - status and timeline (Déclarée → Affectée → En cours → Réalisée → Clôturée, with dates),
  - the **"À faire"** card with the next action for the current user (assign, accept, finish, validate…),
  - the technician's **compte rendu**,
  - the **Suivi des travaux** (time, parts, checklist, analysis, cost),
  - details, description and attachment,
  - **"Ouvrir la fiche"** for the full page.
- Closed or cancelled badges can be hidden from the calendar (the small ✕). This only hides them in this browser; nothing is deleted.

**Top counters** (current month): Total, Nouveau (= à traiter), En cours, Terminé (= réalisées + clôturées). Each has a "?" explanation.

---

## 7. Interventions

**Who:** everyone. A requester sees only their own requests; a technician sees the ones assigned to them.

### 7.1 The list

- **KPI cards**:
  - **À traiter**: declared, work not started.
  - **En cours**: a technician is working on it.
  - **Réalisées / clôturées**: finished, validated or waiting for validation.
  - **Urgentes en attente**: high urgency, not finished. Do these first.
  - **Total**: everything, cancelled included.
- **Search**: by title, reference ("INT-0042" or just "42"), machine or line. It filters as you type.
- **Filter chip**: when you come from a dashboard alert, for example "Demandes sans technicien", the list is pre-filtered. Click ✕ to remove the filter.
- **Columns**: intervention (title + reference), declaration date and time, type, machine and line, **urgency** tag (red = Haute), **status** dot, requester.
- **Actions**: 👁 open the page, ✎ edit (allowed only while editable), 🗑 delete (supervisor only, with a confirmation dialog).

### 7.2 Create / edit (side panel)

"Nouvelle intervention" opens a panel on the right with three sections:

1. **Où se trouve le problème ?** — line and machine. Choosing the machine fills the line automatically.
2. **De quoi s'agit-il ?**
   - **Type**: breakdown or preventive.
   - **Type de panne**: required only for a breakdown.
   - **Urgence**: Haute = production blocked; Normale = to handle within the day; Basse = can wait.
   - **Titre** and **Description**.
3. **Pièce jointe**: a photo or document, up to 10 MB.

### 7.3 The intervention page ("Fiche intervention")

- **Header facts**: reference, declared on, requester, status, technician, planned date, machine stop yes/no.
- **"À faire" card**: the next workflow action for the person looking at it (see §4).
- **Suivi des travaux** (execution record):
  - **Coût**: labour (DT and hours), parts (DT and number of lines), external (subcontracting), **total**.
  - **Contrôles et étapes**: a checklist, copied automatically from the preventive plan. The technician ticks the steps.
  - **Temps passé**: time entries (start, duration, comment). The supervisor can enter time for any technician.
  - **Pièces consommées**: parts taken from the store. Removing a line returns the part to stock.
  - **Analyse**: cause, remedy, external cost (subcontracting in DT), planned date, estimated duration.
  - **Documents**: files.
- **Imprimer**: prints the record or saves it as PDF.

---

## 8. Maintenance préventive

**Idea:** instead of waiting for breakdowns, machines are serviced regularly (cleaning, lubrication, checks…). A **plan** describes one recurring job on one machine.

### 8.1 A plan contains

| Field | Meaning |
|---|---|
| Intitulé | e.g. "Nettoyage et lubrification hebdomadaire" |
| Machine | the machine to service |
| Fréquence | every N days / weeks / months / years (e.g. every 2 weeks) |
| Durée estimée | used for planning and technician workload |
| Première / Prochaine échéance | the next due date |
| Générer l'OT (jours avant) | how many days **before** the due date the work order is created (e.g. 3 days) |
| Technicien responsable | who receives the work order automatically |
| Consignes | safety, tools… |
| Étapes | the checklist copied into each work order |

### 8.2 How work orders are generated (automatic)

- A background job runs **every hour** on the server. For each active plan whose due date is within its window ("N days before"), it creates the intervention, already **assigned** to the plan's technician, with the checklist. The technician is notified.
- A plan **never** gets two work orders for the same due date.
- If a due date falls on a **Sunday**, the work order is planned for **Monday**.
- If the server was stopped for a while, missed dates are not all created at once: it jumps to the latest due date.
- **"Générer les OT dus"** runs that same generation immediately.
- **"Générer le prochain OT maintenant"** (▶ on a plan) creates the next work order early. It is **refused while the plan's current work order is still open**, so future jobs don't pile up.
- **Suspendre / Réactiver** (⏸): a suspended plan creates nothing.

### 8.3 KPIs of the Préventif page

| KPI | Meaning / calculation |
|---|---|
| **Respect du préventif** | Over the last 90 days: jobs due that were done **within 2 days** of their date ÷ jobs due. The hint shows "X à l'heure sur Y échéances". |
| **Préventifs en retard** | Planned date passed, work not done. |
| **À réaliser sous 7 jours** | Work orders already created for the coming week. |
| **Couverture du parc** | Machines with at least one active plan ÷ all machines. A machine without a plan is only repaired after it breaks. |

**Tabs:**

- **Plans**: the list, with the next due date, technician and the last work order's status.
- **Calendrier**: a month view of the work orders already created (solid) and the **forecasts** of future dates (lighter). A busy day shows "+ N autres", which expands the day.

---

## 9. Équipements

**Who:** Superviseur (full), Technicien (read).

### 9.1 List and KPIs

| KPI | Meaning |
|---|---|
| **Machines du parc** | All registered machines |
| **En service** | Working normally |
| **En panne / arrêt** | A declared breakdown is not repaired yet |
| **Machines critiques** | Machines whose stop blocks production: watch them first |

Columns: machine (name + code), model, line, **état** (green dot = en service, red = en panne, orange = maintenance), **criticité** tag (Critique / Important / Standard).

### 9.2 Create / edit (side panel)

Three sections:

- **Identification**: code (the label on the machine, unique), designation, family, model, group, serial number.
- **Situation dans l'atelier**: line, state, criticality.
- **Dates et coût**: manufacture, purchase, installation and commissioning dates, purchase cost in DT, warranty end. The application checks the order of the dates and that they are not in the future, and shows whether the machine is still under warranty.

### 9.3 Machine page ("Fiche équipement")

Three tabs:

- **Fiche**: the data.
- **Historique et fiabilité**: the machine's own KPIs over 12 months, plus all its interventions (filter: Toutes / Pannes / Préventif) and the parts consumed.
  - **Disponibilité (12 mois)**: the same formula as the dashboard, for this machine only.
  - **Pannes (12 mois)**: number of breakdowns, with the date of the last one.
  - **MTBF / MTTR**: the big number is the MTBF in hours; the line below is the average repair time.
  - **Coût de maintenance**: labour + parts + subcontracting over 12 months, and since the beginning.
- **Documents**: manuals, photos, certificates.

---

## 10. Techniciens

**Who:** Superviseur.

One card per technician, with:

| Item | Meaning |
|---|---|
| **Charge actuelle** | Open interventions assigned to them (À traiter + En cours), and the **estimated hours** of that work |
| En cours / À démarrer | split of that workload |
| **En retard** | their interventions whose planned date has passed |
| Réalisées | finished during the selected period (7 j / 30 j / 90 j / 12 mois) |
| **Heures saisies** | hours they logged during the period |
| **Taux horaire (DT/h)** | the cost of one hour of their work. **This is what turns hours into money** in every cost figure. Example: 12,5 DT/h × 3,2 h = 40 DT of labour. Edit it with ✎. |

> The hourly rate in effect is copied onto each time entry when it is saved, so changing a rate later does not rewrite past costs.

---

## 11. Magasin (store)

**Who:** Superviseur (manage), Technicien (consult, and take parts through interventions).

The store holds **articles**: spare parts, consumables, tools.

### 11.1 KPIs

| KPI | Meaning / calculation |
|---|---|
| **Valeur du stock** | Σ (quantity × unit price) of all active articles, in DT |
| **En rupture** | Tracked articles with **0** in stock (click to list them) |
| **Sous le seuil** | Quantity ≤ the **minimum threshold** (*seuil*): to reorder (click to open Réapprovisionnement) |
| **Sorties sur 30 jours** | Value (DT) of parts that left the store in the last 30 days. The hint shows entries (Entrées). |
| **Stock dormant** | Value of articles in stock that **never left** in 12 months: money sleeping on shelves |

**Stock level of an article:**

- **Rupture**: 0 in stock.
- **Sous le seuil**: quantity ≤ threshold.
- **Disponible**: above the threshold.
- **Non suivi**: no threshold set, and nothing in stock.

An article with **threshold = 0 is not tracked** and never raises an alert.

### 11.2 Tabs

- **Articles**: list, search, filters (type, store, level), CSV export. Click an article to see its detail panel (stock, value, consumption, coverage in months, movement history). From there:
  - **Entrée**: goods in, with a price.
  - **Sortie**: goods out. A manual exit not linked to an intervention **requires a reason**, so everything is traceable.
  - **Inventaire**: set the real counted quantity after a physical count. Reason required.
  - You **cannot take out more than what is in stock**.
- **Mouvements**: the complete history of entries/exits (date, type, quantity, stock after, reason, linked OT or purchase order, user).
- **Réapprovisionnement**: articles under their threshold, with a **suggested quantity**:
  `target − current stock − quantity already on order`, where target = the **maximum stock** if defined, otherwise **2 × the threshold**.
  Tick lines and press **"Créer les bons de commande"**: one draft purchase order is created per supplier.
- **Magasins**: storage places (main store, line stores…).

> Parts taken in an intervention go out of stock **immediately**, at their current unit price. That price is frozen in the intervention's cost.

---

## 12. Achats (purchasing)

**Who:** Superviseur (everything), Technicien (purchase requests only).

### 12.1 The purchasing workflow

```
Technicien / Superviseur          Superviseur                  Supplier            Store
 Demande d'achat (DA) ──► Approuver / Rejeter ──► Bon de commande (BC) ──► Réception ──► stock +
      "Soumise"            "Approuvée"/"Rejetée"    "Brouillon" → "Envoyé"   "Partiellement reçu" / "Reçu"
                                         DA becomes "Commandée"
```

1. **Demande d'achat (DA)**: a technician asks for parts (from the catalogue, or "hors catalogue"), with a reason. Supervisors are notified.
2. The supervisor **approves** or **rejects** it, with a comment. The requester is notified.
3. **Commander**: from an approved DA, the supervisor creates a **Bon de commande (BC)**: supplier, expected delivery date (computed from the supplier's lead time if empty), lines, prices. The BC is saved as **Brouillon** (draft) or **Envoyé** (sent).
4. **Réception**: when goods arrive, the supervisor records the quantities received (and the delivery note number). Catalogue items **enter the store automatically**. A partial delivery gives "Partiellement reçu"; a complete one gives "Reçu".
5. A BC can be **cancelled**, with a reason.

### 12.2 KPIs (supervisor)

| KPI | Meaning |
|---|---|
| **Engagé depuis janvier** | Total of purchase orders sent since 1 January, received or not |
| **À recevoir** | Value of goods ordered but not delivered yet; "en retard" = expected date passed |
| **Demandes à valider** | DAs waiting for approval; hint: approved DAs not ordered yet |
| **Brouillons** | Draft purchase orders not sent yet |

**Fournisseurs** tab: suppliers (contact, lead time in days, punctuality).

---

## 13. Budgets

**Who:** Superviseur.

A budget = an amount in DT per **year**, per **category**, and optionally per **production line**.

There are three categories, the same three parts as the cost: **Main-d'œuvre** (labour), **Pièces** (parts), **Sous-traitance** (subcontracting). One line per year + category + scope; a duplicate is refused.

### KPIs

| KPI | Calculation |
|---|---|
| **Budget {année}** | Sum of all budget lines of the year |
| **Dépensé** | Real cost since January: labour + parts + subcontracting; hint: % of the budget |
| **Reste disponible** | Budget − spent (red if negative) |
| **Projection fin d'année** | `spent ÷ fraction of the year elapsed`. Example: 15 000 DT spent on 1 July (≈ 50 % of the year) → projection ≈ 30 000 DT. |

**Prorata** (on each line): the budget that *should* have been used by today = budget × fraction of the year elapsed. **Écart** = prorata − spent: positive means you are under budget, negative means you are over.

The monthly chart shows spending month by month.

---

## 14. Explorateur de données

**Who:** Superviseur.

A library of **ready-made questions** (about fifty), grouped in 7 themes: Interventions, Équipements, Préventif, Magasin, Achats, Techniciens, Coûts et budgets.

Examples:

- "Machines avec le plus d'arrêts"
- "Coût de maintenance par mois"
- "Heures par technicien"
- "Articles les plus consommés"
- "Respect du préventif par chaîne"

How it works:

- Choose a question, set its **parameters** (period, line, machine, technician, article, supplier, year, top N), and press **Exécuter**.
- The result is shown as a **figure**, a **table**, **bars** or a **curve**, and can be **exported** to CSV.

**Why it is safe and not "AI":** the questions are fixed, written in advance, and they **only read** data. Nothing the user types is turned into a database command, and every query runs in a transaction that is always cancelled at the end, so it can never modify anything.

---

## 15. Rapports (Power BI)

Displays the **Power BI** dashboards published by SIMOTEX. The supervisor sets the links once in **Gérer les rapports**.

- Secure link ("Incorporer → Site web ou portail"): each user signs in with their Power BI account.
- "Publier sur le web" link: public, only for non-confidential data.
- **Power BI needs the Internet.** This is the only part of the GMAO that does; without Internet, the page says so and everything else keeps working.

---

## 16. Paramètres (settings), Journal, Notifications

### Paramètres (Superviseur)

- **Utilisateurs et rôles**:
  - counts per role,
  - **Gérer les utilisateurs**: create an account (first name, last name, email, password, role) and edit or delete it.
  - A deleted account can no longer log in, and its open interventions go back to "to assign".
- **Your account**: name, email, role, application version.
- **Administration des modules**: shortcuts to stores, suppliers, technicians and rates, preventive plans, budgets, Power BI, journal.
- **Données de référence**: the **choice lists** used in forms. Changing them updates every form.
  - Équipements: criticality, state, family, group, brand, model.
  - Interventions: intervention state, intervention type, urgency levels, **production lines**, breakdown types.
  - Magasin: part families, manufacturers, part criticality.

### Journal d'activité

Who did what, and when: declarations, assignments, acceptances, refusals, completions, closures, cancellations, deletions, stock movements, preventive generation… It can be searched and exported.

### Notifications (the bell 🔔)

Sent automatically. The number on the bell = unread notifications.

| Event | Who is notified |
|---|---|
| New request declared | Supervisors |
| Intervention assigned / reassigned | The technician (and the previous one) |
| Intervention started | Supervisors + requester |
| Intervention refused (with reason) | Supervisors |
| Intervention finished | Supervisors ("attend votre validation") |
| Sent back to the technician | The technician |
| Intervention closed | Technician + requester |
| Intervention cancelled | Technician / supervisors / requester as relevant |
| Preventive work order generated | The plan's technician |
| New purchase request / decision | Supervisors / the requester |

### Help everywhere

- The **"?"** next to each figure explains it in plain words.
- Deletions always ask for confirmation in the application's own dialog.

---

## 17. How the modules feed each other

```
                         ┌──────────────── Préventif (plans) ───────────────┐
                         │ creates work orders automatically                 │
                         ▼                                                   │
Demandeur ──declares──► INTERVENTIONS ◄──assign/accept/finish/close──► Techniciens
                         │   │    │                                          ▲
     machine state ◄─────┘   │    └──► time × hourly rate (DT/h) = labour ───┘
     (Équipements)           │
                             └──► parts taken ──► MAGASIN (stock −)
                                                    │ under threshold
                                                    ▼
                                    Réapprovisionnement / Demande d'achat
                                                    ▼
                                         ACHATS: BC ──► Réception ──► MAGASIN (stock +)

Labour + parts + subcontracting ──► Coût ──► BUDGETS, Tableau de bord, Explorateur, Power BI
Every action ──► Journal d'activité, Notifications
```

---

## 18. Glossary of every KPI and how it is calculated

| KPI | Formula | Read it as |
|---|---|---|
| Downtime (heures d'arrêt) | Σ over breakdowns with a machine: (completion or now) − declaration, clipped to the period | Hours of production lost |
| Availability (disponibilité) | 1 − downtime ÷ (machines × 24 h × days) | Higher is better; 99 % means machines were available 99 % of the time |
| MTTR | average (completion − start of work) of breakdowns completed in the period | Lower is better |
| MTBF | (machines × hours − downtime) ÷ breakdowns declared | Higher is better |
| Preventive compliance | due jobs done ≤ 2 days late ÷ due jobs | Target ≥ 90 % |
| Coverage | machines with ≥ 1 active plan ÷ machines | Higher is better |
| Backlog | open interventions (À traiter + En cours) | Should stay stable or decrease |
| Late (dashboard) | open preventive past its date + open breakdown > 48 h | Should be 0 |
| Labour cost | Σ minutes ÷ 60 × hourly rate (DT/h) | In DT |
| Parts cost | Σ quantity × unit price at issue | In DT |
| Maintenance cost | labour + parts + subcontracting | In DT |
| Stock value | Σ quantity × unit price | In DT |
| Dormant stock | value of articles in stock with no exit in 12 months | Money immobilised |
| Suggested reorder | (max stock, or 2 × threshold) − stock − on order | Quantity to buy |
| Budget prorata | budget × fraction of year elapsed | What should be spent by today |
| Year-end projection | spent ÷ fraction of year elapsed | Expected spend on 31 Dec |
| Δ vs previous period | (current − previous); "pt" for percentages | Green = better |

---

## 19. Questions the client may ask

- **"Why is availability so high when we had many breakdowns?"** Availability is computed over **all** machines and **24 h a day**. With 38 machines, one machine stopped for a whole day is only 24 h out of 912 machine-hours per day (≈ 2,6 %). Use "Heures d'arrêt" and "Machines les plus pénalisantes" to see the real impact.
- **"Why doesn't a breakdown declared on 'toute la chaîne' count in availability?"** Because the stop cannot be attributed to a specific machine. Encourage requesters to choose the machine.
- **"Where does the labour cost come from?"** From the time logged by technicians multiplied by their hourly rate (Techniciens page). If time is not logged, the labour cost is 0.
- **"Can a technician close their own work?"** No: they mark it "Réalisée", and only a supervisor validates and closes it.
- **"What if a technician is sick?"** The supervisor reassigns from the intervention page. If an account is deleted, its open work goes back to "to assign".
- **"Does it work without Internet?"** Yes, everything except the Power BI page. All fonts and icons are inside the application.
- **"Is the data safe?"** Every action requires a login and is checked by the server; every action is logged; passwords are stored encrypted (hashed); 5 failed login attempts lock the account for 15 minutes.

---

# PART B — TECHNICAL SIDE

## 20. Architecture overview

```
┌──────────────────────────── Browser (PC, tablet, phone) ────────────────────────────┐
│  Angular application (HTML/CSS/TypeScript compiled to JavaScript)                  │
└───────────────▲─────────────────────────────────────────────────────────────────────┘
                │ HTTP (JSON) + session cookie
┌───────────────┴──────────── nginx (web server / reverse proxy) ────────────────────┐
│  serves the Angular files, forwards /api/... to the API                            │
└───────────────▲─────────────────────────────────────────────────────────────────────┘
                │
┌───────────────┴──────────── ASP.NET Core Web API (.NET 9, C#) ─────────────────────┐
│  Controllers (endpoints) → Services (business rules) → Entity Framework Core       │
│  Background job: preventive generation every hour                                  │
└───────────────▲─────────────────────────────────────────────────────────────────────┘
                │ SQL
┌───────────────┴──────────── SQL Server database "gmao" ─────────────────────────────┐
│  tables: users, interventions, machines, articles, movements, plans, purchases…     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

This is a classic **3-tier architecture**:

- **Presentation**: Angular, in the browser.
- **Business logic**: the API.
- **Data**: SQL Server.

The browser never talks to the database directly. It always goes through the API, which checks who you are and what you are allowed to do.

---

## 21. Technologies used, and what each term means

| Layer | Technology | In simple words |
|---|---|---|
| Frontend | **Angular 16** | A Google framework to build single-page applications: the page never fully reloads, Angular swaps components. |
| | **TypeScript 5** | JavaScript with types (you declare that `id` is a number), so errors are caught at compile time. |
| | **RxJS** | A library for asynchronous streams ("Observables"): an HTTP call returns an Observable you `subscribe` to. |
| | **SCSS** | CSS with variables and nesting. |
| | **Standalone components** | Each component declares its own imports (no big NgModule). |
| | **@fontsource** | The fonts (Public Sans) shipped inside the app: no Google Fonts, works offline. |
| Backend | **.NET 9 / ASP.NET Core** | Microsoft's framework for web servers in **C#**. |
| | **Web API / REST** | The server exposes URLs ("endpoints") like `GET /api/demandeintervention/42` that return **JSON**. |
| | **Entity Framework Core 9** | An **ORM** (Object-Relational Mapper): you write C# classes and LINQ queries, and EF translates them to SQL. |
| | **LINQ** | C# query syntax: `context.Equipments.Where(e => e.IsDeleted == false)` |
| | **ASP.NET Core Identity** | The built-in user, password and role system (hashing, lockout, cookies). |
| Database | **SQL Server (Express)** | Microsoft's relational database. |
| | **Migrations** | Versioned scripts that create or alter tables; applied automatically at startup. |
| Infra | **nginx** | A web server; serves the Angular files and forwards `/api` to the backend (**reverse proxy**). |
| | **Docker / docker-compose** | Optional packaging of each part in a container (not required for the manual install). |
| Reports | **Power BI** | Microsoft's BI tool, embedded in an iframe. |
| Tests | **Python** (API tests), **Node.js + Microsoft Edge headless** (browser tests) | See §28. |

---

## 22. Backend: projects, controllers, services

The C# solution (`gmao.sln`) has **3 projects**. This separation is called a *layered* or *clean* architecture:

| Project | Role | Contains |
|---|---|---|
| **Core** | The domain: what the business *is* | **Entities** = C# classes mapped to tables: `DemandeIntervention`, `Equipment`, `Piece`, `PlanPreventif`, `BonCommande`, `Budget`, `Users`… |
| **Infrastructure** | How data is stored | `StoreContext` (the EF **DbContext** = the gateway to the database), configurations (keys, relations, default data), **Migrations** |
| **API** | How the outside world talks to the app | **Controllers**, **Services**, DTOs, security, `Program.cs` (startup) |

### 22.1 Controllers (one per area)

A **controller** is a C# class whose methods answer HTTP requests. Example: `[HttpPost("{id}/assign")]` on `DemandeInterventionController` answers `POST /api/DemandeIntervention/42/assign`.

| Controller | Endpoints for |
|---|---|
| `AccountController` | login, logout, current user (`user-info`), register user, password reset |
| `UsersController` | user list, edit, delete (releases open work), technicians list, roles |
| `DemandeInterventionController` | interventions: list (search, filters `vue=`), create, edit, delete, assign, accept, reject, status changes, cancel, calendar, dashboard stats, file download |
| `InterventionSuiviController` | execution record: checklist, time entries, parts, analysis, cost |
| `PilotageController` | supervisor dashboard (all KPIs) and personal dashboard (`mon-travail`) |
| `PreventifController` | plans, calendar, KPIs, generation |
| `EquipmentController`, `EquipementHistoriqueController` | machines, machine KPIs and history |
| `MagasinController`, `FournisseursController` | articles, movements, reorder, stores, suppliers |
| `AchatsController`, `BudgetsController` | purchase requests and orders, reception, budgets |
| `TechniciensController` | team workload and hourly rates |
| `ExplorateurController` | question catalogue and execution |
| `JournalController`, `NotificationController`, `PiecesJointesController`, `ParametresController` | journal, notifications, attachments, settings (Power BI links) |
| Reference controllers (`PanneController`, `UrgenceController`, `ChaineProductionController`, `MarqueController`…) | the choice lists |

### 22.2 Services (business rules shared by controllers)

A **service** is a class that holds logic used in several places. Services are registered in `Program.cs` and given to controllers automatically through **dependency injection**: the controller asks for `IStockService` in its constructor and ASP.NET provides it.

| Service | What it does |
|---|---|
| `InterventionEffectsService` | Side effects of the workflow: sets machines **En panne / En service**, returns parts to stock on cancel or delete, writes audit entries |
| `StockService` | Every stock movement (entry, exit, adjustment) with the "stock after" value and checks (no negative stock) |
| `PreventifService` + `PreventifHostedService` | Work order generation from plans (+ the hourly background job) |
| `JournalService` | Writes the activity journal |
| `CurrentUserService` | "Who is calling?": user id, role, technician or not |
| `ExplorateurService` + `ExplorateurCatalogue` | The ~50 read-only questions and their safe execution |
| `EmailService` | Emails (password reset) |
| `DemoDataSeeder` | Optional demo data (textile factory) |

**Scoped** (`AddScoped`) means one instance per HTTP request; **hosted service** means it runs in the background for the life of the server.

### 22.3 DTO

A **DTO** (*Data Transfer Object*) is a small class describing the JSON the API receives or sends. Example: `InterventionDto` = the fields of the "declare" form. It keeps the API contract separate from the database entities.

---

## 23. Frontend: structure, services, guards, interceptors

```
client/src/app/
├── core/                 shared "plumbing", loaded once
│   ├── services/         auth, API calls, notifications, confirmation dialog, reference lists
│   ├── guards/           auth.guard (logged in?), role.guard (right role?)
│   ├── interceptors/     auth (401 → back to login), error (logging)
│   └── models/           TypeScript interfaces of the data (DemandeIntervention, Equipment…)
├── shared/               reusable UI
│   ├── layout/           the sidebar, top bar, notifications bell, global search (Ctrl K)
│   ├── components/       page-header, app-icon, charts, help "?", confirm dialog, article picker, toasts
│   ├── styles/           gm-ui.scss: the design system (cards, KPIs, tables, drawers, tags…)
│   └── utils/            formatting (dates, DT, minutes), CSV export, debounce
├── features/             one folder per module (dashboard, interventions, planning, preventif,
│                         equipment, techniciens, magasin, achats, budgets, explorateur,
│                         rapports, settings, auth…)
└── app.routes.ts         URL → component map, with guards
```

| Term | Meaning |
|---|---|
| **Component** | A piece of screen = a TypeScript class + an HTML template + styles, e.g. `InterventionsComponent` is the list page. |
| **Template binding** | `{{ value }}` shows data; `[disabled]="busy"` binds a property; `(click)="save()"` binds an event; `*ngIf` / `*ngFor` show conditionally or repeat. |
| **Service** (Angular) | A class shared by components, e.g. `InterventionService` (HTTP calls for interventions) or `AuthService` (current user). Injected like on the backend. |
| **Routing** | `app.routes.ts` maps URLs to components. `interventions/new` is a **child route** of `interventions`, which is why the form opens as a side panel over the list. |
| **Guard** | A check before entering a route: `authGuard` (not logged in → `/login`), `roleGuard` (wrong role → dashboard). |
| **Interceptor** | Code that sees every HTTP request/response. `authInterceptor`: on **401** (session expired) it clears the user and goes back to login. `errorInterceptor`: logs errors. |
| **Observable / subscribe** | `this.api.getX().subscribe(data => …)`: the HTTP call runs, and the callback receives the data. |
| **Reactive forms** | Forms defined in code (`FormGroup`, `Validators.required`), with validation messages. |
| **Debounce** | Wait 300 ms after the last key before searching, to avoid one request per key. |

---

## 24. Security

- **Authentication**: login with email + password, checked by ASP.NET Identity. Passwords are **hashed** (never stored readable). The server answers with an **HttpOnly cookie** `gmao.session`, which JavaScript cannot read (protection against XSS theft). It is valid for 12 h and renewed while active.
- **Authorization**:
  - A **fallback policy**: every endpoint requires a logged-in user unless explicitly public.
  - **Roles** on endpoints (`[Authorize(Roles = "Superviseur")]`) and the `SupervisorWrites` attribute (read for all, write for supervisors).
  - **Data scoping**: a requester only gets their own requests and a technician their assigned work; this is filtered on the server.
- **Lockout**: 5 failed logins → 15 min lock. **Rate limiting**: max 10 login attempts per minute per IP.
- **Deactivated or deleted accounts**: refused at login; open sessions are cut on the next call.
- **CORS**: only the Angular origin may call the API (in development).
- **Explorateur**: fixed SQL, parameters only, transaction always rolled back; optional read-only database account.
- **Audit**: the journal records every important action.

---

## 25. A request from click to database (technical workflow)

Example: the supervisor clicks **"Affecter"**.

1. **Angular**: `InterventionActionsComponent.assignTechnician()` calls `InterventionService.assignTechnician(id, techId)`.
2. That service sends `POST /api/demandeintervention/42/assign` with body `{ "technicianId": "15" }`. The browser adds the session cookie automatically.
3. **nginx** forwards `/api/...` to the API.
4. **ASP.NET Core** middleware pipeline: forwarded headers → CORS → **authentication** (reads the cookie, identifies the user) → **authorization** (checks the "Superviseur" role) → routing to the controller method.
5. **`DemandeInterventionController.Assign`**:
   - loads the intervention with **EF Core** (`await _context.DemandeInterventions.FirstOrDefaultAsync(...)`),
   - checks the business rules (status allows it, the technician exists and is active),
   - sets `DestinatairesID`, `DateAssignation`, writes the **journal**, creates the **notification**,
   - `SaveChangesAsync()`: EF generates the SQL `UPDATE`/`INSERT` and runs it in **SQL Server**,
   - the effects service recalculates the machine state.
6. The API returns **200 OK** with JSON.
7. **Angular** shows a success toast, the component emits `updated`, and the page reloads the intervention: the "Affectée" step lights up.
8. A few seconds later, the technician's bell shows the new notification (the app checks regularly).

---

## 26. Database and migrations

- One SQL Server database, `gmao`.
- Main tables:
  - `DemandeInterventions`
  - `InterventionTemps`, `InterventionPieces`, `InterventionTaches`
  - `Equipments`
  - `Pieces` (articles), `MouvementsStock`, `Magasins`, `Fournisseurs`
  - `PlansPreventifs`, `PlanPreventifTaches`
  - `DemandesAchat`, `BonsCommande` and their lines
  - `Budgets`
  - `JournalActivites`, `Notifications`, `PiecesJointes`
  - `Users` + the Identity tables (`AspNetUsers`, `AspNetRoles`…)
  - all the reference lists
- **Migrations** (e.g. `GmaoModulesPro`, `AccentsStatuts`) are applied automatically when the API starts (`MigrateAsync`). They are additive: existing data is kept.
- **Soft delete**: "deleting" an intervention or a machine sets `IsActif = false` / `IsDeleted = true` instead of erasing it, so history and KPIs stay correct.

---

## 27. Background jobs

`PreventifHostedService` starts with the API, waits 30 s, then every **hour** runs the preventive generation (§8.2).

The browser also refreshes notifications periodically.

---

## 28. Tests

| Suite | Tool | Checks |
|---|---|---|
| `tests/api_tests.py` | Python, HTTP calls | **137** checks: authentication and rights, intervention lifecycle, preventive, store, purchasing, budgets, all Explorateur questions, dashboard, planning, business rules, Power BI, regressions |
| `tests/e2e/*.mjs` | Node.js driving **Microsoft Edge in headless mode** through the **Chrome DevTools Protocol (CDP)** | Clicks through the real screens like a user: every page of every role (`pages`), the full workflow (`workflow`), préventif/magasin/achats (`modules`), equipment, users, references, budgets, dashboard links (`admin`) |
| `tests/e2e/cleanup.sql` | SQL | Removes data created by the browser tests |

"Headless" = the browser runs without a window. CDP = the protocol DevTools uses, which lets a script click, type and read the page.

---

## 29. Deployment

See `DEPLOIEMENT-VERSION-2.md`. In short:

1. **Back up** the database.
2. Build the API (`dotnet publish`) and the client (`ng build`).
3. Configure the connection string and the server time zone (Tunis).
4. Serve the client with nginx (proxying `/api`).
5. Start the API: migrations apply themselves.
6. Optionally load demo data, then remove it with `database/demo-cleanup.sql` before real use.

---

## 30. Technical glossary

| Term | Meaning |
|---|---|
| API | Application Programming Interface: the set of URLs the frontend calls |
| REST | Style of API using URLs + HTTP verbs: GET read, POST create/action, PUT/PATCH update, DELETE |
| JSON | Text format for data: `{ "titre": "Fuite", "statusId": 1 }` |
| HTTP status | 200 OK, 204 OK without body, 400 bad request (validation), 401 not logged in, 403 not allowed, 404 not found, 429 too many requests, 500 server error |
| Endpoint | One URL + verb, e.g. `GET /api/pilotage?days=30` |
| ORM | Object-Relational Mapper (EF Core): C# objects ↔ SQL tables |
| DbContext | EF's entry point to the database (`StoreContext`) |
| Entity | A C# class stored in a table |
| Migration | A versioned change of the database schema |
| Dependency injection | The framework creates and passes the services a class needs |
| Middleware | Steps every request passes through (auth, CORS, logging…) |
| Cookie (HttpOnly) | Small value stored by the browser and sent with each request; HttpOnly = not readable by JavaScript |
| Hash | One-way transformation of a password; it cannot be reversed |
| CORS | Browser rule about which websites may call an API |
| Reverse proxy | A server (nginx) that receives requests and forwards them to another server |
| SPA | Single-Page Application: one HTML page; the framework swaps views |
| Component / Template | Angular screen piece / its HTML |
| Observable | An asynchronous stream of values (RxJS) |
| Guard / Interceptor | Angular checks before a route / hooks on every HTTP call |
| Debounce | Wait for a pause before acting (search as you type) |
| CSV | Comma (here semicolon) separated values, opens in Excel |
| Soft delete | Mark as deleted instead of erasing |
| Idempotent | Running it twice gives the same result (preventive generation never duplicates) |
| Transaction / rollback | A group of DB changes applied all together, or cancelled all together |
| Headless browser / CDP | A browser without a window / the protocol to control it from a script |
| CI/CD | Automated build/test/deploy pipelines (not set up yet; the tests are ready for it) |
