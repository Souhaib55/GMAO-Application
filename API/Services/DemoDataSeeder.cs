using Core.Entities;
using Infrastructure.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using static API.Controllers.DemandeInterventionController;

namespace API.Services
{
    /// <summary>
    /// Loads realistic demo data for a textile plant: production lines, sewing, cutting
    /// and pressing machines, technicians, store articles, suppliers, preventive plans
    /// and twelve months of simulated activity (breakdowns, preventive jobs, time spent,
    /// parts issued, replenishment orders and receipts). Stock balances are consistent
    /// with the movements.
    ///
    /// Opt-in only (never runs by itself): start the API with "--seed-demo" or set
    /// DemoData:Seed=true. It only adds rows and runs once (marker in ParametresApplication).
    /// </summary>
    public class DemoDataSeeder
    {
        public const string Marker = "demo.seed";
        public const string MotDePasseDemo = "Simotex!2026";

        private readonly StoreContext _db;
        private readonly UserManager<AppUser> _users;
        private readonly ILogger<DemoDataSeeder> _logger;
        private readonly Random _rnd = new(2026);

        public DemoDataSeeder(StoreContext db, UserManager<AppUser> users, ILogger<DemoDataSeeder> logger)
        {
            _db = db;
            _users = users;
            _logger = logger;
        }

        // ------------------------------------------------------------------
        // Static demo content
        // ------------------------------------------------------------------

        private sealed record MachineDef(string Code, string Designation, string Chaine, string Famille, string Criticite, string Kind, double Fragilite, string Emplacement);
        private sealed record Incident(string Kind, string Titre, string Panne, string Cause, string Remede, string Specialite, string[] Pieces, double DureeMoyenneH);
        private sealed record ArticleDef(string Code, string Designation, string Type, string Famille, string Unite, decimal Prix, int Seuil, int Max, string Emplacement, string Fournisseur);
        private sealed record TechDef(string Prenom, string Nom, string Email, string Specialite, decimal Taux, string Telephone);
        private sealed record PlanDef(string Titre, string Kind, string Frequence, int Intervalle, int DureeMin, string Specialite, string[] Taches, string[] Pieces, string? MachineCode = null);

        private static readonly string[] Chaines = { "Coupe", "Couture A", "Couture B", "Finition", "Repassage et emballage" };

        private static readonly MachineDef[] Machines =
        {
            new("CP-01", "Table de coupe automatique", "Coupe", "Machines de coupe", "Critique", "coupe", 1.2, "Coupe — zone 1"),
            new("CP-02", "Matelasseuse automatique", "Coupe", "Machines de coupe", "Important", "coupe", 0.8, "Coupe — zone 1"),
            new("CP-03", "Scie à ruban de coupe", "Coupe", "Machines de coupe", "Standard", "coupe", 0.5, "Coupe — zone 2"),
            new("CP-04", "Coupeuse à couteau vertical", "Coupe", "Machines de coupe", "Standard", "coupe", 0.6, "Coupe — zone 2"),
            new("CA-01", "Piqueuse plate JUKI DDL-9000C — poste 1", "Couture A", "Machines à coudre", "Important", "couture", 1.0, "Couture A — rang 1"),
            new("CA-02", "Piqueuse plate JUKI DDL-9000C — poste 2", "Couture A", "Machines à coudre", "Important", "couture", 1.7, "Couture A — rang 1"),
            new("CA-03", "Piqueuse plate JUKI DDL-9000C — poste 3", "Couture A", "Machines à coudre", "Standard", "couture", 0.9, "Couture A — rang 1"),
            new("CA-04", "Piqueuse plate JUKI DDL-9000C — poste 4", "Couture A", "Machines à coudre", "Standard", "couture", 0.8, "Couture A — rang 2"),
            new("CA-05", "Piqueuse plate JUKI DDL-9000C — poste 5", "Couture A", "Machines à coudre", "Standard", "couture", 1.0, "Couture A — rang 2"),
            new("CA-06", "Surjeteuse 5 fils Pegasus M952", "Couture A", "Machines à coudre", "Important", "couture", 1.2, "Couture A — rang 3"),
            new("CA-07", "Recouvreuse JUKI MF-7900", "Couture A", "Machines à coudre", "Standard", "couture", 0.9, "Couture A — rang 3"),
            new("CB-01", "Piqueuse plate Brother S-7300A — poste 1", "Couture B", "Machines à coudre", "Standard", "couture", 0.9, "Couture B — rang 1"),
            new("CB-02", "Piqueuse plate Brother S-7300A — poste 2", "Couture B", "Machines à coudre", "Standard", "couture", 1.0, "Couture B — rang 1"),
            new("CB-03", "Piqueuse plate Brother S-7300A — poste 3", "Couture B", "Machines à coudre", "Standard", "couture", 0.8, "Couture B — rang 2"),
            new("CB-04", "Piqueuse plate Brother S-7300A — poste 4", "Couture B", "Machines à coudre", "Important", "couture", 1.3, "Couture B — rang 2"),
            new("CB-05", "Boutonnière électronique Brother HE-800C", "Couture B", "Machines à coudre", "Critique", "couture", 1.5, "Couture B — rang 3"),
            new("CB-06", "Pose-bouton JUKI MB-1800", "Couture B", "Machines à coudre", "Important", "couture", 0.8, "Couture B — rang 3"),
            new("CB-07", "Machine à bras JUKI MS-1190", "Couture B", "Machines à coudre", "Standard", "couture", 0.7, "Couture B — rang 3"),
            new("FI-01", "Machine de contrôle et métrage tissu", "Finition", "Contrôle et finition", "Standard", "finition", 0.4, "Finition — contrôle"),
            new("FI-02", "Poste de détachage à pistolet", "Finition", "Contrôle et finition", "Standard", "finition", 0.3, "Finition — détachage"),
            new("RE-01", "Générateur de vapeur 40 kW", "Repassage et emballage", "Vapeur et repassage", "Critique", "vapeur", 1.1, "Local chaufferie"),
            new("RE-02", "Table à repasser aspirante — poste 1", "Repassage et emballage", "Vapeur et repassage", "Standard", "vapeur", 0.7, "Repassage — ligne 1"),
            new("RE-03", "Table à repasser aspirante — poste 2", "Repassage et emballage", "Vapeur et repassage", "Standard", "vapeur", 0.6, "Repassage — ligne 1"),
            new("RE-04", "Presse à repasser vapeur", "Repassage et emballage", "Vapeur et repassage", "Important", "vapeur", 0.9, "Repassage — ligne 2"),
            new("RE-05", "Plieuse-ensacheuse automatique", "Repassage et emballage", "Emballage", "Standard", "emballage", 0.6, "Emballage"),
            new("UT-01", "Compresseur à vis 15 kW", "Repassage et emballage", "Utilités", "Critique", "air", 0.7, "Local compresseur"),
        };

        private static readonly Incident[] Incidents =
        {
            new("couture", "Casse d'aiguille répétée", "Casse aiguille", "Aiguille mal montée et crochet légèrement déréglé", "Remplacement de l'aiguille, réglage du crochet et de la hauteur de barre", "couture", new[] { "AIG-DBX1-90", "CRO-DDL9000" }, 0.8),
            new("couture", "Saut de points sur tissu épais", "Saut de points", "Synchronisation aiguille / crochet décalée", "Recalage de la synchronisation, changement d'aiguille", "couture", new[] { "AIG-DBX1-90" }, 1.2),
            new("couture", "Fil qui casse en continu", "Tension du fil", "Ressort de tension usé, guide-fil abîmé", "Remplacement du ressort de tension, polissage du guide-fil", "couture", new[] { "RSRT-TENS" }, 0.7),
            new("couture", "Tissu mal entraîné", "Entraînement", "Griffe d'entraînement usée", "Remplacement de la griffe et réglage de la hauteur", "couture", new[] { "GRF-DDL", "PLQ-AIG" }, 1.5),
            new("couture", "Coupe-fil automatique ne coupe plus", "Panne mécanique", "Couteaux du coupe-fil émoussés", "Remplacement du kit coupe-fil et réglage", "couture", new[] { "CFL-KIT" }, 1.4),
            new("couture", "Moteur ne démarre plus", "Panne électrique", "Moteur servo hors service", "Remplacement du moteur servo et paramétrage", "electrique", new[] { "MOT-SERVO-550", "FUS-10A" }, 2.5),
            new("couture", "Erreur affichée sur le panneau de commande", "Panne électronique", "Carte de commande défaillante", "Remplacement de la carte de commande", "electrique", new[] { "CRT-CTRL-DDL" }, 3.0),
            new("couture", "Bruit anormal et échauffement", "Panne mécanique", "Manque de lubrification, roulement usé", "Remplacement du roulement, nettoyage et lubrification", "couture", new[] { "RLT-6203", "HUI-MACH-1L" }, 1.8),
            new("couture", "Canette qui se bloque", "Panne mécanique", "Boîte à canette déformée", "Remplacement de la boîte à canette", "couture", new[] { "BOI-CAN", "CNT-BOBINE" }, 0.6),
            new("couture", "Éclairage de la machine en panne", "Panne électrique", "Lampe LED grillée", "Remplacement de la lampe", "electrique", new[] { "LMP-LED" }, 0.4),
            new("coupe", "Coupe imprécise sur la table automatique", "Panne mécanique", "Lame de coupe émoussée", "Remplacement de la lame et calibrage", "mecanique", new[] { "LAM-GERB", "AFF-PIERRE" }, 2.0),
            new("coupe", "Aspiration de la table insuffisante", "Panne électrique", "Contacteur du moteur d'aspiration défaillant", "Remplacement du contacteur", "electrique", new[] { "CTC-24V" }, 1.6),
            new("coupe", "Courroie d'entraînement cassée", "Panne mécanique", "Courroie usée", "Remplacement de la courroie et réglage de la tension", "mecanique", new[] { "CRR-DENT-T5" }, 2.2),
            new("coupe", "Chariot de la matelasseuse bloqué", "Entraînement", "Courroie trapézoïdale détendue", "Remplacement de la courroie", "mecanique", new[] { "CRR-TRAP-A" }, 1.3),
            new("vapeur", "Fuite vapeur sur flexible", "Fuite vapeur", "Flexible vapeur fissuré", "Remplacement du flexible et des joints", "vapeur", new[] { "FLX-VAP-1M", "JNT-VAP-KIT" }, 1.1),
            new("vapeur", "Fer à repasser ne chauffe plus", "Panne électrique", "Résistance chauffante coupée", "Remplacement de la résistance", "electrique", new[] { "RES-FER-1200" }, 0.9),
            new("vapeur", "Électrovanne vapeur bloquée", "Panne pneumatique", "Dépôt de calcaire dans l'électrovanne", "Remplacement de l'électrovanne, purge du circuit", "vapeur", new[] { "EVN-VAP-14" }, 1.7),
            new("vapeur", "Chaudière en défaut de pression", "Panne électrique", "Pressostat défaillant", "Remplacement du pressostat et essais", "vapeur", new[] { "PRS-VAP" }, 3.2),
            new("emballage", "Plieuse bloquée en cours de cycle", "Panne pneumatique", "Vérin pneumatique fuyard", "Remplacement du vérin", "vapeur", new[] { "VRN-PNEU-25" }, 1.5),
            new("emballage", "Défaut de soudure des sachets", "Panne électrique", "Résistance de soudure usée", "Remplacement de la résistance et réglage de la température", "electrique", new[] { "RES-FER-1200" }, 1.2),
            new("air", "Compresseur en surchauffe", "Panne mécanique", "Filtre à air colmaté, niveau d'huile bas", "Remplacement du filtre, appoint d'huile", "vapeur", new[] { "FLT-AIR-CMP", "HUI-CMP-5L" }, 1.4),
            new("air", "Chute de pression du réseau d'air", "Panne pneumatique", "Fuite sur raccord", "Remplacement du raccord et contrôle du réseau", "vapeur", Array.Empty<string>(), 1.0),
            new("finition", "Moteur d'enroulement bloqué", "Panne électrique", "Fusible grillé, moteur en surcharge", "Remplacement du fusible, nettoyage du rouleau", "electrique", new[] { "FUS-10A" }, 0.8),
            new("finition", "Pistolet détacheur bouché", "Panne mécanique", "Buse encrassée", "Démontage et nettoyage de la buse", "mecanique", Array.Empty<string>(), 0.5),
        };

        private static readonly ArticleDef[] Articles =
        {
            new("AIG-DBX1-90", "Aiguilles DBx1 Nm 90 (boîte de 100)", "Consommable", "Pièces machines à coudre", "boîte", 38.500m, 8, 30, "A-01-01", "Sahel Pièces Textiles"),
            new("AIG-DCX27-80", "Aiguilles DCx27 Nm 80 surjeteuse (boîte de 100)", "Consommable", "Pièces machines à coudre", "boîte", 42.000m, 4, 15, "A-01-02", "Sahel Pièces Textiles"),
            new("CRO-DDL9000", "Crochet rotatif piqueuse plate", "Pièce de rechange", "Pièces machines à coudre", "pièce", 95.000m, 3, 10, "A-02-01", "Sahel Pièces Textiles"),
            new("GRF-DDL", "Griffe d'entraînement piqueuse plate", "Pièce de rechange", "Pièces machines à coudre", "pièce", 28.000m, 4, 15, "A-02-02", "Sahel Pièces Textiles"),
            new("PPR-STD", "Pied presseur standard", "Pièce de rechange", "Pièces machines à coudre", "pièce", 12.500m, 8, 25, "A-02-03", "Sahel Pièces Textiles"),
            new("PLQ-AIG", "Plaque à aiguille", "Pièce de rechange", "Pièces machines à coudre", "pièce", 35.000m, 3, 10, "A-02-04", "Sahel Pièces Textiles"),
            new("CFL-KIT", "Kit coupe-fil automatique (couteaux fixe et mobile)", "Pièce de rechange", "Pièces machines à coudre", "kit", 64.000m, 2, 8, "A-03-01", "Sahel Pièces Textiles"),
            new("RSRT-TENS", "Ressort de tension du fil", "Pièce de rechange", "Pièces machines à coudre", "pièce", 6.500m, 10, 40, "A-03-02", "Sahel Pièces Textiles"),
            new("BOI-CAN", "Boîte à canette", "Pièce de rechange", "Pièces machines à coudre", "pièce", 32.000m, 4, 15, "A-03-03", "Sahel Pièces Textiles"),
            new("CNT-BOBINE", "Canettes métalliques (lot de 10)", "Consommable", "Pièces machines à coudre", "lot", 15.000m, 6, 25, "A-03-04", "Sahel Pièces Textiles"),
            new("MOT-SERVO-550", "Moteur servo 550 W", "Pièce de rechange", "Composants électriques", "pièce", 420.000m, 1, 4, "B-01-01", "ElecIndus Monastir"),
            new("CRT-CTRL-DDL", "Carte de commande moteur", "Pièce de rechange", "Composants électriques", "pièce", 680.000m, 1, 2, "B-01-02", "ElecIndus Monastir"),
            new("CTC-24V", "Contacteur 24 V", "Pièce de rechange", "Composants électriques", "pièce", 42.000m, 2, 8, "B-01-03", "ElecIndus Monastir"),
            new("FUS-10A", "Fusibles 10 A (lot de 10)", "Consommable", "Composants électriques", "lot", 12.000m, 4, 15, "B-01-04", "ElecIndus Monastir"),
            new("LMP-LED", "Lampe LED de machine à coudre", "Pièce de rechange", "Composants électriques", "pièce", 24.000m, 4, 15, "B-02-01", "ElecIndus Monastir"),
            new("RES-FER-1200", "Résistance chauffante 1200 W", "Pièce de rechange", "Vapeur et pneumatique", "pièce", 48.000m, 3, 10, "C-01-01", "Vapeur Process Tunisie"),
            new("EVN-VAP-14", "Électrovanne vapeur 1/4\"", "Pièce de rechange", "Vapeur et pneumatique", "pièce", 165.000m, 2, 5, "C-01-02", "Vapeur Process Tunisie"),
            new("JNT-VAP-KIT", "Kit joints vapeur", "Consommable", "Vapeur et pneumatique", "kit", 26.000m, 4, 12, "C-01-03", "Vapeur Process Tunisie"),
            new("FLX-VAP-1M", "Flexible vapeur tressé 1 m", "Pièce de rechange", "Vapeur et pneumatique", "pièce", 58.000m, 2, 8, "C-01-04", "Vapeur Process Tunisie"),
            new("PRS-VAP", "Pressostat de chaudière", "Pièce de rechange", "Vapeur et pneumatique", "pièce", 210.000m, 1, 3, "C-02-01", "Vapeur Process Tunisie"),
            new("VRN-PNEU-25", "Vérin pneumatique Ø25", "Pièce de rechange", "Vapeur et pneumatique", "pièce", 110.000m, 1, 4, "C-02-02", "Pneumatique & Air Sousse"),
            new("FLT-AIR-CMP", "Filtre à air de compresseur", "Pièce de rechange", "Vapeur et pneumatique", "pièce", 75.000m, 2, 6, "C-02-03", "Pneumatique & Air Sousse"),
            new("HUI-CMP-5L", "Huile de compresseur 5 L", "Consommable", "Consommables", "bidon", 89.000m, 2, 6, "D-01-01", "Lubrifiants du Centre"),
            new("HUI-MACH-1L", "Huile pour machine à coudre 1 L", "Consommable", "Consommables", "litre", 14.500m, 8, 30, "D-01-02", "Lubrifiants du Centre"),
            new("GRS-HT-400", "Graisse haute température 400 g", "Consommable", "Consommables", "tube", 22.000m, 3, 10, "D-01-03", "Lubrifiants du Centre"),
            new("RLT-6203", "Roulement 6203-2RS", "Pièce de rechange", "Pièces mécaniques", "pièce", 9.800m, 8, 30, "D-02-01", "Sahel Pièces Textiles"),
            new("CRR-TRAP-A", "Courroie trapézoïdale A-33", "Pièce de rechange", "Pièces mécaniques", "pièce", 18.000m, 3, 10, "D-02-02", "Sahel Pièces Textiles"),
            new("CRR-DENT-T5", "Courroie dentée T5 de table de coupe", "Pièce de rechange", "Pièces mécaniques", "pièce", 145.000m, 1, 4, "D-02-03", "Cutting Systems Maghreb"),
            new("LAM-GERB", "Lame de coupe pour table automatique", "Pièce de rechange", "Pièces mécaniques", "pièce", 185.000m, 2, 6, "D-03-01", "Cutting Systems Maghreb"),
            new("AFF-PIERRE", "Pierre d'affûtage de table de coupe", "Consommable", "Pièces mécaniques", "pièce", 55.000m, 2, 6, "D-03-02", "Cutting Systems Maghreb"),
        };

        private static readonly (string Nom, string Contact, string Tel, string Email, string Adresse, int Delai)[] Fournisseurs =
        {
            ("Sahel Pièces Textiles", "Walid Hammami", "73 475 120", "commandes@sahel-pieces.demo", "Zone industrielle, Ksar Hellal", 4),
            ("ElecIndus Monastir", "Imen Ben Youssef", "73 462 300", "ventes@elecindus.demo", "Route de Sousse, Monastir", 5),
            ("Vapeur Process Tunisie", "Fathi Guesmi", "71 940 215", "contact@vapeur-process.demo", "Ben Arous, Tunis", 10),
            ("Pneumatique & Air Sousse", "Mourad Khelifi", "73 228 410", "devis@pneumair.demo", "Zone industrielle Sidi Abdelhamid, Sousse", 7),
            ("Lubrifiants du Centre", "Asma Toumi", "73 300 118", "service@lubcentre.demo", "Moknine", 3),
            ("Cutting Systems Maghreb", "Yassine Dridi", "71 805 660", "support@cutting-maghreb.demo", "Charguia, Tunis", 21),
        };

        private static readonly TechDef[] Techniciens =
        {
            new("Mohamed", "Ben Salah", "m.bensalah@simotex.demo", "couture", 12.500m, "98 214 556"),
            new("Karim", "Jlassi", "k.jlassi@simotex.demo", "electrique", 13.000m, "97 330 412"),
            new("Anis", "Trabelsi", "a.trabelsi@simotex.demo", "mecanique", 11.000m, "55 120 874"),
            new("Sami", "Gharbi", "s.gharbi@simotex.demo", "vapeur", 11.500m, "29 455 017"),
        };

        private static readonly Dictionary<string, string> LibelleSpecialite = new()
        {
            ["couture"] = "Mécanique machines à coudre",
            ["electrique"] = "Électricité et automatisme",
            ["mecanique"] = "Mécanique générale",
            ["vapeur"] = "Vapeur, air comprimé et pneumatique",
        };

        private static readonly (string Prenom, string Nom, string Email, string Chaine)[] ChefsDeChaine =
        {
            ("Salma", "Haddad", "s.haddad@simotex.demo", "Coupe"),
            ("Nour", "Ben Amor", "n.benamor@simotex.demo", "Couture A"),
            ("Hichem", "Mansour", "h.mansour@simotex.demo", "Couture B"),
            ("Rim", "Chaabane", "r.chaabane@simotex.demo", "Repassage et emballage"),
        };

        private static readonly PlanDef[] Plans =
        {
            new("Nettoyage et lubrification hebdomadaire", "couture", PlanPreventif.FrequenceSemaine, 1, 30, "couture",
                new[] { "Dépoussiérer la zone crochet et la griffe", "Lubrifier les points de graissage", "Contrôler l'état de l'aiguille", "Vérifier la tension du fil sur chute de tissu" },
                new[] { "HUI-MACH-1L" }),
            new("Contrôle mensuel de la synchronisation et du coupe-fil", "couture", PlanPreventif.FrequenceMois, 1, 60, "couture",
                new[] { "Vérifier la synchronisation aiguille / crochet", "Contrôler le coupe-fil automatique", "Contrôler la griffe et la plaque à aiguille", "Essai de couture sur trois épaisseurs" },
                Array.Empty<string>()),
            new("Révision trimestrielle du moteur et de l'électronique", "couture", PlanPreventif.FrequenceMois, 3, 45, "electrique",
                new[] { "Contrôler les connexions du moteur servo", "Nettoyer le ventilateur du boîtier de commande", "Vérifier les paramètres du panneau" },
                Array.Empty<string>()),
            new("Affûtage et calibrage de la table de coupe", "coupe", PlanPreventif.FrequenceSemaine, 2, 90, "mecanique",
                new[] { "Contrôler l'usure de la lame", "Affûter et calibrer", "Vérifier la dépression de la table", "Contrôler la tension de la courroie" },
                new[] { "AFF-PIERRE" }, "CP-01"),
            new("Contrôle mensuel de la matelasseuse", "coupe", PlanPreventif.FrequenceMois, 1, 60, "mecanique",
                new[] { "Contrôler les courroies", "Graisser les guidages", "Vérifier les capteurs de fin de course" },
                new[] { "GRS-HT-400" }, "CP-02"),
            new("Purge et contrôle hebdomadaire du générateur de vapeur", "vapeur", PlanPreventif.FrequenceSemaine, 1, 45, "vapeur",
                new[] { "Purger la chaudière", "Contrôler la pression et le pressostat", "Vérifier l'absence de fuite sur le circuit", "Contrôler le traitement d'eau" },
                Array.Empty<string>(), "RE-01"),
            new("Contrôle mensuel des postes de repassage", "vapeur", PlanPreventif.FrequenceMois, 1, 40, "vapeur",
                new[] { "Contrôler les flexibles vapeur", "Vérifier les électrovannes", "Nettoyer les semelles de fer" },
                new[] { "JNT-VAP-KIT" }),
            new("Entretien mensuel du compresseur", "air", PlanPreventif.FrequenceMois, 1, 60, "vapeur",
                new[] { "Purger les condensats", "Contrôler le niveau d'huile", "Nettoyer ou remplacer le filtre à air", "Contrôler la pression de service" },
                new[] { "FLT-AIR-CMP" }, "UT-01"),
        };

        // ------------------------------------------------------------------
        // Helpers
        // ------------------------------------------------------------------

        private int Between(int min, int maxInclusive) => _rnd.Next(min, maxInclusive + 1);
        private double Chance() => _rnd.NextDouble();
        private T Pick<T>(IReadOnlyList<T> items) => items[_rnd.Next(items.Count)];

        private async Task<int> EnsureAsync<T>(DbSet<T> set, Func<T, string> label, Func<T, int> id, string value, Func<T> create) where T : class
        {
            var all = await set.ToListAsync();
            var existing = all.FirstOrDefault(x => TextHelper.Normalize(label(x)) == TextHelper.Normalize(value));
            if (existing != null) return id(existing);
            var entity = create();
            set.Add(entity);
            await _db.SaveChangesAsync();
            return id(entity);
        }

        private async Task<Users> EnsureUserAsync(string prenom, string nom, string email, string role, int roleId)
        {
            var existing = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (existing != null) return existing;

            var appUser = await _users.FindByEmailAsync(email);
            if (appUser == null)
            {
                appUser = new AppUser { FirstName = prenom, LastName = nom, Email = email, UserName = email, EmailConfirmed = true };
                var result = await _users.CreateAsync(appUser, MotDePasseDemo);
                if (!result.Succeeded) throw new InvalidOperationException(string.Join(" ", result.Errors.Select(e => e.Description)));
                await _users.AddToRoleAsync(appUser, role);
            }

            var user = new Users
            {
                AppUserId = appUser.Id, Nom = nom, Prenom = prenom, Email = email,
                DateCreation = DateTime.Now.AddMonths(-13), DateModification = DateTime.Now, IsActif = true, IDRole = roleId
            };
            _db.Users.Add(user);
            await _db.SaveChangesAsync();
            return user;
        }

        // ------------------------------------------------------------------
        // Seed
        // ------------------------------------------------------------------

        public async Task<string> SeedAsync()
        {
            if (await _db.ParametresApplication.AnyAsync(p => p.Cle == Marker))
                return "Les données de démonstration sont déjà chargées.";

            var now = DateTime.Now;
            var today = DateTime.Today;
            var start = today.AddDays(-365);

            // --- Reference data -------------------------------------------------
            var chaineIds = new Dictionary<string, int>();
            foreach (var c in Chaines)
                chaineIds[c] = await EnsureAsync(_db.ChaineProductions, x => x.Libelle, x => x.IDChaineProduction, c,
                    () => new ChaineProduction { Libelle = c, DateCreation = start, IsActif = true });

            var typePrev = await EnsureAsync(_db.TypeInterventions, x => x.Libelle, x => x.IDTypeIntervention, "Maintenance préventive",
                () => new TypeIntervention { Libelle = "Maintenance préventive", DateCreation = start, IsActif = true });
            var typeCorr = await EnsureAsync(_db.TypeInterventions, x => x.Libelle, x => x.IDTypeIntervention, "Maintenance corrective",
                () => new TypeIntervention { Libelle = "Maintenance corrective", DateCreation = start, IsActif = true });
            var typeDep = await EnsureAsync(_db.TypeInterventions, x => x.Libelle, x => x.IDTypeIntervention, "Dépannage",
                () => new TypeIntervention { Libelle = "Dépannage", DateCreation = start, IsActif = true });

            var urg = new Dictionary<string, int>();
            foreach (var u in new[] { "Basse", "Normale", "Haute" })
                urg[u] = await EnsureAsync(_db.Urgences, x => x.Libelle, x => x.IDUrgence, u,
                    () => new Urgence { Libelle = u, DateCreation = start, IsActif = true });

            var etat = new Dictionary<string, int>();
            foreach (var e in new[] { "Nouveau", "En cours", "Terminé" })
                etat[e] = await EnsureAsync(_db.Etats, x => x.Libelle, x => x.IDEtat, e,
                    () => new Etat { Libelle = e, DateCreation = start, IsActif = true });

            var pannes = new Dictionary<string, int>();
            foreach (var p in Incidents.Select(i => i.Panne).Distinct())
                pannes[p] = await EnsureAsync(_db.Pannes, x => x.Libelle, x => x.IDPanne, p,
                    () => new Panne { Libelle = p, DateCreation = start, IsActif = true });

            var critEq = new Dictionary<string, int>();
            foreach (var c in new[] { "Critique", "Important", "Standard" })
                critEq[c] = await EnsureAsync(_db.EquipmentCriticites, x => x.NomCriticite, x => x.IdCriticite, c,
                    () => new EquipmentCriticite { NomCriticite = c, DateCreation = start, IsActif = true });
            var etatEq = new Dictionary<string, int>();
            foreach (var e in new[] { "En service", "En panne", "En maintenance" })
                etatEq[e] = await EnsureAsync(_db.EtatEquipements, x => x.NomEtat, x => x.IdEtat, e,
                    () => new EtatEquipement { NomEtat = e, DateCreation = start, IsActif = true });
            var famEq = new Dictionary<string, int>();
            foreach (var f in Machines.Select(m => m.Famille).Distinct())
                famEq[f] = await EnsureAsync(_db.FamilleEquipements, x => x.NomFamille, x => x.IdFamille, f,
                    () => new FamilleEquipment { NomFamille = f, DateCreation = start, IsActif = true });

            var famPiece = new Dictionary<string, int>();
            foreach (var f in Articles.Select(a => a.Famille).Distinct())
                famPiece[f] = await EnsureAsync(_db.FamillePieces, x => x.NomFamille, x => x.IDFamillePiece, f,
                    () => new FamillePiece { NomFamille = f, DateCreation = start, IsActif = true });
            var critPiece = new Dictionary<string, int>();
            foreach (var c in new[] { "Critique", "Important", "Standard" })
                critPiece[c] = await EnsureAsync(_db.CriticitePieces, x => x.NiveauCriticitePiece, x => x.IDCriticitePiece, c,
                    () => new CriticitePiece { NiveauCriticitePiece = c, DateCreation = start, IsActif = true });

            var magasinPrincipal = await EnsureAsync(_db.Magasins, x => x.Nom, x => x.Id, "Magasin principal",
                () => new Magasin { Code = "MAG-PR", Nom = "Magasin principal", DateCreation = start, IsActif = true });

            // --- Suppliers ------------------------------------------------------
            var fournisseurs = new Dictionary<string, Fournisseur>();
            foreach (var f in Fournisseurs)
            {
                var existing = await _db.Fournisseurs.FirstOrDefaultAsync(x => x.Nom == f.Nom);
                if (existing == null)
                {
                    existing = new Fournisseur
                    {
                        Code = $"FRN-D{fournisseurs.Count + 1:00}", Nom = f.Nom, Contact = f.Contact, Telephone = f.Tel,
                        Email = f.Email, Adresse = f.Adresse, DelaiLivraisonJours = f.Delai, IsActif = true, DateCreation = start
                    };
                    _db.Fournisseurs.Add(existing);
                }
                fournisseurs[f.Nom] = existing;
            }
            await _db.SaveChangesAsync();

            // --- People ---------------------------------------------------------
            var roleIds = await _db.Roles.ToDictionaryAsync(r => r.Libelle, r => r.IDRole);
            var techs = new Dictionary<string, List<Users>>();
            foreach (var t in Techniciens)
            {
                var u = await EnsureUserAsync(t.Prenom, t.Nom, t.Email, Roles.Technicien, roleIds[Roles.Technicien]);
                u.Specialite = LibelleSpecialite[t.Specialite];
                u.TauxHoraire = t.Taux;
                u.Telephone = t.Telephone;
                if (!techs.ContainsKey(t.Specialite)) techs[t.Specialite] = new();
                techs[t.Specialite].Add(u);
            }
            // Existing active technicians become all-rounders
            var autres = await _db.Users.Where(u => u.IsActif && u.IDRole == roleIds[Roles.Technicien] && !Techniciens.Select(t => t.Email).Contains(u.Email)).ToListAsync();
            foreach (var u in autres)
            {
                u.Specialite ??= "Polyvalent";
                u.TauxHoraire ??= 10.500m;
                techs["mecanique"].Add(u);
            }

            var chefs = new Dictionary<string, Users>();
            foreach (var c in ChefsDeChaine)
                chefs[c.Chaine] = await EnsureUserAsync(c.Prenom, c.Nom, c.Email, Roles.Demandeur, roleIds[Roles.Demandeur]);
            chefs["Finition"] = chefs["Repassage et emballage"];

            var superviseur = await _db.Users.Where(u => u.IsActif && u.IDRole == roleIds[Roles.Superviseur]).OrderBy(u => u.ID).FirstAsync();
            await _db.SaveChangesAsync();

            // --- Machines -------------------------------------------------------
            var machines = new Dictionary<string, Equipment>();
            foreach (var m in Machines)
            {
                var existing = await _db.Equipments.FirstOrDefaultAsync(e => e.CodeEquipement == m.Code);
                if (existing == null)
                {
                    var miseEnService = today.AddMonths(-Between(14, 90));
                    existing = new Equipment
                    {
                        CodeEquipement = m.Code, Designation = m.Designation, Emplacement = m.Emplacement,
                        IdChaineProduction = chaineIds[m.Chaine], IdFamille = famEq[m.Famille], IdCriticite = critEq[m.Criticite],
                        IdEtat = etatEq["En service"], NumeroSerie = $"SN-{_rnd.Next(100000, 999999)}",
                        DateAchat = miseEnService.AddDays(-20), DateInstallation = miseEnService.AddDays(-5), DateMiseEnService = miseEnService,
                        DateFinGarantie = miseEnService.AddYears(2), SousGarantie = miseEnService.AddYears(2) > today,
                        CoutAchat = m.Kind switch { "coupe" => Between(18, 160) * 1000m, "vapeur" => Between(4, 45) * 1000m, "air" => 38000m, "emballage" => 52000m, "finition" => Between(6, 25) * 1000m, _ => Between(3, 14) * 1000m },
                        DateCreation = start.AddDays(-30), IsDeleted = false
                    };
                    _db.Equipments.Add(existing);
                }
                machines[m.Code] = existing;
            }
            await _db.SaveChangesAsync();

            // --- Articles and opening stock ------------------------------------
            var articles = new Dictionary<string, Piece>();
            var stock = new Dictionary<string, int>();
            var mouvements = new List<MouvementStock>();
            foreach (var a in Articles)
            {
                var piece = await _db.Pieces.FirstOrDefaultAsync(p => p.CodePiece == a.Code);
                if (piece == null)
                {
                    piece = new Piece
                    {
                        CodePiece = a.Code, Designation = a.Designation, TypeArticle = a.Type, Unite = a.Unite,
                        IDFamillePiece = famPiece[a.Famille], IDCriticitePiece = critPiece[a.Prix > 150 ? "Critique" : a.Prix > 40 ? "Important" : "Standard"],
                        PrixUnitaire = a.Prix, SeuilMinimum = a.Seuil, StockMaximum = a.Max, Emplacement = a.Emplacement,
                        IdMagasin = magasinPrincipal, IdFournisseur = fournisseurs[a.Fournisseur].Id, DelaiApproJours = fournisseurs[a.Fournisseur].DelaiLivraisonJours,
                        DateCreation = start, IsActif = true, Quantite_Stock = 0
                    };
                    _db.Pieces.Add(piece);
                }
                articles[a.Code] = piece;
                stock[a.Code] = piece.Quantite_Stock;
            }
            await _db.SaveChangesAsync();
            foreach (var a in Articles)
            {
                var initial = (int)Math.Ceiling(a.Max * 0.7);
                stock[a.Code] += initial;
                mouvements.Add(new MouvementStock
                {
                    Piece = articles[a.Code], Type = MouvementStock.TypeInventaireInitial, Quantite = initial, StockApres = stock[a.Code],
                    PrixUnitaire = a.Prix, Date = start.AddHours(8), Motif = "Inventaire d'ouverture", UtilisateurId = superviseur.ID
                });
            }

            // --- Preventive plans ---------------------------------------------
            var plans = new List<(PlanPreventif Plan, PlanDef Def, Equipment Machine)>();
            var planSeq = (await _db.PlansPreventifs.MaxAsync(p => (int?)p.Id) ?? 0) + 1;
            foreach (var def in Plans)
            {
                var targets = def.MachineCode != null
                    ? Machines.Where(m => m.Code == def.MachineCode)
                    : def.Kind == "couture"
                        ? Machines.Where(m => m.Kind == "couture" && (def.Frequence != PlanPreventif.FrequenceSemaine || m.Criticite != "Standard"))
                        : Machines.Where(m => m.Kind == def.Kind && m.Code != "RE-01");
                foreach (var m in targets)
                {
                    var tech = techs[def.Specialite][0];
                    var first = start.AddDays(Between(0, def.Frequence == PlanPreventif.FrequenceSemaine ? 6 : 27));
                    var plan = new PlanPreventif
                    {
                        Code = $"PM-{planSeq++:0000}", Titre = def.Titre, IdEquipement = machines[m.Code].IdEquipement,
                        IdTypeIntervention = typePrev, Frequence = def.Frequence, Intervalle = def.Intervalle,
                        DureeEstimeeMinutes = def.DureeMin, IdTechnicien = tech.ID, DateDebut = first, ProchaineEcheance = first,
                        DelaiGenerationJours = def.Frequence == PlanPreventif.FrequenceSemaine ? 3 : 7, IsActif = true,
                        DateCreation = start, CreeParId = superviseur.ID,
                        Description = $"Plan de maintenance préventive — {m.Designation}.",
                        Taches = def.Taches.Select((t, i) => new PlanPreventifTache { Ordre = i + 1, Libelle = t }).ToList()
                    };
                    _db.PlansPreventifs.Add(plan);
                    plans.Add((plan, def, machines[m.Code]));
                }
            }
            await _db.SaveChangesAsync();

            // --- Twelve months of activity -------------------------------------
            var ots = new List<DemandeIntervention>();
            var commandes = new List<(BonCommande Bc, DateTime Reception)>();
            var bcSeq = 1;
            var annee = today.Year;

            DemandeIntervention NewOt(string titre, DateTime creation, Equipment machine, string chaine, int type, int urgence, int panne, Users demandeur, bool arret) => new()
            {
                Titre = titre, DateCreation = creation, IDEquipement = machine.IdEquipement, IDChaineProduction = chaineIds[chaine],
                IDTypeIntervention = type, IDUrgence = urgence, IDPanne = panne, DemandeursID = demandeur.ID, MachineArretee = arret,
                IsActif = true, StatusId = StatusATraiter, IDEtat = etat["Nouveau"]
            };

            void Consume(DemandeIntervention ot, string code, int qty, DateTime when, Users tech)
            {
                if (!articles.ContainsKey(code) || stock[code] < qty) return; // out of stock: the job is done without it
                stock[code] -= qty;
                var piece = articles[code];
                var mvt = new MouvementStock
                {
                    Piece = piece, Type = MouvementStock.TypeSortie, Quantite = -qty, StockApres = stock[code], PrixUnitaire = piece.PrixUnitaire,
                    Date = when, Motif = "Consommation intervention", DemandeIntervention = ot, UtilisateurId = tech.ID
                };
                mouvements.Add(mvt);
                ot.PiecesConsommees.Add(new InterventionPiece { Piece = piece, Quantite = qty, PrixUnitaire = piece.PrixUnitaire, Date = when });
            }

            void Reorder(DateTime day)
            {
                var due = Articles.Where(a => stock[a.Code] <= a.Seuil &&
                                              !commandes.Any(c => c.Reception > day && c.Bc.Lignes.Any(l => l.Piece == articles[a.Code]))).ToList();
                foreach (var group in due.GroupBy(a => a.Fournisseur))
                {
                    if (day > today.AddDays(-14) && Chance() < 0.6) continue; // not reordered yet
                    var f = fournisseurs[group.Key];
                    var delai = f.DelaiLivraisonJours ?? 7;
                    var orderDate = day.Date.AddHours(Between(9, 15));
                    var bc = new BonCommande
                    {
                        Numero = $"BC-{orderDate.Year}-{bcSeq++:0000}", Fournisseur = f, DateCommande = orderDate.Date,
                        DateLivraisonPrevue = orderDate.Date.AddDays(delai), Statut = BonCommande.StatutEnvoye, IdCreateur = superviseur.ID,
                        DateCreation = orderDate, Notes = "Réapprovisionnement sur seuil",
                        Lignes = group.Select(a => new BonCommandeLigne
                        {
                            Piece = articles[a.Code], Designation = a.Designation, Quantite = Math.Max(1, a.Max - stock[a.Code]), PrixUnitaire = a.Prix
                        }).ToList()
                    };
                    // Most suppliers deliver on time; a few are late
                    var reception = orderDate.Date.AddDays(delai + (Chance() < 0.75 ? Between(-1, 0) : Between(2, 6))).AddHours(Between(9, 16));
                    commandes.Add((bc, reception));
                }
            }

            void Receive(DateTime day)
            {
                foreach (var (bc, reception) in commandes.Where(c => c.Reception.Date == day.Date && c.Bc.Statut == BonCommande.StatutEnvoye))
                {
                    if (reception > now) continue;
                    foreach (var l in bc.Lignes)
                    {
                        var code = Articles.First(a => articles[a.Code] == l.Piece).Code;
                        stock[code] += l.Quantite;
                        l.QuantiteRecue = l.Quantite;
                        mouvements.Add(new MouvementStock
                        {
                            Piece = l.Piece!, Type = MouvementStock.TypeEntree, Quantite = l.Quantite, StockApres = stock[code], PrixUnitaire = l.PrixUnitaire,
                            Date = reception, Motif = $"Réception {bc.Numero}", BonCommande = bc, UtilisateurId = superviseur.ID
                        });
                    }
                    bc.Statut = BonCommande.StatutRecu;
                    bc.DateReceptionComplete = reception;
                }
            }

            for (var day = start; day <= today; day = day.AddDays(1))
            {
                Receive(day);
                var workingDay = day.DayOfWeek != DayOfWeek.Sunday;

                // Breakdowns
                if (workingDay)
                {
                    foreach (var m in Machines)
                    {
                        if (Chance() > 0.024 * m.Fragilite) continue;
                        var created = day.AddHours(Between(6, 21)).AddMinutes(Between(0, 59));
                        if (created > now) continue;

                        var incident = Pick(Incidents.Where(i => i.Kind == m.Kind).ToList());
                        var machine = machines[m.Code];
                        var urgence = m.Criticite == "Critique" || Chance() < 0.35 ? "Haute" : Chance() < 0.75 ? "Normale" : "Basse";
                        var ot = NewOt(incident.Titre, created, machine, m.Chaine, Chance() < 0.8 ? typeCorr : typeDep, urg[urgence],
                            pannes[incident.Panne], chefs[m.Chaine], arret: true);
                        ot.Description = $"{incident.Titre} sur {m.Designation}. Signalé par le chef de chaîne.";

                        var tech = Pick(techs[incident.Specialite]);
                        var assign = created.AddMinutes(Between(5, 35));
                        var reaction = urgence == "Haute" ? Between(5, 45) : urgence == "Normale" ? Between(20, 150) : Between(60, 600);
                        var start2 = assign.AddMinutes(reaction);
                        var repairMinutes = (int)Math.Max(15, incident.DureeMoyenneH * 60 * (0.5 + Chance() * 1.2));
                        var done = start2.AddMinutes(repairMinutes);
                        var closed = done.AddHours(Between(2, 60));

                        // Recent jobs: some still wait for a technician, others for parts
                        var recent = created > now.AddDays(-4);
                        if (recent && Chance() < 0.25) { assign = start2 = done = closed = now.AddDays(1); }
                        else if (recent && Chance() < 0.35) { done = now.AddDays(2); closed = done.AddDays(1); ot.Description += " En attente de pièce."; }
                        if (assign <= now) { ot.DestinatairesID = tech.ID; ot.DateAssignation = assign; }
                        if (start2 <= now)
                        {
                            ot.DatePriseEnCharge = start2;
                            ot.StatusId = StatusEnCours;
                            ot.IDEtat = etat["En cours"];
                        }
                        if (done <= now)
                        {
                            ot.DateRealisation = done;
                            ot.DateResolution = done;
                            ot.StatusId = StatusRealisee;
                            ot.IDEtat = etat["Terminé"];
                            ot.CompteRendu = $"{incident.Remede}. Essais de fonctionnement concluants, machine rendue à la production.";
                            // A few reports are left incomplete, as in real life
                            if (Chance() < 0.88) { ot.Cause = incident.Cause; ot.Remede = incident.Remede; }
                            if (m.Criticite == "Critique" && Chance() < 0.08) ot.CoutExterne = Between(25, 90) * 10m;
                            if (closed <= now) { ot.DateCloture = closed; ot.StatusId = StatusCloturee; }
                        }

                        if (ot.DatePriseEnCharge.HasValue)
                        {
                            var end = ot.DateRealisation ?? now;
                            var minutes = (int)Math.Max(5, (end - ot.DatePriseEnCharge.Value).TotalMinutes);
                            ot.Temps.Add(new InterventionTemps
                            {
                                IdTechnicien = tech.ID, Debut = ot.DatePriseEnCharge.Value, Fin = end, DureeMinutes = minutes,
                                TauxHoraire = tech.TauxHoraire, DateSaisie = end
                            });
                            // Long repairs often need a second technician
                            if (minutes > 150 && Chance() < 0.4)
                            {
                                var helper = Pick(techs.Values.SelectMany(x => x).Where(x => x.ID != tech.ID).ToList());
                                var helpMinutes = minutes / 2;
                                ot.Temps.Add(new InterventionTemps
                                {
                                    IdTechnicien = helper.ID, Debut = ot.DatePriseEnCharge.Value.AddMinutes(30), Fin = ot.DatePriseEnCharge.Value.AddMinutes(30 + helpMinutes),
                                    DureeMinutes = helpMinutes, TauxHoraire = helper.TauxHoraire, DateSaisie = end, Commentaire = "Renfort"
                                });
                            }
                            foreach (var code in incident.Pieces)
                                if (Chance() < 0.75) Consume(ot, code, code.StartsWith("AIG") || code.StartsWith("RSRT") ? Between(1, 2) : 1, ot.DatePriseEnCharge.Value.AddMinutes(10), tech);
                        }
                        ots.Add(ot);
                    }
                }

                // Preventive jobs due today
                foreach (var (plan, def, machine) in plans)
                {
                    while (plan.ProchaineEcheance.Date == day.Date)
                    {
                        var due = day.Date;
                        var m = Machines.First(x => x.Code == machine.CodeEquipement);
                        var tech = techs[def.Specialite][0];
                        var created = due.AddDays(-plan.DelaiGenerationJours).AddHours(6);
                        if (created > now) break;

                        var ot = NewOt(def.Titre, created, machine, m.Chaine, typePrev, urg["Normale"], pannes.Values.Min(), superviseur, arret: false);
                        ot.Description = plan.Description;
                        ot.DatePlanifiee = due;
                        ot.DureeEstimeeMinutes = def.DureeMin;
                        ot.PlanPreventif = plan;
                        ot.DestinatairesID = tech.ID;
                        ot.DateAssignation = created;
                        ot.Taches = def.Taches.Select((t, i) => new InterventionTache { Ordre = i + 1, Libelle = t }).ToList();

                        // 82 % on time, 13 % late, 5 % forgotten (still open)
                        var roll = Chance();
                        if (roll >= 0.95 && due < today.AddDays(-21)) roll = 0.9; // old forgotten jobs were caught up late
                        DateTime? startJob = roll < 0.82 ? due.AddHours(Between(7, 14)) : roll < 0.95 ? due.AddDays(Between(3, 9)).AddHours(Between(7, 14)) : null;
                        if (startJob.HasValue && startJob.Value <= now)
                        {
                            var minutes = (int)(def.DureeMin * (0.8 + Chance() * 0.5));
                            var done = startJob.Value.AddMinutes(minutes);
                            ot.DatePriseEnCharge = startJob;
                            ot.StatusId = StatusEnCours;
                            ot.IDEtat = etat["En cours"];
                            if (done <= now)
                            {
                                ot.DateRealisation = done;
                                ot.DateResolution = done;
                                ot.StatusId = done.AddDays(1) <= now ? StatusCloturee : StatusRealisee;
                                if (ot.StatusId == StatusCloturee) ot.DateCloture = done.AddDays(1);
                                ot.IDEtat = etat["Terminé"];
                                ot.CompteRendu = "Gamme préventive réalisée, aucune anomalie bloquante constatée.";
                                foreach (var t in ot.Taches) { t.Fait = true; t.DateFait = done; t.FaitParId = tech.ID; }
                                ot.Temps.Add(new InterventionTemps { IdTechnicien = tech.ID, Debut = startJob.Value, Fin = done, DureeMinutes = minutes, TauxHoraire = tech.TauxHoraire, DateSaisie = done });
                                foreach (var code in def.Pieces)
                                    if (Chance() < 0.5) Consume(ot, code, 1, startJob.Value, tech);
                            }
                        }
                        ots.Add(ot);
                        plan.DerniereGeneration = created;
                        plan.ProchaineEcheance = plan.NextAfter(due);
                    }
                }

                Reorder(day);
            }

            // Plans whose next due date fell before the simulation window ended keep a future date
            foreach (var (plan, _, _) in plans)
                while (plan.ProchaineEcheance < today) plan.ProchaineEcheance = plan.NextAfter(plan.ProchaineEcheance);

            // One late delivery and one draft order, as on any real purchasing desk
            var lent = fournisseurs["Cutting Systems Maghreb"];
            commandes.Add((new BonCommande
            {
                Numero = $"BC-{annee}-{bcSeq++:0000}", Fournisseur = lent, DateCommande = today.AddDays(-26), DateLivraisonPrevue = today.AddDays(-5),
                Statut = BonCommande.StatutEnvoye, IdCreateur = superviseur.ID, DateCreation = today.AddDays(-26), Notes = "Lames de rechange — stock de sécurité",
                Lignes = { new BonCommandeLigne { Piece = articles["LAM-GERB"], Designation = articles["LAM-GERB"].Designation, Quantite = 4, PrixUnitaire = 185.000m } }
            }, now.AddDays(30)));
            commandes.Add((new BonCommande
            {
                Numero = $"BC-{annee}-{bcSeq++:0000}", Fournisseur = fournisseurs["Sahel Pièces Textiles"], DateCommande = today, Statut = BonCommande.StatutBrouillon,
                IdCreateur = superviseur.ID, DateCreation = now, Notes = "À compléter avant envoi",
                Lignes =
                {
                    new BonCommandeLigne { Piece = articles["CRO-DDL9000"], Designation = articles["CRO-DDL9000"].Designation, Quantite = 3, PrixUnitaire = 95.000m },
                    new BonCommandeLigne { Piece = articles["GRF-DDL"], Designation = articles["GRF-DDL"].Designation, Quantite = 6, PrixUnitaire = 28.000m }
                }
            }, now.AddDays(30)));

            _db.DemandeInterventions.AddRange(ots);
            _db.BonsCommande.AddRange(commandes.Select(c => c.Bc));
            _db.MouvementsStock.AddRange(mouvements);
            foreach (var a in Articles) articles[a.Code].Quantite_Stock = stock[a.Code];
            await _db.SaveChangesAsync();

            // Machines currently stopped
            var arretees = ots.Where(o => o.MachineArretee && o.StatusId <= StatusEnCours).Select(o => o.IDEquipement).Distinct().ToHashSet();
            foreach (var m in machines.Values.Where(m => arretees.Contains(m.IdEquipement))) m.IdEtat = etatEq["En panne"];

            // --- Purchase requests, budgets --------------------------------------
            var da1 = new DemandeAchat
            {
                Numero = $"DA-{annee}-0001", DateDemande = now.AddDays(-2), IdDemandeur = techs["couture"][0].ID, Statut = DemandeAchat.StatutSoumise,
                Motif = "Moteur servo de secours pour la boutonnière CB-05 (pannes répétées).",
                Lignes = { new DemandeAchatLigne { IdPiece = articles["MOT-SERVO-550"].IDPiece, Designation = articles["MOT-SERVO-550"].Designation, Quantite = 1, PrixEstime = 420.000m } }
            };
            var da2 = new DemandeAchat
            {
                Numero = $"DA-{annee}-0002", DateDemande = now.AddDays(-1), IdDemandeur = techs["vapeur"][0].ID, Statut = DemandeAchat.StatutSoumise,
                Motif = "Kit de détartrage du générateur de vapeur, hors catalogue.",
                Lignes = { new DemandeAchatLigne { Designation = "Kit de détartrage chaudière 40 kW", Quantite = 1, PrixEstime = 260.000m } }
            };
            var da3 = new DemandeAchat
            {
                Numero = $"DA-{annee}-0003", DateDemande = now.AddDays(-6), IdDemandeur = techs["electrique"][0].ID, Statut = DemandeAchat.StatutApprouvee,
                DateDecision = now.AddDays(-5), IdDecideur = superviseur.ID, Motif = "Stock de sécurité de cartes de commande.",
                Lignes = { new DemandeAchatLigne { IdPiece = articles["CRT-CTRL-DDL"].IDPiece, Designation = articles["CRT-CTRL-DDL"].Designation, Quantite = 1, PrixEstime = 680.000m } }
            };
            if (!await _db.DemandesAchat.AnyAsync(d => d.Numero.StartsWith($"DA-{annee}-")))
                _db.DemandesAchat.AddRange(da1, da2, da3);

            foreach (var (y, mo, pi, st) in new[] { (annee - 1, 9000m, 16000m, 5000m), (annee, 10000m, 18000m, 6000m) })
            {
                foreach (var (cat, montant) in new[] { (Budget.CategorieMainOeuvre, mo), (Budget.CategoriePieces, pi), (Budget.CategorieSousTraitance, st) })
                    if (!await _db.Budgets.AnyAsync(b => b.Annee == y && b.Categorie == cat && b.IdChaineProduction == null))
                        _db.Budgets.Add(new Budget { Annee = y, Categorie = cat, Montant = montant, Notes = "Budget de maintenance annuel" });
            }

            _db.ParametresApplication.Add(new ParametreApplication { Cle = Marker, Valeur = $"v1 — {now:yyyy-MM-dd HH:mm}", DateModification = now });
            _db.JournalActivites.Add(new JournalActivite { Date = now, UtilisateurNom = "Système", Entite = "Parametre", Action = "Données de démonstration chargées", Details = $"{ots.Count} interventions, {commandes.Count} commandes" });
            await _db.SaveChangesAsync();

            var summary = $"Données de démonstration chargées : {Machines.Length} machines, {Articles.Length} articles, {plans.Count} plans préventifs, " +
                          $"{ots.Count} interventions, {commandes.Count} bons de commande, {mouvements.Count} mouvements de stock.";
            _logger.LogInformation("{Summary}", summary);
            return summary;
        }
    }
}
