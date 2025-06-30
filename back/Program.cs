using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

var builder = WebApplication.CreateBuilder(args);

// Завантаження конфігурації
var configuration = builder.Configuration;
var allowedOrigin = configuration.GetSection("CorsSettings:AllowedOrigin").Value;

if (string.IsNullOrEmpty(allowedOrigin))
{
    throw new InvalidOperationException("AllowedOrigin is not configured in appsettings.json");
}

// Додавання сервісів до контейнера.
builder.Services.AddControllers();
builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendPolicy", policy =>
        policy.WithOrigins(allowedOrigin)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials()
    );
});

var app = builder.Build();

app.UseRouting();

app.UseCors("FrontendPolicy");

app.UseAuthorization();

app.MapControllers();

app.Run();

