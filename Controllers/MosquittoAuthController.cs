using System.IdentityModel.Tokens.Jwt;
using System.Text;
using adrc.DTOs;
using adrc.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;


namespace adrc;

public interface IMqttRetainedService
{
    Task<string> GetRetainedMessageAsync(string topic);
    Task<bool> HasRetainedMessageAsync(string topic);
}


[ApiController]
[Route("mqtt")]
public class MosquitoAuthController : ControllerBase
{

    private readonly IConfiguration _configuration;
    private readonly ILogger<MosquitoAuthController> _logger;
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly UserManager<ApplicationUser> _userManager;
    public MosquitoAuthController(SignInManager<ApplicationUser> signInManager,
                         UserManager<ApplicationUser> userManager, ILogger<MosquitoAuthController> logger, IConfiguration configuration)
    {
        _logger = logger;
        _signInManager = signInManager;
        _userManager = userManager;
        _configuration = configuration;
    }

    [HttpPost("auth")]
    public async Task<IActionResult> Authenticate([FromBody] MqttAuthRequest request)
    {
        try
        {
            _logger.LogInformation($"Auth request for user: {request.Username}");


            var response = new MqttAuthResponse
            {
                Ok = false,
                Error = ""
            };

            if (request.Password.Length > 20)
            {
                if (await ValidateJwtTokenAsync(request.Password, request.Username))
                {
                    response.Ok = true;
                    return Ok(response);
                }
            }
            var user = await _userManager.FindByNameAsync(request.Username);

            if (user == null)
            {
                _logger.LogInformation($"User: {request.Username} not found");
                response.Error = "User not found";
                return NotFound(response);
            }

            response.Ok = (await _signInManager.CheckPasswordSignInAsync(user, request.Password, false)).Succeeded;

            if (!response.Ok)
            {
                response.Error = "Invalid password";
                _logger.LogInformation($"Invalid password for user: {request.Username}");
            }

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Authentication error");
            return StatusCode(500, new { result = false });
        }
    }

    private Task<bool> ValidateJwtTokenAsync(string token, string expectedUsername)
    {
        try
        {
            var tokenHandler = new JwtSecurityTokenHandler();

            // »спользуем те же параметры, что и при генерации токенов
            var validationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"])),
                ValidateIssuer = true,
                ValidIssuer = _configuration["Jwt:Issuer"],
                ValidateAudience = true,
                ValidAudience = _configuration["Jwt:Audience"],
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero
            };

            // ¬алидируем токен
            var principal = tokenHandler.ValidateToken(token, validationParameters, out _);

            // ѕровер€ем, что username в токене совпадает с ожидаемым
            var usernameClaim = principal.FindFirst("UserName")?.Value;

            return Task.FromResult(usernameClaim == expectedUsername);
        }
        catch
        {
            return Task.FromResult(false);
        }
    }
}