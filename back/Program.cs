
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

var builder = WebApplication.CreateBuilder(args);

var allowedOrigin = "http://127.0.0.1:5500";

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

