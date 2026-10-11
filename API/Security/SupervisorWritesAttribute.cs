using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace API.Security;

/// <summary>
/// Reads are open to any signed-in user (forms need the reference lists);
/// creating, updating and deleting is reserved to supervisors.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public sealed class SupervisorWritesAttribute : Attribute, IAuthorizationFilter
{
    public const string SupervisorRole = "Superviseur";

    public void OnAuthorization(AuthorizationFilterContext context)
    {
        var method = context.HttpContext.Request.Method;
        if (HttpMethods.IsGet(method) || HttpMethods.IsHead(method) || HttpMethods.IsOptions(method))
            return;

        var user = context.HttpContext.User;
        if (user.Identity?.IsAuthenticated != true)
        {
            context.Result = new UnauthorizedResult();
            return;
        }

        if (!user.IsInRole(SupervisorRole))
        {
            context.Result = new ObjectResult(new { message = "Action réservée au superviseur." })
            {
                StatusCode = StatusCodes.Status403Forbidden
            };
        }
    }
}
