using System.Threading.RateLimiting;
using API.Services;
using Core.Entities;
using Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Server secrets (connection string, SMTP...) live in appsettings.Local.json, never in Git.
// Environment variables and the command line are re-added after it so they keep precedence.
builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: true);
builder.Configuration.AddEnvironmentVariables();
builder.Configuration.AddCommandLine(args);

// Configure file upload size limits (10MB max)
builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 10 * 1024 * 1024; // 10 MB
});

builder.WebHost.ConfigureKestrel(serverOptions =>
{
    serverOptions.Limits.MaxRequestBodySize = 10 * 1024 * 1024; // 10 MB
});

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    });

builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();
builder.Services.AddScoped<IJournalService, JournalService>();
builder.Services.AddScoped<IStockService, StockService>();
builder.Services.AddScoped<IPreventifService, PreventifService>();
builder.Services.AddScoped<IInterventionEffectsService, InterventionEffectsService>();
builder.Services.AddScoped<IExplorateurService, ExplorateurService>();
builder.Services.AddHostedService<PreventifHostedService>();
builder.Services.AddScoped<DemoDataSeeder>();

// CORS: only needed when the Angular app is served from another origin (ng serve).
// In production nginx serves the app and proxies /api, so requests are same-origin.
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
                     ?? new[] { "http://localhost:4200", "https://localhost:4200" };
builder.Services.AddCors(options =>
{
    options.AddPolicy("AngularCorsPolicy", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

builder.Services.AddDbContext<StoreContext>(opt =>
{
    // "Database:CompatibilityLevel" = 120 on a SQL Server 2014 host: EF Core then writes
    // queries without the 2016+ functions (OPENJSON for lists...). Unset = latest syntax.
    var compatibilityLevel = builder.Configuration.GetValue<int?>("Database:CompatibilityLevel");
    opt.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"), sql =>
    {
        if (compatibilityLevel.HasValue) sql.UseCompatibilityLevel(compatibilityLevel.Value);
    });
});

builder.Services.AddIdentity<AppUser, IdentityRole>(options =>
{
    options.SignIn.RequireConfirmedAccount = false;
    options.User.RequireUniqueEmail = true;

    options.Password.RequireDigit = true;
    options.Password.RequireLowercase = true;
    options.Password.RequireUppercase = true;
    options.Password.RequireNonAlphanumeric = false;
    // 10 characters (was 8): applies to new and changed passwords, existing ones keep working
    options.Password.RequiredLength = 10;

    // Brute-force protection on the login form
    options.Lockout.AllowedForNewUsers = true;
    options.Lockout.MaxFailedAccessAttempts = 5;
    options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
})
.AddEntityFrameworkStores<StoreContext>()
.AddDefaultTokenProviders()
.AddPasswordValidator<API.Security.MotDePasseValidator>()
.AddErrorDescriber<API.Security.ErreursIdentiteFr>();

// Password reset links expire after 2 hours (default: 1 day)
builder.Services.Configure<DataProtectionTokenProviderOptions>(o => o.TokenLifespan = TimeSpan.FromHours(2));

// Role changes and deactivations reach open sessions within a few minutes
builder.Services.Configure<SecurityStampValidatorOptions>(options =>
{
    options.ValidationInterval = TimeSpan.FromMinutes(5);
});

// Every endpoint requires a signed-in user unless it is explicitly [AllowAnonymous]
builder.Services.AddAuthorization(options =>
{
    options.FallbackPolicy = new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build();
});

builder.Services.ConfigureApplicationCookie(options =>
{
    // The factory network serves the app over plain HTTP on the same origin as the
    // API (nginx proxy). A cookie marked "Secure" would be dropped by browsers there,
    // so it is only marked Secure when the request itself is HTTPS.
    options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
    options.Cookie.SameSite = SameSiteMode.Lax;
    options.Cookie.HttpOnly = true;
    options.Cookie.Name = "gmao.session";
    options.ExpireTimeSpan = TimeSpan.FromHours(12); // one shift, renewed while active
    options.SlidingExpiration = true;

    // An API answers with status codes, never with redirects to login pages
    options.Events.OnRedirectToLogin = context =>
    {
        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
        return Task.CompletedTask;
    };
    options.Events.OnRedirectToAccessDenied = context =>
    {
        context.Response.StatusCode = StatusCodes.Status403Forbidden;
        return Task.CompletedTask;
    };
});

// Rate limiting on the anonymous authentication endpoints (per client IP)
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("auth", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));
});

// Behind a reverse proxy (nginx in Docker, IIS out-of-process): the client IP and scheme are
// read from X-Forwarded-* only when the request comes from a trusted proxy. Loopback is trusted
// by default; other proxies are listed in "ReverseProxy:KnownNetworks" (e.g. "172.16.0.0/12").
// Trusting every sender would let anyone fake their IP and bypass the login rate limit.
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    foreach (var cidr in builder.Configuration.GetSection("ReverseProxy:KnownNetworks").Get<string[]>() ?? Array.Empty<string>())
    {
        var parts = cidr.Split('/');
        if (parts.Length == 2 && System.Net.IPAddress.TryParse(parts[0], out var prefix) && int.TryParse(parts[1], out var length))
            options.KnownNetworks.Add(new Microsoft.AspNetCore.HttpOverrides.IPNetwork(prefix, length));
    }
});

var app = builder.Build();

// Apply migrations and seed roles on startup
using (var scope = app.Services.CreateScope())
{
    try
    {
        var context = scope.ServiceProvider.GetRequiredService<StoreContext>();
        await context.Database.MigrateAsync();

        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
        foreach (var role in new[] { "Superviseur", "Demandeur", "Utilisateur" })
        {
            if (!await roleManager.RoleExistsAsync(role))
            {
                await roleManager.CreateAsync(new IdentityRole(role));
            }
        }

        // Demo data, opt-in only: "--seed-demo" on the command line or DemoData:Seed=true
        if (args.Contains("--seed-demo") || app.Configuration.GetValue<bool>("DemoData:Seed"))
        {
            var seeder = scope.ServiceProvider.GetRequiredService<DemoDataSeeder>();
            var summary = await seeder.SeedAsync();
            scope.ServiceProvider.GetRequiredService<ILogger<Program>>().LogInformation("{Summary}", summary);
        }
    }
    catch (Exception ex)
    {
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "An error occurred during database migration or seeding");
        throw;
    }
}

app.UseForwardedHeaders();

if (!app.Environment.IsDevelopment())
{
    // Never leak stack traces or exception messages to the client
    app.UseExceptionHandler(errorApp => errorApp.Run(async context =>
    {
        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        await context.Response.WriteAsJsonAsync(new { message = "Une erreur interne est survenue." });
    }));
}

// Security headers on every response. The CSP fits the Angular build (no inline script;
// inline styles are needed by Angular components) and the Power BI page (iframe to *.powerbi.com).
// Nothing else is loaded from outside: fonts, icons and scripts are all served by the app.
const string Csp =
    "default-src 'self'; " +
    "script-src 'self'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: blob:; " +
    "font-src 'self' data:; " +
    "connect-src 'self' https://app.powerbi.com; " +
    "frame-src https://app.powerbi.com https://*.powerbi.com https://app.powerbigov.us https://*.powerbi.cn; " +
    "object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";
app.Use(async (context, next) =>
{
    var headers = context.Response.Headers;
    headers["X-Content-Type-Options"] = "nosniff";
    headers["X-Frame-Options"] = "DENY";
    headers["Referrer-Policy"] = "same-origin";
    headers["Content-Security-Policy"] = Csp;
    headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=(), usb=()";
    headers["Cross-Origin-Opener-Policy"] = "same-origin";
    // API answers are personal data: never kept by a shared browser or a proxy cache
    if (context.Request.Path.StartsWithSegments("/api"))
        headers["Cache-Control"] = "no-store";
    await next();
});

// The Angular client is served by the API itself (wwwroot), before authentication:
// the application files are public, the data behind /api is not.
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseCors("AngularCorsPolicy");
app.UseRateLimiter();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Angular routes (/dashboard, /interventions/...) are resolved by the client: any URL that is
// neither a file nor an API call returns index.html. Anonymous, or the sign-in page itself would be refused.
app.MapFallbackToFile("{*path:nonfile:regex(^(?!api/).*$)}", "index.html").AllowAnonymous();

app.Run();
