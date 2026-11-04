# SIMOTEX GMAO — Complete guide to the application

This guide explains what every part of the application does, what every number means and how it is calculated, and how the application is built. Part A is for presenting the application to SIMOTEX. Part B is the technical side.

Screen names and labels are written in French, exactly as they appear in the application, so you can point at them during a demo.

> **Version 3 (November 2026), what is new for users:**
> - Supervisor dashboard: a short **"À retenir"** summary that says what to do; a **"?"** on every figure, with the calculation done on your own numbers; changes written as sentences ("+42 % par rapport aux 30 jours précédents") with a colour legend; every card opens the list of interventions behind it.
> - **Rapport mensuel**, ready to print or save as PDF.
> - **Étiquettes QR** to stick on the machines. Scanning one opens "Déclarer une panne" with the machine already filled in.
> - Simpler breakdown form: type and urgency pre-filled, title proposed, photo button in French.
> - Interventions list: filters (status, type, line, period) and **Excel export**. Equipment list: Excel export.
> - Tablet: larger buttons (44 px), the next step as one big button, quick durations (15 min, 30 min, 1 h, 2 h).
> - **Aide** page (how to, KPIs explained, glossary, FAQ) and a **guided tour** for each role on first login.
> - Requesters now see the notification bell. The technician role is shown as "Technicien".

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

> The technician role is called "Utilisateur" in the database for historical reasons. Since version 3 the screens show **"Technicien"** (sidebar card, user menu); the database name is unchanged.

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
- **Plus d'actions** (top right, next to "Déclarer une panne"): **Rapport mensuel à imprimer** (§5.4) and **Exporter les chiffres (Excel)**: the figures plus the "À retenir" points, as a CSV file.

**Reading order of the page (UI pass of November 2026).** Top to bottom: "À retenir" → the 4 key figures → what to handle now and the alerts → four charts that each answer a question → the detail, folded. One message per block.

**"À retenir" (what to remember).** The first block of the page: 1 to 5 sentences, most urgent first, each with **what to do** and a **"Voir"** button that opens the right screen with the same period and line. It is built from fixed rules, not AI:

| Rule | Fires when | Example |
|---|---|---|
| Machines stopped now | at least one machine is stopped by an open breakdown | "1 machine est à l'arrêt en ce moment." |
| Requests without a technician | at least one | "2 demandes attendent un technicien." |
| Downtime concentrated on a few machines | the top 3 machines make ≥ 50 % of the downtime (or one machine ≥ 40 %) | "3 machines cumulent 55 % des heures d'arrêt de ces 30 jours (CB-04, CB-01, CA-02)." |
| One line hit hardest | one line has ≥ 40 % of the downtime | "La chaîne Couture B concentre 48 % des heures d'arrêt." |
| Main cause | one breakdown type is ≥ 30 % of the breakdowns (3 or more) | "« Panne électrique » est la première cause de panne : 6 sur 17 (35 %)." |
| Downtime trend | +20 % and at least +2 h vs the previous period (or −20 %: good news) | "Les heures d'arrêt augmentent : 62 h contre 44 h…" |
| Repairs getting longer | MTTR +20 % and at least +15 min | "Les réparations durent plus longtemps : 1,6 h en moyenne contre 1,2 h…" |
| Preventive behind | compliance < 90 % (red under 75 %) | "Respect du préventif : 80 % (objectif 90 %), 2 préventifs en retard." |
| Budget | year-end projection > annual budget (or period cost > 110 % of its budget) | "Au rythme actuel, le budget annuel (34 000 DT) sera dépassé d'environ 3 735 DT…" |
| Stock | at least one article out of stock | "1 article est en rupture de stock." |

If no rule fires: "Rien d'anormal sur ces 30 jours." The rules are in `API/Services/Kpi/SyntheseRegles.cs` and covered by unit tests.

**"Les chiffres clés" — 4 cards, one message each.** The figures a maintenance manager checks every morning: **Disponibilité du parc**, **Heures d'arrêt**, **Interventions ouvertes**, **Respect du préventif**. Each card shows, and only shows:

1. the label and the **"?"**;
2. the figure, large, with its unit;
3. its **level in words and colour**: "Bon niveau (objectif 98 %)", "À surveiller (objectif 98 %)", "Sous l'objectif de 90 %", "3 en retard"…;
4. its **trend in words and colour**, compared with the **previous period of the same length**: "Mieux · +3 points par rapport aux 30 jours précédents", "Moins bien · +85 % par rapport aux 30 jours précédents", "Stable par rapport…". Green = better, red = worse, grey = stable: the words say it too, so colour is never the only signal. A change too small to mean anything is "stable": under half a point of availability, under 3 points of preventive compliance, under 5 % for the other figures. The trend is hidden when the previous period has fewer than 5 interventions (not enough history).

**"Voir plus d'indicateurs"** (link under the cards) shows three more cards with the same pattern: **Temps moyen de réparation (MTTR)**, **Temps moyen entre deux pannes (MTBF)** and **Coût de maintenance** (level = share of the budget of the period).

**The "?" button on every card** opens a short explanation: what the figure means (one sentence), the formula in words, **the calculation with the numbers on screen**, what a good or bad value is for a garment workshop, and which way is better. The texts are in `client/src/app/shared/kpi/kpi-definitions.ts`. The Aide page shows them too.

**Clicking a card** opens the list of the interventions behind the figure, filtered on the same period, line and machine, with a banner saying what is shown. This answers "why is this number high?".

| Card | What it tells the client | How it is calculated | Click opens | Good value (garment workshop) |
|---|---|---|---|---|
| **Disponibilité du parc** | % of the time the machines **could produce** | `1 − downtime ÷ (machines × hours of the period)`. Example: 26 machines × 716,9 h = 18 639 machine-hours; 61,6 h of downtime → 1 − 61,6 ÷ 18 639 = **99,7 %**. Only breakdowns on an **identified machine** count. | Machine stops overlapping the period | ≥ 98 % "Bon niveau", 95–98 % "À surveiller", < 95 % "Sous l'objectif" |
| **Heures d'arrêt** | Hours machines were **stopped** by breakdowns | Per machine, from **declaration** to **completion** (or now), clipped to the period. **Two requests open at the same time on the same machine count once** (since version 3). | Machine stops overlapping the period | Lower is better; watch the trend |
| **Temps moyen de réparation** (MTTR) — under "Voir plus" | How long a repair takes | `total repair time ÷ number of repairs`, repair = completion − start of work, for breakdowns completed in the period. | Breakdowns repaired in the period | Sewing machine: < 1 h good, 1–2 h usual, > 2 h often a missing part |
| **Temps moyen entre deux pannes** (MTBF) — under "Voir plus" | How long a machine runs between breakdowns | `(machines × hours − downtime) ÷ breakdowns declared`. Hours are counted 24/7: compare periods rather than absolute values. | Breakdowns of the period | Higher is better |
| **Respect du préventif** | Is planned servicing done on time? | Jobs **due** in the period done **within 2 days** of their date ÷ jobs due. The "?" shows "39 faits à temps sur 49 prévus". | Preventive jobs due in the period | ≥ 90 % "Objectif atteint", 75–90 % "À surveiller", < 75 % "Sous l'objectif" |
| **Interventions ouvertes** | The backlog **right now** | À traiter + En cours. **En retard** = preventive past its date + breakdown open > 48 h. | Late interventions (or all open ones) | Stable; ~20 open is normal for 4 technicians |
| **Coût de maintenance** — under "Voir plus" | What maintenance cost in the period | Labour (hours × rate DT/h) + parts (quantity × price at issue) + subcontracting. The level compares it with the **budget for the same duration** (annual budget × days ÷ 365). | Budgets | Under 100 % of the period budget |

**What to handle now:**

| Card | Meaning |
|---|---|
| **À traiter maintenant** | Action list: machines stopped, preventive jobs late, requests without a technician. The coloured tag says why; the right column says since when. |
| **Alertes** | Points that need a decision now. Each line opens the right list, already filtered. |

**"Comprendre les arrêts" — four charts, each answering one question.** Values are written on the bars and at the end of the lines, so there is no legend to decode.

| Question (title of the chart) | What it shows | Click |
|---|---|---|
| **Quelles machines tombent le plus en panne ?** | The 6 machines with the most downtime hours: code, name, number of breakdowns. | Opens the machine's history |
| **Pourquoi tombent-elles en panne ?** | Number of breakdowns per cause, with the share and the **cumulative share** (Pareto: treat the first lines first). | Opens the breakdowns of that cause |
| **Quelles chaînes perdent le plus de temps ?** | Downtime hours per production line. | Filters the whole dashboard on that line |
| **Le travail en attente augmente-t-il ?** | Interventions declared and completed, **per week** over 30 days (per day over 7 days). If "Déclarées" stays above "Réalisées", the backlog grows. | — |

**"Voir le détail" (folded, at the bottom):** **Où part l'argent ?** (donut labour / parts / subcontracting, share of preventive work in the hours logged) and **Machines les plus pénalisantes** (downtime, cumulative share and maintenance cost per machine; click to open the history).

**First login:** a **guided tour** (about one minute) shows "À retenir", the "?", how to read a card, Interventions, Préventif, the "Plus d'actions" menu and Aide. It can be replayed from the user menu or the Aide page.

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
| **Mes demandes en cours** | Their open requests with status and technician. When there is none, a "Déclarer une panne" button is shown. |

### 5.4 Rapport mensuel (supervisor)

Button **"Rapport mensuel"** on the dashboard (address `/rapport-mensuel`). Choose a month (the month just finished is selected), then **"Imprimer ou PDF"**: the browser prints the report; to get a PDF choose "Enregistrer au format PDF" as the printer. It works without Internet.

Content on A4: "À retenir"; the indicators of the month vs the previous **calendar month** with the change, the target and a one-line definition; Pareto of causes; downtime per line; most penalising machines with their cost; costs of the month vs budget; machines that cost the most. The figures are exactly those of the dashboard (same calculation).

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

**Top counters** (month shown), with the same names as the statuses everywhere else: **Ce mois-ci**, **À traiter**, **En cours**, **Réalisées ou clôturées**.

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
- **Filters**: status, type ("Pannes avec arrêt", "Correctif", "Préventif"), line (not for requesters), declaration period (7, 30, 90 days, this month). "Effacer les filtres" resets everything. The filters are kept in the address, so the browser's back button keeps them.
- **Dashboard banner**: when you come from a dashboard card, a blue banner says in words what the list shows, e.g. "Arrêts machine de la période (heures d'arrêt, disponibilité) — du 05/10/2026 au 03/11/2026 · chaîne Couture B". "Retirer ce filtre" removes it.
- **Exporter**: the **whole** filtered list (not only the page), as a CSV file Excel opens directly: reference, title, dates, type, breakdown type, line, machine, urgency, status, requester, technician, machine stop, cause, remedy.
- **Lines per page**: 10, 25, 50 or 100 (at the bottom).
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
3. **Pièce jointe**: a photo or document, up to 10 MB, with the button **"Ajouter une photo ou un document"** (on a tablet it offers the camera).

To make declaring faster (version 3):

- the **type** is pre-filled with corrective maintenance and the **urgency** with "Normale"; whoever knows better changes them in one tap;
- the **title** is proposed from the breakdown type and the machine ("Casse aiguille — CB-04") until the user types their own;
- from a **QR label** (§9.4), the machine and its line are already filled in and a note confirms it: only the breakdown type and a sentence remain.

### 7.3 The intervention page ("Fiche intervention")

- **Header facts**: reference, declared on, requester, status, technician, planned date, machine stop yes/no.
- **"La demande"** (consultation): the request in a few lines instead of a greyed-out form — title, full description, then machine, line, type, breakdown, urgency and attachment as label and value, and the technician's report with the photos once the job is done. **"Modifier"** in the header opens the form when the request can still be changed (supervisor until closed, requester until someone takes it on).
- **"À faire" card**: the next workflow action for the person looking at it (see §4), as **one large button** (full width on a tablet). For the technician, a reminder lists what to do before finishing: time, parts, checklist, then the report.
- **Suivi des travaux** (execution record):
  - **Coût**: labour (DT and hours), parts (DT and number of lines), external (subcontracting), **total**.
  - **Contrôles et étapes**: a checklist, copied automatically from the preventive plan. The technician ticks the steps.
  - **Temps passé**: time entries (start, duration, comment). Quick buttons **15 min, 30 min, 1 h, 2 h** fill the duration and the start time in one tap. The supervisor can enter time for any technician.
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
- **Plus d'actions → "Créer maintenant les OT dont l'échéance approche"** runs that same generation immediately (rarely needed: it runs by itself every hour). The main button of the page is **Nouveau plan**.
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

Buttons: one main button, **Nouvel équipement** (supervisor). The rest is in **Plus d'actions**: **Exporter la liste (Excel)** and **Imprimer les étiquettes QR** (§9.4). A technician sees only **Exporter**.

### 9.2 Create / edit (side panel)

Three sections:

- **Identification**: code (the label on the machine, unique), designation, family, model, group, serial number.
- **Situation dans l'atelier**: line, state, criticality.
- **Dates et coût**: manufacture, purchase, installation and commissioning dates, purchase cost in DT, warranty end. The application checks the order of the dates and that they are not in the future, and shows whether the machine is still under warranty.

### 9.3 Machine page ("Fiche équipement")

Header: **Modifier** (supervisor, opens the form), **Imprimer**, **Retour**. Three tabs:

- **Fiche**: a reading view, not a form. At the top the code, the name, the line, the **state** and the **importance** as tags. Below, label and value: family, model, group, serial number; commissioning, purchase (with the cost), installation and manufacture dates in **dd/mm/yyyy**; the warranty in words ("Sous garantie jusqu'au …" or "Garantie expirée", in red). An empty field says "Non renseigné".
- **Historique et fiabilité**: the machine's own KPIs over 12 months, plus all its interventions (filter: Toutes / Pannes / Préventif) and the parts consumed.
  - **Disponibilité (12 mois)**: the same formula as the dashboard, for this machine only.
  - **Pannes (12 mois)**: number of breakdowns, with the date of the last one.
  - **MTBF / MTTR**: the big number is the MTBF in hours; the line below is the average repair time.
  - **Coût de maintenance**: labour + parts + subcontracting over 12 months, and since the beginning.
- **Documents**: manuals, photos, certificates.

### 9.4 Étiquettes QR (supervisor)

Address `/equipment/etiquettes`. One label per machine: QR code, machine code in large print, designation, line, "Panne ? Scannez ce code". Two labels per row on A4.

1. Check the **address** at the top: it must be the one the tablets use, e.g. `http://SRV-TN-BI:5091`. If the page was opened on the server itself as `localhost`, a warning asks to change it, otherwise the codes would not open on the phones.
2. Choose a line or keep all machines, untick the labels you do not want.
3. **Imprimer**, then stick each label on its machine. Test one label with a phone first.

Scanning with the phone's **own camera app** opens `…/interventions/new?machine=<id>`: after login, "Déclarer une panne" opens with the machine filled in. This works on plain HTTP because the page never uses the camera itself. The QR codes are generated in the browser (no Internet).

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

Buttons: for the supervisor, the main button is **Bon de commande**; **Nouvelle demande d'achat** is in **Plus d'actions**. A technician has a single button, **Demande d'achat**.

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

The header shows how much of the year has passed, by days, e.g. "84 % de l'année écoulée (307 jours sur 365)" (before version 3 it showed the month number, "11 mois écoulés", which was misleading on 3 November).

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

Arranged by **what you want to do**, not by database table. Four groups, each with a one-line description, its usual settings first, and the rare ones folded under **"Autres réglages (n)"**:

| Group | Usual settings | Under "Autres réglages" |
|---|---|---|
| **Utilisateurs et accès** — who can log in, and what each person can do. Shows "9 comptes : 1 superviseur, 4 techniciens, 4 demandeurs". | **Utilisateurs** (create an account, change a role, deactivate), **Techniciens et taux horaires** | Journal d'activité |
| **Machines et chaînes** — the lines of the workshop and how machines are classified. | **Chaînes de production**, **Familles de machines**, **Marques et modèles**, **Étiquettes QR des machines** | Modèles de machines, Importance des machines, États des machines, Groupes de machines |
| **Magasin et achats** — where parts are stored, who supplies them, how much can be spent. | **Magasins et emplacements**, **Fournisseurs**, **Budgets annuels** | Familles d'articles, Fabricants des articles, Importance des articles |
| **Interventions** — the choices offered when declaring or planning an intervention. | **Types de pannes**, **Types d'intervention**, **Plans de maintenance préventive** | Niveaux d'urgence, États d'intervention (technical list), Rapports Power BI |

At the bottom: application version (3.0) and the signed-in account.

**Listes de choix** (`/settings/references`, opened from the groups above): three tabs, **Machines et chaînes**, **Interventions**, **Magasin**. Each tab lists its usual lists first and folds the rare ones under "Autres listes". The page opens on **Chaînes de production**. Every list has **Ajouter**, a **search box** (from 6 items), and an empty state that offers to add the first item. Names are in plain French ("Importance des machines" rather than "Criticité équipement"). The "États d'intervention" list is technical: its entries are matched to the statuses by keyword, so do not rename them.

**Utilisateurs:** the technician role is shown as **Technicien** everywhere (cards, tags, filter, form); "Adresse e-mail"; no internal identifier under the names.

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

### Aide, guided tour, help everywhere

- **Aide** (last item of the menu, for every role, and in the user menu): how to do things for the user's role (the supervisor sees all three roles), **the indicators explained** (supervisor), a searchable **glossary** of maintenance words (OT, préventif, MTBF, Pareto, criticité, seuil…), and **frequent questions** (camera on HTTP, forgotten password, locked account, colours, offline use).
- **Guided tour**: shown once per account and device at first login, adapted to the role. "Revoir la visite guidée" in the user menu or on the Aide page replays it. Keys: → next, ← previous, Échap closes.
- The **"?"** next to each dashboard figure explains it with the numbers on screen.
- Deletions always ask for confirmation in the application's own dialog.
- **Notifications**: since version 3 the bell is shown to requesters too (they are told when work starts, is closed or cancelled).

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
| Downtime (heures d'arrêt) | Per machine, union of the periods during which a breakdown kept it stopped (declaration → completion or now), clipped to the period; overlapping requests on the same machine count once | Hours of production lost |
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
| Δ vs previous period | Previous period = same length just before (monthly report: previous calendar month). Change in % (or in points for percentages); below 5 % (0,5 pt availability, 3 pt preventive) shown as "stable" | Green = better, red = worse, grey = stable |
| Cumulative share (Pareto) | running total of the ranked items ÷ total | The first lines that reach ~80 % are the priorities |
| Cost per machine | labour + parts + subcontracting of the period on the machine's interventions | In DT |

All these formulas live in one place, `API/Services/Kpi/KpiCalculator.cs`, used by the dashboard, the machine page, the monthly report and `/api/kpi`, and covered by unit tests (`tests/Gmao.Tests`).

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
- **Version 3** (details in `SECURITE-V3.md`): uploaded files are checked by their real content (magic number) and their type is decided by the server; Content-Security-Policy and other security headers; `X-Forwarded-For` trusted only from known proxies (`ReverseProxy:KnownNetworks`); passwords of at least 10 characters, refusing the user's name and common words, with French messages; the login no longer reveals whether an account exists or is deactivated before the password is checked; demo error controllers removed.

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
- **Migrations** (e.g. `GmaoModulesPro`, `AccentsStatuts`, `RoleSuperviseurManquant`) are applied automatically when the API starts (`MigrateAsync`). They are additive: existing data is kept.
- **Soft delete**: "deleting" an intervention or a machine sets `IsActif = false` / `IsDeleted = true` instead of erasing it, so history and KPIs stay correct.

---

## 27. Background jobs

`PreventifHostedService` starts with the API, waits 30 s, then every **hour** runs the preventive generation (§8.2).

The browser also refreshes notifications periodically.

---

## 28. Tests

| Suite | Tool | Checks |
|---|---|---|
| `tests/Gmao.Tests` | xUnit (`dotnet test tests/Gmao.Tests`) | **46** unit tests: every KPI formula against a hand calculation (downtime with overlaps, availability, MTBF, MTTR, preventive compliance, same-length previous period, monthly period, labour cost, budget prorata across two years, year-end projection), the "À retenir" rules, file upload checks, password rules |
| `tests/api_tests.py` | Python, HTTP calls | **168** checks: the 137 previous ones, plus version 3: each dashboard figure equals the length of the list it opens, filters, export, monthly report, security headers, upload checks, password policy, login answers, cross-access (IDOR) by requester and technician |
| `tests/e2e/*.mjs` | Node.js driving a **headless browser** (Microsoft Edge on Windows, Chrome or Chromium elsewhere; `GMAO_BROWSER` to force one) through the **Chrome DevTools Protocol (CDP)**. `GMAO_APP` and `GMAO_API` change the addresses (default `http://localhost:4200` and `http://localhost:5000/api`). | Clicks through the real screens like a user: every page of every role (`pages`), the full workflow (`workflow`), préventif/magasin/achats (`modules`), equipment, users, references, budgets, dashboard links (`admin`) |
| `tests/e2e/cleanup.sql` | SQL | Removes data created by the browser tests |

"Headless" = the browser runs without a window. CDP = the protocol DevTools uses, which lets a script click, type and read the page.

---

## 29. Deployment

See `DEPLOIEMENT-VERSION-3.md` (latest) and `DEPLOIEMENT-VERSION-2.md`. In short:

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
