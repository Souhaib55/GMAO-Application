namespace API.Security;

/// <summary>
/// Checks for every uploaded file (attachments of machines, work orders, purchase orders,
/// and the photo of a breakdown request):
///  - the extension is in the list of the screen;
///  - the content really is of that type (first bytes, "magic number"): a renamed
///    .exe or .html is refused even if called "photo.jpg";
///  - the content type stored and sent back comes from the extension, never from the
///    browser (a forged "text/html" could otherwise be served to other users);
///  - the name is reduced to a plain file name, without path or control characters.
/// Files are stored in the database (never on disk), so no storage path can be abused.
/// </summary>
public static class FichierSecurise
{
    public const long TailleMax = 10 * 1024 * 1024;

    private static readonly Dictionary<string, string> Types = new(StringComparer.OrdinalIgnoreCase)
    {
        [".pdf"] = "application/pdf",
        [".doc"] = "application/msword",
        [".docx"] = "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        [".xls"] = "application/vnd.ms-excel",
        [".xlsx"] = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        [".txt"] = "text/plain; charset=utf-8",
        [".csv"] = "text/csv; charset=utf-8",
        [".jpg"] = "image/jpeg", [".jpeg"] = "image/jpeg", [".jfif"] = "image/jpeg",
        [".png"] = "image/png",
        [".gif"] = "image/gif",
        [".bmp"] = "image/bmp",
        [".webp"] = "image/webp",
        [".heic"] = "image/heic", [".heif"] = "image/heif", [".avif"] = "image/avif",
        [".tif"] = "image/tiff", [".tiff"] = "image/tiff",
        [".zip"] = "application/zip",
        [".rar"] = "application/vnd.rar",
        [".7z"] = "application/x-7z-compressed",
        [".dwg"] = "image/vnd.dwg"
    };

    /// <summary>Content type to store and send back, from the extension only.</summary>
    public static string TypeContenu(string nomFichier) =>
        Types.TryGetValue(Path.GetExtension(nomFichier), out var t) ? t : "application/octet-stream";

    /// <summary>A plain, short file name: no folder, no control or reserved characters.</summary>
    public static string NomSur(string? nomFichier)
    {
        var nom = Path.GetFileName((nomFichier ?? "").Replace('\\', '/'));
        var propre = new string(nom.Where(c => !char.IsControl(c) && c is not ('/' or '\\' or ':' or '*' or '?' or '"' or '<' or '>' or '|')).ToArray()).Trim().Trim('.');
        if (string.IsNullOrWhiteSpace(propre)) propre = "fichier" + Path.GetExtension(nom).ToLowerInvariant();
        return propre.Length > 200 ? propre[..100] + propre[^100..] : propre;
    }

    /// <summary>Null when the file is acceptable, otherwise the message for the user.</summary>
    public static string? Verifier(string nomFichier, long taille, ReadOnlySpan<byte> debut, IEnumerable<string> extensionsAutorisees)
    {
        if (taille <= 0) return "Le fichier est vide.";
        if (taille > TailleMax) return "Le fichier dépasse 10 Mo.";
        var ext = Path.GetExtension(nomFichier).ToLowerInvariant();
        if (!extensionsAutorisees.Contains(ext)) return $"Type de fichier non autorisé. Types acceptés : {string.Join(", ", extensionsAutorisees)}.";
        if (!SignatureValide(ext, debut)) return $"Le contenu du fichier ne correspond pas à un fichier {ext}. Enregistrez-le à nouveau dans le bon format.";
        return null;
    }

    private static bool Commence(ReadOnlySpan<byte> d, params byte[] sig) => d.Length >= sig.Length && d[..sig.Length].SequenceEqual(sig);
    private static bool CommenceA(ReadOnlySpan<byte> d, int offset, params byte[] sig) => d.Length >= offset + sig.Length && d.Slice(offset, sig.Length).SequenceEqual(sig);

    /// <summary>First bytes of each accepted type. Plain text must not look like a program or a web page.</summary>
    public static bool SignatureValide(string ext, ReadOnlySpan<byte> d)
    {
        var zip = Commence(d, 0x50, 0x4B, 0x03, 0x04) || Commence(d, 0x50, 0x4B, 0x05, 0x06);
        var ole = Commence(d, 0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1);   // old Office formats
        var isoBmff = CommenceA(d, 4, (byte)'f', (byte)'t', (byte)'y', (byte)'p'); // HEIC, HEIF, AVIF
        return ext switch
        {
            ".pdf" => Commence(d, (byte)'%', (byte)'P', (byte)'D', (byte)'F'),
            ".jpg" or ".jpeg" or ".jfif" => Commence(d, 0xFF, 0xD8, 0xFF),
            ".png" => Commence(d, 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A),
            ".gif" => Commence(d, (byte)'G', (byte)'I', (byte)'F', (byte)'8'),
            ".bmp" => Commence(d, (byte)'B', (byte)'M'),
            ".webp" => Commence(d, (byte)'R', (byte)'I', (byte)'F', (byte)'F') && CommenceA(d, 8, (byte)'W', (byte)'E', (byte)'B', (byte)'P'),
            ".heic" or ".heif" or ".avif" => isoBmff,
            ".tif" or ".tiff" => Commence(d, 0x49, 0x49, 0x2A, 0x00) || Commence(d, 0x4D, 0x4D, 0x00, 0x2A),
            ".docx" or ".xlsx" or ".zip" => zip,
            ".doc" or ".xls" => ole,
            ".rar" => Commence(d, (byte)'R', (byte)'a', (byte)'r', (byte)'!', 0x1A, 0x07),
            ".7z" => Commence(d, (byte)'7', (byte)'z', 0xBC, 0xAF, 0x27, 0x1C),
            ".dwg" => Commence(d, (byte)'A', (byte)'C', (byte)'1', (byte)'0'),
            ".txt" or ".csv" => TexteSimple(d),
            _ => false
        };
    }

    /// <summary>Text without NUL bytes that does not start like an executable or a web page.</summary>
    private static bool TexteSimple(ReadOnlySpan<byte> d)
    {
        if (d.IndexOf((byte)0) >= 0) return false;
        if (Commence(d, (byte)'M', (byte)'Z')) return false;
        var debut = System.Text.Encoding.UTF8.GetString(d[..Math.Min(d.Length, 256)]).TrimStart('﻿', ' ', '\t', '\r', '\n').ToLowerInvariant();
        return !(debut.StartsWith("<!doctype") || debut.StartsWith("<html") || debut.StartsWith("<script") || debut.StartsWith("<svg") || debut.StartsWith("<?xml"));
    }
}
