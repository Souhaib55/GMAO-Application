using Core.Entities;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();
builder.Services.AddDbContext<StoreContext>(opt =>
{
    opt.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"));
});

builder.Services.AddAuthorization();  // for authorization
builder.Services.AddIdentityApiEndpoints<AppUser>()
    .AddEntityFrameworkStores<StoreContext>();  // for authorization    



var app = builder.Build();    // After this it consider middleware , abover are services


// Configure the HTTP request pipeline.

// app.UseAuthorization();   // for authorization

app.UseCors(x => x.AllowAnyHeader().AllowAnyMethod().AllowCredentials() // to use cookies in client side 
    .WithOrigins("http://localhost:4200" , "https://localhost:4200")); /// link between angular and .Net core


app.MapControllers();
app.MapGroup("api").MapIdentityApi<AppUser>();  // api/login to test login endpoint

app.Run();
