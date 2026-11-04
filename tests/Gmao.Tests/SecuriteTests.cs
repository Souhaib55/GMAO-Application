using API.Security;
using Core.Entities;
using Xunit;

namespace Gmao.Tests;

/// <summary>Upload checks and password rules (SECURITE-V3.md).</summary>
public class SecuriteTests
{
    private static readonly string[] Extensions = { ".pdf", ".jpg", ".jpeg", ".png", ".txt", ".csv", ".docx", ".xlsx", ".heic", ".webp" };
    private static readonly byte[] Jpeg = { 0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46 };
    private static readonly byte[] Png = { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00 };
    private static readonly byte[] Pdf = "%PDF-1.7\n"u8.ToArray();
    private static readonly byte[] Html = "<!DOCTYPE html><script>alert(1)</script>"u8.ToArray();
    private static readonly byte[] Exe = { (byte)'M', (byte)'Z', 0x90, 0x00 };

    [Fact]
    public void Vraie_photo_acceptee()
    {
        Assert.Null(FichierSecurise.Verifier("panne.jpg", 2048, Jpeg, Extensions));
        Assert.Null(FichierSecurise.Verifier("panne.PNG", 2048, Png, Extensions));
        Assert.Null(FichierSecurise.Verifier("devis.pdf", 2048, Pdf, Extensions));
    }

    [Fact]
    public void Page_web_deguisee_en_photo_refusee()
    {
        Assert.NotNull(FichierSecurise.Verifier("photo.jpg", Html.Length, Html, Extensions));
    }

    [Fact]
    public void Programme_deguise_en_pdf_ou_texte_refuse()
    {
        Assert.NotNull(FichierSecurise.Verifier("rapport.pdf", 4096, Exe, Extensions));
        Assert.NotNull(FichierSecurise.Verifier("notes.txt", 4096, Exe, Extensions));
        Assert.NotNull(FichierSecurise.Verifier("notes.txt", Html.Length, Html, Extensions));
    }

    [Fact]
    public void Extension_non_autorisee_ou_taille_excessive_refusees()
    {
        Assert.NotNull(FichierSecurise.Verifier("script.html", 100, Html, Extensions));
        Assert.NotNull(FichierSecurise.Verifier("svg.svg", 100, "<svg/>"u8.ToArray(), Extensions));
        Assert.Equal("Le fichier dépasse 10 Mo.", FichierSecurise.Verifier("grosse.jpg", FichierSecurise.TailleMax + 1, Jpeg, Extensions));
        Assert.Equal("Le fichier est vide.", FichierSecurise.Verifier("vide.jpg", 0, Array.Empty<byte>(), Extensions));
    }

    [Fact]
    public void Texte_et_csv_simples_acceptes()
    {
        Assert.Null(FichierSecurise.Verifier("releve.csv", 30, "\uFEFFCode;Quantité\nAIG-01;4\n"u8.ToArray(), Extensions));
        Assert.Null(FichierSecurise.Verifier("notes.txt", 20, "Bruit au démarrage"u8.ToArray(), Extensions));
    }

    [Fact]
    public void Photo_de_telephone_heic_acceptee()
    {
        var heic = new byte[] { 0x00, 0x00, 0x00, 0x18, (byte)'f', (byte)'t', (byte)'y', (byte)'p', (byte)'h', (byte)'e', (byte)'i', (byte)'c' };
        Assert.Null(FichierSecurise.Verifier("IMG_0001.HEIC", 4096, heic, Extensions));
    }

    [Fact]
    public void Type_de_contenu_decide_par_le_serveur()
    {
        Assert.Equal("image/jpeg", FichierSecurise.TypeContenu("photo.JPG"));
        Assert.Equal("application/pdf", FichierSecurise.TypeContenu("a.pdf"));
        Assert.Equal("application/octet-stream", FichierSecurise.TypeContenu("page.html"));
    }

    [Fact]
    public void Nom_de_fichier_nettoye()
    {
        Assert.Equal("photo.jpg", FichierSecurise.NomSur(@"C:\Users\x\photo.jpg"));
        Assert.Equal("passwd", FichierSecurise.NomSur("../../etc/passwd"));
        Assert.Equal("ab.jpg", FichierSecurise.NomSur("a\u0000b.jpg"));
        Assert.Equal("fichier", FichierSecurise.NomSur("..."));
        Assert.True(FichierSecurise.NomSur(new string('a', 400) + ".pdf").Length <= 200);
    }

    // ------------------------------------------------------------------ passwords

    private static readonly AppUser Mohamed = new() { FirstName = "Mohamed", LastName = "Bensalah", Email = "m.bensalah@simotex.demo", UserName = "m.bensalah@simotex.demo" };

    private static bool Accepte(string motDePasse) =>
        new MotDePasseValidator().ValidateAsync(null!, Mohamed, motDePasse).Result.Succeeded;

    [Fact]
    public void Mot_de_passe_avec_son_nom_refuse()
    {
        Assert.False(Accepte("Mohamed2026X"));
        Assert.False(Accepte("Bensalah!99a"));
        Assert.False(Accepte("M.bensalah2026"));
    }

    [Fact]
    public void Mot_de_passe_courant_refuse()
    {
        Assert.False(Accepte("Azerty12345"));
        Assert.False(Accepte("Password2026"));
        Assert.False(Accepte("Maintenance1"));
    }

    [Fact]
    public void Mot_de_passe_correct_accepte()
    {
        Assert.True(Accepte("Couture!Rang3"));
        // The demo password must stay valid for the demo seed
        Assert.True(Accepte(API.Services.DemoDataSeeder.MotDePasseDemo));
    }
}
