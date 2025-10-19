using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Identity;
using adrc.Models;
using adrc.Services;
using adrc.DTOs;
using Microsoft.AspNetCore.Authorization;


namespace adrc.Controllers
{
    [ApiController]
    [Route("[controller]")]
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
                UserName = model.UserName,
                Email = model.Email,
                UseFarenheit = model.UseFarenheit,
                Use12HoutFormat = model.Use12HourFormat,
                TimeZone = model.TimeZone,
                Language = model.Language,
            }; 

            var result = await _userManager.CreateAsync(user, model.Password);

            if (result.Succeeded)
            {
                // Можно добавить роль по умолчанию
                //await _userManager.AddToRoleAsync(user, "User");

                var token = await _jwtService.GenerateToken(user);

                return Ok(new AuthResponse
                {
                    Token = token,
                    Expiration = DateTime.Now.AddHours(Convert.ToDouble("2")),
                    User = new UserProfile
                    {
                        UserName = user.UserName,
                        Email = user.Email,
                        UseFarenheit = user.UseFarenheit,
                        Use12HourFormat = user.Use12HoutFormat,
                        TimeZone = user.TimeZone,
                        Language= user.Language
                    }
                });
            }

            return BadRequest(result.Errors);
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login(LoginModel model)
        {
            var user = await _userManager.FindByNameAsync(model.Login);
            if (user == null)
                user = await _userManager.FindByEmailAsync(model.Login); //Tring to enter by email
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
                        UserName = user.UserName,
                        Email = user.Email,
                        UseFarenheit = user.UseFarenheit,
                        Use12HourFormat = user.Use12HoutFormat,
                        TimeZone = user.TimeZone,
                        Language = user.Language
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
                UserName = user.UserName,
                Email = user.Email,
                UseFarenheit = user.UseFarenheit,
                Use12HourFormat = user.Use12HoutFormat,
                TimeZone = user.TimeZone,
                Language= user.Language
            });
        }

        [Authorize]
        [HttpPut("profile")]
        public async Task<IActionResult> UpdateProfile(UserProfileUpdate model)
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null)
                return NotFound();

            user.UseFarenheit = model.UseFarenheit;
            user.Use12HoutFormat = model.Use12HourFormat;
            user.TimeZone = model.TimeZone;
            user.Language = model.Language;

            var result = await _userManager.UpdateAsync(user);

            if (result.Succeeded)
                return Ok(model);

            return BadRequest(result.Errors);
        }
    }
}