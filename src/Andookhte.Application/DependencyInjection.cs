using System.Reflection;
using Andookhte.Application.Features.Auth;
using Microsoft.Extensions.DependencyInjection;

namespace Andookhte.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        var assembly = Assembly.GetExecutingAssembly();

        services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(assembly));
        services.AddScoped<IAuthSessionFactory, AuthSessionFactory>();
        services.AddScoped<IOtpService, OtpService>();

        return services;
    }
}
