var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
// builder.Services.AddOpenApi();

var app = builder.Build();    // After this it consider middleware , abover are services

// Configure the HTTP request pipeline.

// app.UseAuthorization();   // for authorization

app.MapControllers();

app.Run();
