"""
GMAO SIMOTEX — API acceptance tests (no third-party dependency).

    python tests/qa_accounts.py create
    python tests/api_tests.py [--base http://localhost:5000]
    python tests/qa_accounts.py remove

Covers authentication and authorization, the work-order life cycle with its
follow-up (time, parts, checklist, cost), preventive plans and their automatic work
orders, the store (movements, thresholds, replenishment), purchasing (request →
order → receipt), budgets, the data explorer (every predefined question), Power BI
settings, attachments, audit trail and regressions on the earlier endpoints.
Created data is prefixed "QA" and removed by `qa_accounts.py remove`.
"""
import argparse
import datetime as dt
import http.cookiejar
import json
import sys
import urllib.error
import urllib.parse
import urllib.request
import uuid

PASSWORD = "QaTest!2026"
RESULTS = []


class Session:
    def __init__(self, base):
        self.base = base.rstrip("/")
        self.jar = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.jar))
        self.me = None

    def call(self, method, path, body=None, raw=None, content_type=None):
        data, headers = None, {}
        if raw is not None:
            data, headers["Content-Type"] = raw, content_type
        elif body is not None:
            data, headers["Content-Type"] = json.dumps(body).encode(), "application/json"
        req = urllib.request.Request(self.base + path, data=data, method=method, headers=headers)
        try:
            with self.opener.open(req, timeout=60) as r:
                payload = r.read()
                return r.status, _parse(payload, r.headers.get("Content-Type", ""))
        except urllib.error.HTTPError as e:
            return e.code, _parse(e.read(), e.headers.get("Content-Type", ""))

    def get(self, p): return self.call("GET", p)
    def post(self, p, b=None): return self.call("POST", p, b if b is not None else {})
    def put(self, p, b): return self.call("PUT", p, b)
    def patch(self, p, b=None): return self.call("PATCH", p, b if b is not None else {})
    def delete(self, p): return self.call("DELETE", p)

    def login(self, email):
        status, body = self.post("/api/account/login", {"email": email, "password": PASSWORD})
        if status != 200:
            raise SystemExit(f"Connexion impossible pour {email} ({status}) : {body}. Lancez d'abord qa_accounts.py create.")
        _, self.me = self.get("/api/account/user-info")
        return self

    def upload(self, path, fields, filename, content, mime="application/octet-stream"):
        boundary = uuid.uuid4().hex
        parts = []
        for k, v in fields.items():
            parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode())
        parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="{filename}"\r\nContent-Type: {mime}\r\n\r\n'.encode() + content + b"\r\n")
        parts.append(f"--{boundary}--\r\n".encode())
        return self.call("POST", path, raw=b"".join(parts), content_type=f"multipart/form-data; boundary={boundary}")


def _parse(payload, ctype):
    if "json" in ctype:
        try:
            return json.loads(payload or b"null")
        except ValueError:
            return payload
    return payload


def check(name, condition, detail=""):
    RESULTS.append((name, bool(condition)))
    print(f"  {'OK ' if condition else 'ÉCHEC'}  {name}" + ("" if condition else f"  → {str(detail)[:300]}"))
    return condition


def section(title):
    print(f"\n{title}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="http://localhost:5000")
    args = parser.parse_args()
    base = args.base

    anon = Session(base)
    sup = Session(base).login("qa.superviseur@gmao.test")
    tech = Session(base).login("qa.technicien@gmao.test")
    dem = Session(base).login("qa.demandeur@gmao.test")
    tech_id = tech.me["internalId"]  # Users.ID (the "id" field is the Identity key)

    # ------------------------------------------------------------------
    section("Authentification et droits")
    for path in ["/api/magasin/articles", "/api/preventif/plans", "/api/achats/commandes", "/api/explorateur/catalogue",
                 "/api/budgets", "/api/journal", "/api/DemandeIntervention", "/api/kpi?days=30"]:
        check(f"anonyme refusé sur {path}", anon.get(path)[0] == 401)
    check("mauvais mot de passe refusé", Session(base).post("/api/account/login", {"email": "qa.superviseur@gmao.test", "password": "faux"})[0] in (400, 401))
    check("demandeur ne voit pas le magasin", dem.get("/api/magasin/articles")[0] == 403)
    check("technicien lit le magasin", tech.get("/api/magasin/articles")[0] == 200)
    check("technicien ne peut pas créer d'article", tech.post("/api/magasin/articles", {"codePiece": "QA-X"})[0] == 403)
    check("technicien n'accède pas aux budgets", tech.get("/api/budgets")[0] == 403)
    check("technicien n'accède pas à l'explorateur", tech.get("/api/explorateur/catalogue")[0] == 403)
    check("technicien n'accède pas au journal", tech.get("/api/journal")[0] == 403)
    check("demandeur ne lit pas les plans préventifs", dem.get("/api/preventif/plans")[0] == 403)
    check("technicien ne peut pas créer de plan", tech.post("/api/preventif/plans", {})[0] == 403)
    check("inscription réservée au superviseur", tech.post("/api/account/register", {"email": "x@y.z"})[0] == 403)

    # ------------------------------------------------------------------
    section("Régressions sur les écrans existants")
    for path in ["/api/Equipment?page=1&pageSize=5", "/api/Piece?page=1&pageSize=5", "/api/Stock", "/api/kpi?days=30",
                 "/api/DemandeIntervention/dashboard-stats", "/api/DemandeIntervention?page=1&pageSize=5", "/api/Notification",
                 "/api/ChaineProduction", "/api/TypeIntervention", "/api/Urgence", "/api/Panne"]:
        status, _ = sup.get(path)
        check(f"GET {path}", status == 200, status)

    # Reference data for the scenario
    _, ref = sup.get("/api/explorateur/listes")
    machine = next(e for e in ref["equipements"])
    _, chaines = sup.get("/api/ChaineProduction")
    _, types = sup.get("/api/TypeIntervention")
    _, urgences = sup.get("/api/Urgence")
    _, pannes = sup.get("/api/Panne")
    def first_id(items, key):
        items = items.get("data", items) if isinstance(items, dict) else items
        return next(i[key] for i in items if i.get("isActif", True))
    chaine_id = first_id(chaines, "idChaineProduction")
    corr_type = next(t["idTypeIntervention"] for t in (types if isinstance(types, list) else types["data"]) if "corrective" in t["libelle"].lower())
    urgence_id = first_id(urgences, "idUrgence")
    panne_id = first_id(pannes, "idPanne")

    # ------------------------------------------------------------------
    section("Cycle de vie d'une intervention et suivi")
    status, ot = dem.post("/api/DemandeIntervention", {
        "titre": "QA Casse d'aiguille", "description": "Test automatisé", "idTypeIntervention": corr_type,
        "idUrgence": urgence_id, "idChaineProduction": chaine_id, "idEquipement": machine["id"], "idPanne": panne_id})
    check("le demandeur déclare une panne", status == 201, ot)
    ot_id = ot["idDemandeIntervention"]
    check("date de création fixée par le serveur", abs((dt.datetime.fromisoformat(ot["dateCreation"][:19]) - dt.datetime.now()).total_seconds()) < 300)
    check("machine arrêtée déduite (correctif)", ot["machineArretee"] is True)
    check("le technicien non affecté ne peut pas saisir", tech.post(f"/api/interventions/{ot_id}/temps", {"debut": dt.datetime.now().isoformat(), "dureeMinutes": 30})[0] == 403)
    check("affectation par le superviseur", sup.post(f"/api/DemandeIntervention/{ot_id}/assign", {"technicianId": str(tech_id)})[0] == 200)
    check("saisie refusée avant prise en charge", tech.post(f"/api/interventions/{ot_id}/temps", {"debut": dt.datetime.now().isoformat(), "dureeMinutes": 30})[0] == 403)
    check("prise en charge par le technicien", tech.post(f"/api/DemandeIntervention/{ot_id}/accept")[0] == 200)
    debut = (dt.datetime.now() - dt.timedelta(minutes=90)).replace(microsecond=0)
    check("saisie du temps passé", tech.post(f"/api/interventions/{ot_id}/temps", {"debut": debut.isoformat(), "fin": (debut + dt.timedelta(minutes=75)).isoformat(), "commentaire": "QA"})[0] == 200)
    check("temps futur refusé", tech.post(f"/api/interventions/{ot_id}/temps", {"debut": (dt.datetime.now() + dt.timedelta(days=1)).isoformat(), "dureeMinutes": 30})[0] == 400)

    # A store article for the test
    _, refs = sup.get("/api/magasin/references")
    article_body = {"codePiece": "QA-ART-1", "designation": "QA Aiguilles de test", "typeArticle": "Consommable", "unite": "boîte",
                    "idFamillePiece": refs["familles"][0]["id"], "idCriticitePiece": refs["criticites"][0]["id"],
                    "seuilMinimum": 2, "stockMaximum": 10, "prixUnitaire": 40.5, "quantiteInitiale": 5}
    status, created = sup.post("/api/magasin/articles", article_body)
    check("création d'un article avec stock initial", status == 200, created)
    art_id = created["idPiece"]
    check("code article en double refusé", sup.post("/api/magasin/articles", article_body)[0] == 400)
    _, detail = sup.get(f"/api/magasin/articles/{art_id}")
    check("mouvement d'inventaire initial créé", detail["article"]["quantite_Stock"] == 5 and len(detail["mouvements"]) == 1, detail)

    check("consommation d'une pièce sur l'OT", tech.post(f"/api/interventions/{ot_id}/pieces", {"idPiece": art_id, "quantite": 2})[0] == 200)
    check("consommation supérieure au stock refusée", tech.post(f"/api/interventions/{ot_id}/pieces", {"idPiece": art_id, "quantite": 50})[0] == 400)
    _, detail = sup.get(f"/api/magasin/articles/{art_id}")
    check("stock décrémenté (5 → 3)", detail["article"]["quantite_Stock"] == 3, detail["article"])
    check("ajout d'une étape de checklist", tech.post(f"/api/interventions/{ot_id}/taches", {"libelle": "Remplacer l'aiguille"})[0] == 200)
    _, suivi = tech.get(f"/api/interventions/{ot_id}/suivi")
    tache_id = suivi["taches"][0]["id"]
    check("étape cochée", tech.patch(f"/api/interventions/{ot_id}/taches/{tache_id}?fait=true")[0] == 200)
    check("analyse cause / remède", tech.put(f"/api/interventions/{ot_id}/analyse", {"cause": "Aiguille tordue", "remede": "Remplacement", "coutExterne": 10})[0] == 200)
    _, suivi = sup.get(f"/api/interventions/{ot_id}/suivi")
    cout = suivi["cout"]
    check("coût calculé (main-d'œuvre + pièces + externe)", abs(cout["pieces"] - 81.0) < 0.01 and abs(cout["mainOeuvre"] - 15.0) < 0.01 and abs(cout["total"] - 106.0) < 0.01, cout)
    check("le demandeur lit le suivi de sa demande", dem.get(f"/api/interventions/{ot_id}/suivi")[0] == 200)
    check("le demandeur ne peut pas saisir de temps", dem.post(f"/api/interventions/{ot_id}/temps", {"debut": debut.isoformat(), "dureeMinutes": 10})[0] == 403)

    status, _ = dem.upload("/api/pieces-jointes", {"entite": "Intervention", "entiteId": ot_id}, "photo.png", b"\x89PNG\r\n\x1a\nQA", "image/png")
    check("le demandeur joint une photo", status == 200, _)
    check("fichier exécutable refusé", dem.upload("/api/pieces-jointes", {"entite": "Intervention", "entiteId": ot_id}, "virus.exe", b"MZ")[0] == 400)
    _, files = tech.get(f"/api/pieces-jointes?entite=Intervention&entiteId={ot_id}")
    check("le technicien voit la pièce jointe", len(files["fichiers"]) == 1, files)
    status, content = tech.get(f"/api/pieces-jointes/{files['fichiers'][0]['id']}")
    check("téléchargement de la pièce jointe", status == 200 and content.startswith(b"\x89PNG"))

    check("fin sans compte rendu refusée", tech.patch(f"/api/DemandeIntervention/{ot_id}/status", {"statusId": 3, "compteRendu": ""})[0] == 400)
    check("fin des travaux avec compte rendu", tech.patch(f"/api/DemandeIntervention/{ot_id}/status", {"statusId": 3, "compteRendu": "Aiguille remplacée, essais concluants."})[0] == 200)
    check("clôture par le superviseur", sup.patch(f"/api/DemandeIntervention/{ot_id}/status", {"statusId": 4})[0] == 200)
    check("saisie impossible après clôture", sup.post(f"/api/interventions/{ot_id}/taches", {"libelle": "x"})[0] == 403)
    _, journal = sup.get(f"/api/journal?entite=Intervention&entiteId={ot_id}")
    check("journal d'activité alimenté", journal["totalCount"] >= 4, journal["totalCount"])
    status, histo = sup.get(f"/api/equipment/{machine['id']}/historique")
    check("historique 360° de la machine", status == 200 and any(i["idDemandeIntervention"] == ot_id for i in histo["interventions"]), status)
    check("historique machine interdit au demandeur", dem.get(f"/api/equipment/{machine['id']}/historique")[0] == 403)

    # ------------------------------------------------------------------
    section("Maintenance préventive")
    today = dt.date.today()
    plan_body = {"titre": "QA Lubrification", "idEquipement": machine["id"], "frequence": "Semaine", "intervalle": 2,
                 "dureeEstimeeMinutes": 30, "idTechnicien": tech_id, "dateDebut": today.isoformat(), "delaiGenerationJours": 3,
                 "taches": ["Nettoyer", "Lubrifier", "Contrôler"]}
    check("fréquence invalide refusée", sup.post("/api/preventif/plans", {**plan_body, "frequence": "Siècle"})[0] == 400)
    status, plan = sup.post("/api/preventif/plans", plan_body)
    check("création d'un plan préventif", status == 200, plan)
    _, plan_detail = sup.get(f"/api/preventif/plans/{plan['id']}")
    histo = plan_detail["plan"]["historique"]
    check("OT généré automatiquement à l'échéance", len(histo) == 1 and histo[0]["datePlanifiee"][:10] == today.isoformat(), histo)
    check("prochaine échéance avancée de 2 semaines", plan_detail["plan"]["prochaineEcheance"][:10] == (today + dt.timedelta(days=14)).isoformat(), plan_detail["plan"]["prochaineEcheance"])
    _, suivi_pm = tech.get(f"/api/interventions/{histo[0]['idDemandeIntervention']}/suivi")
    check("checklist du plan copiée dans l'OT", [t["libelle"] for t in suivi_pm["taches"]] == plan_body["taches"], suivi_pm["taches"])
    _, again = sup.post("/api/preventif/generer")
    check("génération idempotente (pas de doublon)", all(g["planId"] != plan["id"] for g in again["generes"]), again)
    check("le technicien affecté voit l'OT préventif", tech.get(f"/api/DemandeIntervention/{histo[0]['idDemandeIntervention']}")[0] == 200)
    status, cal = sup.get(f"/api/preventif/calendrier?from={today.isoformat()}&to={(today + dt.timedelta(days=60)).isoformat()}")
    check("calendrier : OT + prévisions", status == 200 and sum(1 for c in cal if c.get("planId") == plan["id"]) >= 4, len(cal) if isinstance(cal, list) else cal)
    status, stats = sup.get("/api/preventif/stats?days=90")
    check("indicateurs du préventif", status == 200 and "tauxRespect" in stats, stats)
    check("suspension d'un plan", sup.patch(f"/api/preventif/plans/{plan['id']}/actif?actif=false")[0] == 200)

    # ------------------------------------------------------------------
    section("Magasin")
    check("entrée en stock", sup.post("/api/magasin/mouvements", {"idPiece": art_id, "type": "Entrée", "quantite": 7, "prixUnitaire": 42})[0] == 200)
    check("ajustement sans motif refusé", sup.post("/api/magasin/mouvements", {"idPiece": art_id, "type": "Ajustement", "quantite": 9})[0] == 400)
    status, adj = sup.post("/api/magasin/mouvements", {"idPiece": art_id, "type": "Ajustement", "quantite": 9, "motif": "Inventaire QA"})
    check("ajustement d'inventaire (10 → 9)", status == 200 and adj["stockApres"] == 9, adj)
    check("sortie supérieure au stock refusée", sup.post("/api/magasin/mouvements", {"idPiece": art_id, "type": "Sortie", "quantite": 99})[0] == 400)
    check("type de mouvement invalide refusé", sup.post("/api/magasin/mouvements", {"idPiece": art_id, "type": "Vol", "quantite": 1})[0] == 400)
    _, art = sup.get(f"/api/magasin/articles/{art_id}")
    check("prix de référence mis à jour par l'entrée", abs(art["article"]["prixUnitaire"] - 42) < 0.001, art["article"]["prixUnitaire"])
    status, synth = sup.get("/api/magasin/synthese")
    check("synthèse du magasin", status == 200 and synth["valeur"] > 0, synth)
    check("propositions de réapprovisionnement", sup.get("/api/magasin/reapprovisionnement")[0] == 200)
    status, mv = sup.get(f"/api/magasin/mouvements?pieceId={art_id}")
    check("journal des mouvements de l'article (initial, sortie OT, entrée, ajustement)", status == 200 and mv["totalCount"] == 4, mv.get("totalCount") if isinstance(mv, dict) else mv)
    status, mag = sup.post("/api/magasin/magasins", {"code": "QA-M1", "nom": "QA Magasin test"})
    check("création d'un magasin", status == 200, mag)

    # ------------------------------------------------------------------
    section("Achats")
    check("fournisseur avec e-mail invalide refusé", sup.post("/api/fournisseurs", {"nom": "QA Fournisseur", "email": "pas-un-email"})[0] == 400)
    status, frn = sup.post("/api/fournisseurs", {"nom": "QA Fournisseur", "email": "qa@fournisseur.test", "delaiLivraisonJours": 5})
    check("création d'un fournisseur", status == 200, frn)
    status, da = tech.post("/api/achats/demandes", {"motif": "QA besoin", "lignes": [{"idPiece": art_id, "quantite": 4, "prix": 40}]})
    check("le technicien soumet une demande d'achat", status == 200, da)
    check("le technicien ne peut pas approuver", tech.post(f"/api/achats/demandes/{da['id']}/decision", {"approuver": True})[0] == 403)
    check("le demandeur n'accède pas aux achats", dem.get("/api/achats/demandes")[0] == 403)
    check("refus sans motif impossible", sup.post(f"/api/achats/demandes/{da['id']}/decision", {"approuver": False})[0] == 400)
    check("approbation par le superviseur", sup.post(f"/api/achats/demandes/{da['id']}/decision", {"approuver": True})[0] == 200)
    status, bc = sup.post("/api/achats/commandes", {"idFournisseur": frn["id"], "idDemandeAchat": da["id"], "envoyer": True,
                                                    "lignes": [{"idPiece": art_id, "quantite": 4, "prix": 41}]})
    check("bon de commande créé depuis la demande", status == 200 and bc["numero"].startswith("BC-"), bc)
    _, bcd = sup.get(f"/api/achats/commandes/{bc['id']}")
    ligne_id = bcd["bc"]["lignes"][0]["id"]
    check("livraison prévue calculée depuis le délai fournisseur", bcd["bc"]["dateLivraisonPrevue"][:10] == (today + dt.timedelta(days=5)).isoformat(), bcd["bc"]["dateLivraisonPrevue"])
    check("réception supérieure à la commande refusée", sup.post(f"/api/achats/commandes/{bc['id']}/reception", {"lignes": [{"idLigne": ligne_id, "quantite": 5}]})[0] == 400)
    status, rec = sup.post(f"/api/achats/commandes/{bc['id']}/reception", {"lignes": [{"idLigne": ligne_id, "quantite": 3}], "bonLivraison": "BL-QA"})
    check("réception partielle", status == 200 and rec["statut"] == "Partiellement reçu", rec)
    status, rec = sup.post(f"/api/achats/commandes/{bc['id']}/reception", {"lignes": [{"idLigne": ligne_id, "quantite": 1}]})
    check("réception complète", status == 200 and rec["statut"] == "Reçu", rec)
    _, art = sup.get(f"/api/magasin/articles/{art_id}")
    check("stock augmenté par la réception (9 → 13)", art["article"]["quantite_Stock"] == 13, art["article"]["quantite_Stock"])
    check("annulation d'un BC reçu impossible", sup.post(f"/api/achats/commandes/{bc['id']}/annuler", {"commentaire": "x"})[0] == 400)
    check("synthèse des achats", sup.get("/api/achats/synthese")[0] == 200)

    # ------------------------------------------------------------------
    section("Budgets et équipe")
    status, budget = sup.get(f"/api/budgets?annee={today.year}")
    check("suivi budgétaire de l'année", status == 200 and len(budget["parMois"]) == 12, budget)
    status, b1 = sup.post("/api/budgets", {"annee": 2099, "categorie": "Pièces", "montant": 1000, "notes": "QA"})
    check("création d'un budget", status == 200, b1)
    check("budget en double refusé", sup.post("/api/budgets", {"annee": 2099, "categorie": "Pièces", "montant": 5, "notes": "QA"})[0] == 400)
    check("catégorie de budget invalide refusée", sup.post("/api/budgets", {"annee": 2099, "categorie": "Café", "montant": 5, "notes": "QA"})[0] == 400)
    status, team = sup.get("/api/techniciens?days=30")
    check("charge de l'équipe technique", status == 200 and any(t["id"] == tech_id for t in team), team)

    # ------------------------------------------------------------------
    section("Explorateur de données")
    status, cat = sup.get("/api/explorateur/catalogue")
    questions = cat["questions"]
    check(f"catalogue ({len(questions)} questions, {len(cat['sections'])} sections)", status == 200 and len(questions) >= 50)
    failures = []
    for q in questions:
        params = {"debut": (today - dt.timedelta(days=365)).isoformat(), "fin": today.isoformat(), "annee": today.year, "top": 10}
        if "equipement" in q["obligatoires"]:
            params["equipement"] = machine["id"]
        if "article" in q["obligatoires"]:
            params["article"] = art_id
        status, res = sup.post(f"/api/explorateur/executer/{q['id']}", params)
        if status != 200:
            failures.append((q["id"], status, res))
    check("toutes les questions s'exécutent", not failures, failures[:3])
    status, res = sup.post("/api/explorateur/executer/int-volume", {"debut": (today - dt.timedelta(days=30)).isoformat(), "fin": today.isoformat()})
    check("résultat chiffré avec colonnes typées", status == 200 and res["rendu"] == "chiffre" and res["colonnes"][0]["type"] == "number", res)
    check("question inconnue refusée", sup.post("/api/explorateur/executer/inconnue", {})[0] == 400)
    check("injection via l'identifiant sans effet", sup.post("/api/explorateur/executer/" + urllib.parse.quote("int-volume;DROP TABLE Users"), {})[0] in (400, 404))
    check("paramètre obligatoire contrôlé", sup.post("/api/explorateur/executer/eq-historique", {})[0] == 400)
    check("période inversée refusée", sup.post("/api/explorateur/executer/int-volume", {"debut": "2026-05-01", "fin": "2026-01-01"})[0] == 400)

    # ------------------------------------------------------------------
    section("Tableau de bord")
    for days in (7, 30, 90, 365):
        status, pil = sup.get(f"/api/pilotage?days={days}")
        check(f"pilotage {days} j", status == 200 and 0 <= pil["courant"]["disponibilite"] <= 100 and (pil["courant"]["mtbf"] is None or pil["courant"]["mtbf"] >= 0), status)
    status, pil = sup.get(f"/api/pilotage?days=90&equipementId={machine['id']}")
    check("pilotage filtré sur une machine", status == 200 and pil["periode"]["machines"] == 1, pil.get("periode") if isinstance(pil, dict) else pil)
    check("pilotage réservé au superviseur", tech.get("/api/pilotage")[0] == 403)
    status, mw = tech.get("/api/pilotage/mon-travail")
    check("tableau personnel du technicien", status == 200 and mw["role"] == "Utilisateur", mw)
    status, mw = dem.get("/api/pilotage/mon-travail")
    check("tableau personnel du demandeur", status == 200 and any(o["idDemandeIntervention"] == ot_id for o in mw["ouverts"] + mw["recentes"]), mw)
    status, found = sup.get(f"/api/DemandeIntervention?search=INT-{ot_id:04d}")
    check("recherche d'un OT par sa référence", status == 200 and any(d["idDemandeIntervention"] == ot_id for d in found["data"]), found)

    # ------------------------------------------------------------------
    section("Rapports Power BI")
    _, previous = sup.get("/api/parametres/powerbi")
    check("lien hors Power BI refusé", sup.put("/api/parametres/powerbi", [{"titre": "QA", "url": "https://evil.example.com/x"}])[0] == 400)
    check("lien http refusé", sup.put("/api/parametres/powerbi", [{"titre": "QA", "url": "http://app.powerbi.com/view?r=abc"}])[0] == 400)
    check("lien Power BI accepté", sup.put("/api/parametres/powerbi", [{"titre": "QA Rapport", "url": "https://app.powerbi.com/view?r=QA"}])[0] == 200)
    check("paramètres réservés au superviseur", tech.get("/api/parametres/powerbi")[0] == 403)
    sup.put("/api/parametres/powerbi", previous["rapports"])  # restore

    # ------------------------------------------------------------------
    passed = sum(1 for _, ok in RESULTS if ok)
    print(f"\n{passed}/{len(RESULTS)} vérifications réussies.")
    return 0 if passed == len(RESULTS) else 1


if __name__ == "__main__":
    sys.exit(main())
