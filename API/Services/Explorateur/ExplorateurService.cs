using System.Data;
using System.Diagnostics;
using System.Text.RegularExpressions;
using Microsoft.Data.SqlClient;

namespace API.Services
{
    public sealed class ExplorateurParametres
    {
        public DateTime? Debut { get; set; }
        public DateTime? Fin { get; set; }
        public int? Chaine { get; set; }
        public int? Equipement { get; set; }
        public int? Technicien { get; set; }
        public int? Article { get; set; }
        public int? Fournisseur { get; set; }
        public int? Annee { get; set; }
        public int? Top { get; set; }
    }

    public sealed record ExplorateurColonne(string Cle, string Libelle, string Type);

    public sealed record ExplorateurResultat(
        string QuestionId,
        string Rendu,
        List<ExplorateurColonne> Colonnes,
        List<object?[]> Lignes,
        bool Tronque,
        long DureeMs);

    public interface IExplorateurService
    {
        ExplorateurQuestion? Find(string id);
        Task<(ExplorateurResultat? resultat, string? erreur)> RunAsync(string id, ExplorateurParametres p, CancellationToken ct);
    }

    /// <summary>
    /// Runs the predefined questions. Safety, in layers:
    ///  1. only SQL written in <see cref="ExplorateurCatalogue"/> can run — the client sends a
    ///     question id and typed parameter values, never SQL;
    ///  2. the catalogue is checked at start-up to contain read statements only;
    ///  3. each query runs in a transaction that is always rolled back, with a timeout;
    ///  4. in production the "Explorateur" connection string should use a SQL login that
    ///     only has the db_datareader role (see the deployment notes).
    /// </summary>
    public class ExplorateurService : IExplorateurService
    {
        public const int MaxLignes = 1000;

        private static readonly Regex Forbidden = new(
            @"\b(INSERT|UPDATE|DELETE|MERGE|DROP|ALTER|CREATE|TRUNCATE|EXEC|EXECUTE|GRANT|REVOKE|DENY|BACKUP|RESTORE|SHUTDOWN|DBCC|OPENROWSET|OPENQUERY|OPENDATASOURCE|INTO)\b",
            RegexOptions.IgnoreCase | RegexOptions.Compiled);

        private static readonly Lazy<Dictionary<string, ExplorateurQuestion>> Catalogue = new(() =>
        {
            var dict = new Dictionary<string, ExplorateurQuestion>(StringComparer.OrdinalIgnoreCase);
            foreach (var q in ExplorateurCatalogue.Questions)
            {
                var match = Forbidden.Match(q.Sql);
                if (match.Success)
                    throw new InvalidOperationException($"Explorateur: la requête « {q.Id} » contient une instruction interdite ({match.Value}).");
                dict.Add(q.Id, q);
            }
            return dict;
        });

        private readonly string _connectionString;
        private readonly ILogger<ExplorateurService> _logger;

        public ExplorateurService(IConfiguration configuration, ILogger<ExplorateurService> logger)
        {
            _connectionString = configuration.GetConnectionString("Explorateur")
                                ?? configuration.GetConnectionString("DefaultConnection")
                                ?? throw new InvalidOperationException("Aucune chaîne de connexion configurée.");
            _logger = logger;
        }

        public static IReadOnlyCollection<ExplorateurQuestion> All => Catalogue.Value.Values;

        public ExplorateurQuestion? Find(string id) => Catalogue.Value.TryGetValue(id, out var q) ? q : null;

        private static string TypeColonne(string libelle, Type type)
        {
            if (libelle.EndsWith("(DT)")) return "money";
            if (libelle.EndsWith("(%)")) return "percent";
            if (libelle.EndsWith("(h)")) return "hours";
            if (type == typeof(DateTime) || type == typeof(DateTimeOffset)) return "date";
            if (type == typeof(int) || type == typeof(long) || type == typeof(short) || type == typeof(decimal) || type == typeof(double) || type == typeof(float))
                return "number";
            return "text";
        }

        public async Task<(ExplorateurResultat? resultat, string? erreur)> RunAsync(string id, ExplorateurParametres p, CancellationToken ct)
        {
            var question = Find(id);
            if (question == null) return (null, "Question inconnue.");

            foreach (var required in question.Obligatoires ?? Array.Empty<string>())
            {
                var missing = required switch
                {
                    "equipement" => p.Equipement == null,
                    "article" => p.Article == null,
                    "technicien" => p.Technicien == null,
                    "fournisseur" => p.Fournisseur == null,
                    "chaine" => p.Chaine == null,
                    _ => false
                };
                if (missing) return (null, required switch
                {
                    "equipement" => "Choisissez une machine.",
                    "article" => "Choisissez un article.",
                    _ => "Un paramètre obligatoire est manquant."
                });
            }

            var debut = (p.Debut ?? DateTime.Today.AddDays(-90)).Date;
            var fin = (p.Fin ?? DateTime.Today).Date.AddDays(1); // inclusive end date → exclusive bound
            if (fin <= debut) return (null, "La date de fin doit être après la date de début.");
            if ((fin - debut).TotalDays > 3700) return (null, "Période trop longue (10 ans au maximum).");
            var annee = p.Annee ?? DateTime.Today.Year;
            if (annee < 2000 || annee > 2100) return (null, "Année invalide.");
            var top = Math.Clamp(p.Top ?? 10, 1, 100);

            var watch = Stopwatch.StartNew();
            await using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync(ct);
            await using var transaction = (SqlTransaction)await connection.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
            try
            {
                await using var command = connection.CreateCommand();
                command.Transaction = transaction;
                command.CommandTimeout = 20;
                command.CommandText = question.Sql;
                command.Parameters.Add(new SqlParameter("@debut", SqlDbType.DateTime2) { Value = debut });
                command.Parameters.Add(new SqlParameter("@fin", SqlDbType.DateTime2) { Value = fin });
                command.Parameters.Add(new SqlParameter("@chaine", SqlDbType.Int) { Value = (object?)p.Chaine ?? DBNull.Value });
                command.Parameters.Add(new SqlParameter("@equipement", SqlDbType.Int) { Value = (object?)p.Equipement ?? DBNull.Value });
                command.Parameters.Add(new SqlParameter("@technicien", SqlDbType.Int) { Value = (object?)p.Technicien ?? DBNull.Value });
                command.Parameters.Add(new SqlParameter("@article", SqlDbType.Int) { Value = (object?)p.Article ?? DBNull.Value });
                command.Parameters.Add(new SqlParameter("@fournisseur", SqlDbType.Int) { Value = (object?)p.Fournisseur ?? DBNull.Value });
                command.Parameters.Add(new SqlParameter("@annee", SqlDbType.Int) { Value = annee });
                command.Parameters.Add(new SqlParameter("@top", SqlDbType.Int) { Value = top });

                await using var reader = await command.ExecuteReaderAsync(ct);
                var colonnes = new List<ExplorateurColonne>();
                for (var i = 0; i < reader.FieldCount; i++)
                {
                    var name = reader.GetName(i);
                    colonnes.Add(new ExplorateurColonne($"c{i}", name, TypeColonne(name, reader.GetFieldType(i))));
                }

                var lignes = new List<object?[]>();
                var tronque = false;
                while (await reader.ReadAsync(ct))
                {
                    if (lignes.Count >= MaxLignes) { tronque = true; break; }
                    var row = new object?[reader.FieldCount];
                    for (var i = 0; i < reader.FieldCount; i++)
                        row[i] = reader.IsDBNull(i) ? null : reader.GetValue(i);
                    lignes.Add(row);
                }
                await reader.CloseAsync();
                return (new ExplorateurResultat(question.Id, question.Rendu, colonnes, lignes, tronque, watch.ElapsedMilliseconds), null);
            }
            catch (SqlException ex)
            {
                _logger.LogError(ex, "Explorateur query {Id} failed", id);
                return (null, ex.Number == -2
                    ? "La requête a pris trop de temps. Réduisez la période ou ajoutez un filtre."
                    : "La question n'a pas pu être calculée.");
            }
            finally
            {
                // Read-only by construction: whatever happened, nothing is committed
                try { await transaction.RollbackAsync(CancellationToken.None); } catch { /* connection already closed */ }
            }
        }
    }
}
