using System;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")] 

public class BuggyController : ControllerBase
{

    public object ClaimsTypes { get; private set; }


    [HttpGet("unauthorized")]
    public IActionResult GetUnauthorized()
    {
        return Unauthorized();
    }

    [HttpGet("badrequest")]
    public IActionResult GetBadRequest()
    {
        return BadRequest("Not a good request");
    }


    [HttpGet("notfound")]
    public IActionResult GetNotFound()
    {
        return NotFound();
    }


    [HttpGet("internalerror")]
    public IActionResult GetInternalError()
    {
        throw new Exception("This is a test exception");
    }



    [Authorize]   // endpoint requires authentication
    [HttpGet("secret")]
    public IActionResult GetSecret()
    {
        var name = User.FindFirst(ClaimTypes.Name)?.Value;
        var id = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        return Ok("Hello " + name + " with id of " + id);
        
    }




}
