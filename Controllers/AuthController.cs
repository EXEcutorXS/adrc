using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Identity;
using adrc.Models;
using adrc.Services;
using adrc.DTOs;
using Microsoft.AspNetCore.Authorization;


namespace adrc.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly JwtService _jwtService;

        public AuthController(
            UserManager<ApplicationUser> userManager,
            SignInManager<ApplicationUser> signInManager,
            JwtService jwtService)
        {
            _userManager = userManager;
            _signInManager = signInManager;
            _jwtService = jwtService;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register(RegisterModel model)
        {
            var user = new ApplicationUser
            {
                UserName = model.Email,
                Email = model.Email,
                TemperatureFormat = model.TemperatureFormat,
                TimeFormat = model.TimeFormat,
                TimeZone = model.TimeZone
            }; 

            var result = await _userManager.CreateAsync(user, model.Password);

            if (result.Succeeded)
            {
                // Можно добавить роль по умолчанию
                await _userManager.AddToRoleAsync(user, "User");

                var token = await _jwtService.GenerateToken(user);

                return Ok(new AuthResponse
                {
                    Token = token,
                    Expiration = DateTime.Now.AddHours(Convert.ToDouble("2")),
                    User = new UserProfile
                    {
                        Email = user.Email,
                        TemperatureFormat = user.TemperatureFormat,
                        TimeFormat = user.TimeFormat,
                        TimeZone = user.TimeZone
                    }
                });
            }

            return BadRequest(result.Errors);
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login(LoginModel model)
        {
            var user = await _userManager.FindByEmailAsync(model.Email);
            if (user == null)
                return Unauthorized("Invalid credentials");

            var result = await _signInManager.CheckPasswordSignInAsync(user, model.Password, false);

            if (result.Succeeded)
            {
                var token = await _jwtService.GenerateToken(user);

                return Ok(new AuthResponse
                {
                    Token = token,
                    Expiration = DateTime.Now.AddHours(2),
                    User = new UserProfile
                    {
                        Email = user.Email,
                        TemperatureFormat = user.TemperatureFormat,
                        TimeFormat = user.TimeFormat,
                        TimeZone = user.TimeZone
                    }
                });
            }

            return Unauthorized("Invalid credentials");
        }

        [Authorize]
        [HttpGet("profile")]
        public async Task<IActionResult> GetProfile()
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null)
                return NotFound();

            return Ok(new UserProfile
            {
                Email = user.Email,
                TemperatureFormat = user.TemperatureFormat,
                TimeFormat = user.TimeFormat,
                TimeZone = user.TimeZone
            });
        }

        [Authorize]
        [HttpPut("profile")]
        public async Task<IActionResult> UpdateProfile(UserProfileUpdate model)
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null)
                return NotFound();

            user.TemperatureFormat = model.TemperatureFormat;
            user.TimeFormat = model.TimeFormat;
            user.TimeZone = model.TimeZone;

            var result = await _userManager.UpdateAsync(user);

            if (result.Succeeded)
                return Ok(model);

            return BadRequest(result.Errors);
        }
    }
}